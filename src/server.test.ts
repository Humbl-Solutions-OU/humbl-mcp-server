// Tests for createServer's assistant name, the value sent to humbl.ai as the
// X-MCP-Client header for telemetry. Remote callers get it from the HTTP
// User-Agent (see http.test.ts); stdio callers have no HTTP request, so it
// comes from the clientInfo name the MCP client sent in its handshake.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./server.js";
import type { ToolSet } from "./modules.js";

function recordingToolSet(seen: (string | undefined)[]): ToolSet {
  return {
    tools: [{ name: "echo", description: "Echo", inputSchema: { type: "object", properties: {} } }],
    async call(_name, _args, assistant) {
      seen.push(assistant);
      return "ok";
    },
  };
}

async function callEcho(server: ReturnType<typeof createServer>, clientName: string) {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: clientName, version: "1.0" });
  await client.connect(clientSide);
  await client.callTool({ name: "echo", arguments: {} });
  await client.close();
}

test("stdio: the assistant is the MCP client's handshake name", async () => {
  const seen: (string | undefined)[] = [];
  await callEcho(createServer(recordingToolSet(seen)), "cursor-vscode");
  assert.deepEqual(seen, ["cursor-vscode"]);
});

test("an explicit assistant (remote User-Agent) wins over the handshake name", async () => {
  const seen: (string | undefined)[] = [];
  await callEcho(createServer(recordingToolSet(seen), undefined, { assistant: "claude-code" }), "test");
  assert.deepEqual(seen, ["claude-code"]);
});
