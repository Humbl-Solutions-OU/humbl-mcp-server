#!/usr/bin/env node

// Humbl.ai MCP Server, stdio entry (npm package + .mcpb bundle).
//
// Speaks MCP over stdin/stdout for Claude Desktop, Cursor, Cline and friends.
// Every tool proxies to the Humbl.ai Django API; this process holds nothing
// but the user's API key. The remote (HTTP) entry is http-main.ts.
//
// Usage:
//   npx @humblai/mcp-server --api-key=YOUR_KEY
//   npx @humblai/mcp-server --api-key=YOUR_KEY --modules=advert,toplists
//   npx @humblai/mcp-server --api-key=YOUR_KEY --api-url=http://localhost:8000
//
// MCP client config (mcp.json):
//   {
//     "mcpServers": {
//       "humbl": {
//         "command": "npx",
//         "args": ["@humblai/mcp-server", "--api-key=YOUR_KEY"]
//       }
//     }
//   }

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MODULES, buildToolSet, type Module } from "./modules.js";
import { createServer } from "./server.js";

function parseArgs(): { apiKey: string; apiUrl: string; modules: readonly Module[] } {
  const args = process.argv.slice(2);
  let apiKey = "";
  let apiUrl = "https://humbl.ai";
  let modules: readonly Module[] = MODULES;

  for (const arg of args) {
    if (arg.startsWith("--api-key=")) {
      apiKey = arg.substring("--api-key=".length);
    } else if (arg.startsWith("--api-url=")) {
      apiUrl = arg.substring("--api-url=".length).replace(/\/+$/, "");
    } else if (arg.startsWith("--modules=")) {
      const wanted = arg.substring("--modules=".length).split(",").map((m) => m.trim());
      const unknown = wanted.filter((m) => !(MODULES as readonly string[]).includes(m));
      if (unknown.length) {
        console.error(`Error: unknown module(s) ${unknown.join(", ")}. Valid: ${MODULES.join(", ")}`);
        process.exit(1);
      }
      modules = wanted as Module[];
    } else if (arg === "--help" || arg === "-h") {
      console.error(`
Humbl.ai MCP Server

Usage: npx @humblai/mcp-server --api-key=YOUR_KEY [--api-url=URL] [--modules=a,b]

  --api-key=KEY     Your Humbl.ai API key (required)
  --api-url=URL     API base URL (default: https://humbl.ai)
  --modules=LIST    Comma-separated subset of: ${MODULES.join(", ")} (default: all)
      `);
      process.exit(0);
    }
  }

  if (!apiKey) {
    console.error("Error: --api-key is required");
    console.error("Usage: npx @humblai/mcp-server --api-key=YOUR_KEY");
    process.exit(1);
  }

  return { apiKey, apiUrl, modules };
}

async function main() {
  const { apiKey, apiUrl, modules } = parseArgs();
  const toolSet = await buildToolSet(apiUrl, modules, apiKey);
  const server = createServer(toolSet);
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
