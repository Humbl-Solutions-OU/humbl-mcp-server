// End-to-end tests for the remote (Streamable HTTP) server. A fake Django on an
// ephemeral port stands in for humbl.ai; a real MCP client talks to our server
// over HTTP, so the whole path (auth header -> X-Api-Key, module routing, tool
// discovery, tool call, error mapping) is exercised with no mocks in between.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { startHttpServer } from "./http.js";

const KEY = "k1";
let django: http.Server;
let mcp: http.Server;
let mcpUrl: string;
const djangoCalls: { method: string; url: string; key: string | undefined; body: string }[] = [];

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

before(async () => {
  django = http.createServer(async (req, res) => {
    const body = await readBody(req);
    const key = req.headers["x-api-key"] as string | undefined;
    djangoCalls.push({ method: req.method!, url: req.url!, key, body });
    const json = (status: number, data: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };
    if (key !== KEY) return json(401, { detail: "Invalid or inactive MCP API key." });
    const url = req.url!;
    if (url === "/api/mcp/rankings/tools/" || url === "/api/mcp/games/tools/") return json(200, { tools: [] });
    if (url === "/api/mcp/toplists/tools/") {
      return json(200, {
        tools: [
          { name: "echo", description: "Echo", inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } },
          { name: "boom", description: "Fails", inputSchema: { type: "object", properties: {} } },
        ],
      });
    }
    if (url === "/api/mcp/toplists/tools/echo/") return json(200, { result: `echo:${JSON.parse(body).text}` });
    if (url === "/api/mcp/toplists/tools/boom/") return json(500, { detail: "kaboom" });
    if (url.startsWith("/api/mcp/advert/market-share/")) return json(200, [{ domain: "x.com", percentage: 1 }]);
    return json(404, { detail: "nope" });
  });
  await new Promise<void>((r) => django.listen(0, "127.0.0.1", r));
  const djangoPort = (django.address() as { port: number }).port;

  mcp = await startHttpServer({ apiUrl: `http://127.0.0.1:${djangoPort}`, port: 0, host: "127.0.0.1" });
  mcpUrl = `http://127.0.0.1:${(mcp.address() as { port: number }).port}`;
});

after(() => {
  mcp.closeAllConnections();
  mcp.close();
  django.closeAllConnections();
  django.close();
});

async function connect(path: string, key: string | undefined = KEY) {
  const client = new Client({ name: "test", version: "0" });
  const headers: Record<string, string> = key ? { Authorization: `Bearer ${key}` } : {};
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl + path), { requestInit: { headers } });
  await client.connect(transport);
  return client;
}

test("module endpoint lists the tools Django reports", async () => {
  const client = await connect("/toplists");
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["boom", "echo"]);
  assert.equal(tools.find((t) => t.name === "echo")!.inputSchema.required![0], "text");
  await client.close();
});

test("tool call forwards the bearer key as X-Api-Key and returns the result text", async () => {
  const client = await connect("/toplists");
  const result = await client.callTool({ name: "echo", arguments: { text: "hi" } });
  assert.deepEqual(result.content, [{ type: "text", text: "echo:hi" }]);
  const call = djangoCalls.find((c) => c.url === "/api/mcp/toplists/tools/echo/")!;
  assert.equal(call.key, KEY);
  assert.equal(call.body, JSON.stringify({ text: "hi" }));
  await client.close();
});

test("Django failure comes back as an MCP tool error, not a transport error", async () => {
  const client = await connect("/toplists");
  const result = await client.callTool({ name: "boom", arguments: {} });
  assert.equal(result.isError, true);
  assert.match((result.content as { text: string }[])[0].text, /500/);
  await client.close();
});

test("advert keeps its static tool set and GET-style proxying", async () => {
  const client = await connect("/advert");
  const { tools } = await client.listTools();
  assert.equal(tools.length, 7);
  const result = await client.callTool({ name: "market_share", arguments: { location_id: 1 } });
  assert.match((result.content as { text: string }[])[0].text, /x\.com/);
  const call = djangoCalls.find((c) => c.url.startsWith("/api/mcp/advert/market-share/"))!;
  assert.equal(call.url, "/api/mcp/advert/market-share/?location_id=1");
  await client.close();
});

test("/all merges every module", async () => {
  const client = await connect("/all");
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name);
  assert.ok(names.includes("market_share") && names.includes("echo"));
  await client.close();
});

// The SDK client hides HTTP status codes behind its auth flow, so the rejection
// cases are asserted on the raw HTTP response instead.
const INITIALIZE = JSON.stringify({
  jsonrpc: "2.0", id: 1, method: "initialize",
  params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "0" } },
});

function rawPost(path: string, key?: string) {
  return fetch(mcpUrl + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: INITIALIZE,
  });
}

test("missing bearer token is rejected with 401 before touching Django", async () => {
  const before = djangoCalls.length;
  const res = await rawPost("/toplists");
  assert.equal(res.status, 401);
  assert.match(res.headers.get("www-authenticate") ?? "", /Bearer/);
  assert.equal(djangoCalls.length, before);
});

test("invalid key surfaces Django's 401", async () => {
  const res = await rawPost("/toplists", "wrong");
  assert.equal(res.status, 401);
});

test("unknown module is 404", async () => {
  const res = await rawPost("/nope", KEY);
  assert.equal(res.status, 404);
});

test("health endpoint needs no auth", async () => {
  const res = await fetch(mcpUrl + "/healthz");
  assert.equal(res.status, 200);
});
