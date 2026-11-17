// Builds an MCP Server over a ToolSet. Shared by the stdio entry (index.ts,
// one long-lived server) and the remote entry (http.ts, one per request in
// stateless mode). Tool failures are reported as isError results so the model
// sees the message and can adjust, instead of the transport dropping the call.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { ToolSet } from "./modules.js";

export const SERVER_INFO = { name: "humbl", version: "2.0.1" };

export interface ServerOptions {
  // Which AI client is calling, for humbl.ai's telemetry. The remote server
  // passes the caller's User-Agent product name; stdio leaves it unset and the
  // MCP client's handshake name (clientInfo.name) is used instead.
  assistant?: string;
}

export function createServer(toolSet: ToolSet, name = SERVER_INFO.name, options: ServerOptions = {}): Server {
  const server = new Server({ name, version: SERVER_INFO.version }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolSet.tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const assistant = options.assistant || server.getClientVersion()?.name;
      const text = await toolSet.call(
        request.params.name, (request.params.arguments ?? {}) as Record<string, unknown>, assistant,
      );
      return { content: [{ type: "text", text }] };
    } catch (error: unknown) {
      return { content: [{ type: "text", text: String(error instanceof Error ? error.message : error) }], isError: true };
    }
  });

  return server;
}
