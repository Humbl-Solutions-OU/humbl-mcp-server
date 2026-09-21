// Builds an MCP Server over a ToolSet. Shared by the stdio entry (index.ts,
// one long-lived server) and the remote entry (http.ts, one per request in
// stateless mode). Tool failures are reported as isError results so the model
// sees the message and can adjust, instead of the transport dropping the call.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { ToolSet } from "./modules.js";

export const SERVER_INFO = { name: "humbl", version: "2.0.0" };

export function createServer(toolSet: ToolSet, name = SERVER_INFO.name): Server {
  const server = new Server({ name, version: SERVER_INFO.version }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolSet.tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const text = await toolSet.call(request.params.name, (request.params.arguments ?? {}) as Record<string, unknown>);
      return { content: [{ type: "text", text }] };
    } catch (error: unknown) {
      return { content: [{ type: "text", text: String(error instanceof Error ? error.message : error) }], isError: true };
    }
  });

  return server;
}
