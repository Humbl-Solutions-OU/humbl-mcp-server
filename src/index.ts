#!/usr/bin/env node

// Humbl.ai Advert MCP Server
//
// Exposes 7 ad research tools via the Model Context Protocol (MCP).
// Communicates over stdin/stdout using the official MCP SDK (JSON-RPC 2.0).
// All tools proxy to the Humbl.ai Django REST API at /api/mcp/advert/.
//
// Usage:
//   npx @humbl-ai/mcp-advert --api-key=YOUR_KEY
//   npx @humbl-ai/mcp-advert --api-key=YOUR_KEY --api-url=http://localhost:8000
//
// MCP client config (mcp.json):
//   {
//     "mcpServers": {
//       "humbl-advert": {
//         "command": "npx",
//         "args": ["@humbl-ai/mcp-advert", "--api-key=YOUR_KEY"]
//       }
//     }
//   }

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";

function parseArgs(): { apiKey: string; apiUrl: string } {
  const args = process.argv.slice(2);
  let apiKey = "";
  let apiUrl = "https://humbl.ai";

  for (const arg of args) {
    if (arg.startsWith("--api-key=")) {
      apiKey = arg.substring("--api-key=".length);
    } else if (arg.startsWith("--api-url=")) {
      apiUrl = arg.substring("--api-url=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.error(`
Humbl.ai Advert MCP Server

Usage: npx @humbl-ai/mcp-advert --api-key=YOUR_KEY [--api-url=URL]

  --api-key=KEY    Your Humbl.ai API key (required)
  --api-url=URL    API base URL (default: https://humbl.ai)
      `);
      process.exit(0);
    }
  }

  if (!apiKey) {
    console.error("Error: --api-key is required");
    console.error("Usage: npx @humbl-ai/mcp-advert --api-key=YOUR_KEY");
    process.exit(1);
  }

  return { apiKey, apiUrl };
}

// Wraps all Humbl API calls. Each method maps to one Django endpoint.
class HumblAdvertClient {
  private http: AxiosInstance;

  constructor(apiKey: string, apiUrl: string) {
    this.http = axios.create({
      baseURL: `${apiUrl}/api/mcp/advert`,
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
    });
  }

  async call(toolName: string, input: Record<string, unknown>): Promise<string> {
    try {
      let response;

      switch (toolName) {
        case "market_share":
          response = await this.http.get("/market-share/", {
            params: { location_id: input.location_id },
          });
          break;

        case "competitors":
          response = await this.http.get("/competitors/", {
            params: {
              keyword: input.keyword,
              location: input.location,
              device: input.device,
              date_from: input.date_from,
              date_to: input.date_to,
            },
          });
          break;

        case "domain_data":
          response = await this.http.get("/domain-data/", {
            params: { domain: input.domain, country: input.country },
          });
          break;

        case "ppc_overview":
          response = await this.http.get("/ppc-overview/", {
            params: {
              location_id: input.location_id,
              order_by: input.order_by ?? "newest",
            },
          });
          break;

        case "brand_lookup":
          response = await this.http.get("/brand-lookup/", {
            params: { brand_name: input.brand_name, country: input.country },
          });
          break;

        case "general_search":
          response = await this.http.get("/general-search/", {
            params: { query: input.query, date: input.date, page: input.page ?? 1 },
          });
          break;

        case "live_search":
          response = await this.http.get("/live-search/", {
            params: {
              keyword: input.keyword,
              location: input.location,
              device: input.device,
              engine: input.engine,
            },
          });
          break;

        default:
          return JSON.stringify({ error: `Unknown tool: ${toolName}` });
      }

      return JSON.stringify(response.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        return JSON.stringify({
          error: error.message,
          status: error.response?.status,
          detail: error.response?.data,
        });
      }
      return JSON.stringify({ error: String(error) });
    }
  }
}

const TOOLS = [
  {
    name: "market_share",
    description:
      "Get top domains by ad exposure (market share) for a specific location. Returns the 50 most exposed domains with their exposure count and percentage.",
    inputSchema: {
      type: "object",
      properties: {
        location_id: {
          type: "number",
          description: "The location ID (e.g., 20 for Amsterdam, Netherlands)",
        },
      },
      required: ["location_id"],
    },
  },
  {
    name: "competitors",
    description:
      "Find top advertising competitors for a keyword in a specific location and device over a date range. Returns domains ranked by ad exposure.",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "Search keyword (e.g., 'casino')" },
        location: { type: "string", description: "Location name (e.g., 'Amsterdam, Netherlands')" },
        device: { type: "string", enum: ["mobile", "desktop"] },
        date_from: { type: "string", description: "Start date: YYYY-MM-DD HH:MM (UTC)" },
        date_to: { type: "string", description: "End date: YYYY-MM-DD HH:MM (UTC)" },
      },
      required: ["keyword", "location", "device", "date_from", "date_to"],
    },
  },
  {
    name: "domain_data",
    description:
      "Get cached ad exposure data for a domain across keywords and locations. Served from Redis, updated periodically.",
    inputSchema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "Domain name (e.g., 'example.com')" },
        country: { type: "string", description: "Optional ISO country code (e.g., 'US')" },
      },
      required: ["domain"],
    },
  },
  {
    name: "ppc_overview",
    description:
      "Get PPC site monitoring data for a location. Returns recently detected PPC sites with market share and licensing info.",
    inputSchema: {
      type: "object",
      properties: {
        location_id: { type: "number", description: "Location ID" },
        order_by: {
          type: "string",
          enum: ["newest", "market_share"],
          description: "Sort by creation date or market share (default: newest)",
        },
      },
      required: ["location_id"],
    },
  },
  {
    name: "brand_lookup",
    description:
      "Search for recent appearances of a brand in ad listings. Looks back 1 day and deduplicates by site URL.",
    inputSchema: {
      type: "object",
      properties: {
        brand_name: { type: "string", description: "Brand name to search (e.g., 'Bet365')" },
        country: { type: "string", description: "Optional ISO country code" },
      },
      required: ["brand_name"],
    },
  },
  {
    name: "general_search",
    description:
      "Search the ad database by domain or keyword across the last 14 days. Returns paginated results (up to 20 pages).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Domain or keyword text" },
        date: { type: "string", description: "Optional: filter to a specific day (YYYY-MM-DD)" },
        page: { type: "number", description: "Page number (1–20, default: 1)" },
      },
      required: ["query"],
    },
  },
  {
    name: "live_search",
    description:
      "Perform a live ad search via HumblSERP. Returns real-time (non-cached) ad results for a keyword/location/device/engine combination.",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "Search keyword" },
        location: { type: "string", description: "Location name (e.g., 'Amsterdam, Netherlands')" },
        device: { type: "string", enum: ["mobile", "desktop"] },
        engine: { type: "string", enum: ["google", "bing", "meta"] },
      },
      required: ["keyword", "location", "device", "engine"],
    },
  },
];

async function main() {
  const { apiKey, apiUrl } = parseArgs();
  const client = new HumblAdvertClient(apiKey, apiUrl);

  const server = new Server(
    { name: "humbl-advert", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const result = await client.call(
      request.params.name,
      (request.params.arguments ?? {}) as Record<string, unknown>
    );
    return { content: [{ type: "text", text: result }] };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
