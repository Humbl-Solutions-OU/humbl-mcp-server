// Remote MCP server: Streamable HTTP, one URL per module.
//
//   POST https://mcp.humbl.ai/advert      Authorization: Bearer <humbl api key>
//   POST https://mcp.humbl.ai/toplists
//   POST https://mcp.humbl.ai/rankings
//   POST https://mcp.humbl.ai/games
//   POST https://mcp.humbl.ai/all         every module in one server
//   GET  https://mcp.humbl.ai/healthz     no auth, for the load balancer
//
// This process holds no secrets and no state: the caller's bearer token is the
// humbl.ai API key, forwarded to Django as X-Api-Key on every upstream call.
// Stateless mode (no MCP session id) means a fresh Server + transport per HTTP
// request, which is what lets any number of clients share one small box and
// what makes the process safe to restart at any time.
//
// Related: http-main.ts (the CLI wrapper), server.ts, modules.ts.

import http from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { MODULES, UpstreamError, buildToolSet, type Module } from "./modules.js";
import { createServer } from "./server.js";

export interface HttpOptions {
  apiUrl: string;
  port: number;
  host?: string;
}

function bearer(req: http.IncomingMessage): string | undefined {
  const value = req.headers.authorization;
  if (!value) return undefined;
  const [scheme, token] = value.split(" ", 2);
  return scheme?.toLowerCase() === "bearer" && token ? token.trim() : undefined;
}

function modulesFor(path: string): readonly Module[] | undefined {
  const name = path.replace(/^\/+|\/+$/g, "");
  if (name === "all") return MODULES;
  return (MODULES as readonly string[]).includes(name) ? [name as Module] : undefined;
}

function reject(res: http.ServerResponse, status: number, message: string) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }));
}

export function startHttpServer(options: HttpOptions): Promise<http.Server> {
  const httpServer = http.createServer(async (req, res) => {
    const path = new URL(req.url ?? "/", "http://x").pathname;
    if (path === "/healthz") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end("ok");
    }

    const modules = modulesFor(path);
    if (!modules) return reject(res, 404, `Unknown module. Use one of: ${MODULES.join(", ")}, all`);

    const apiKey = bearer(req);
    if (!apiKey) {
      res.setHeader("WWW-Authenticate", 'Bearer realm="humbl.ai"');
      return reject(res, 401, "Missing bearer token; use your humbl.ai API key.");
    }

    try {
      const toolSet = await buildToolSet(options.apiUrl, modules, apiKey);
      const server = createServer(toolSet, modules.length === 1 ? `humbl-${modules[0]}` : "humbl");
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error: unknown) {
      if (error instanceof UpstreamError) return reject(res, error.status === 401 ? 401 : 502, error.message);
      console.error("Unhandled error", error);
      if (!res.headersSent) reject(res, 500, "Internal error");
    }
  });

  return new Promise((resolve) => {
    httpServer.listen(options.port, options.host ?? "0.0.0.0", () => resolve(httpServer));
  });
}
