#!/usr/bin/env node

// Humbl.ai Advert MCP Server
// Provides 7 tools for ad research, PPC analysis, and competitive intelligence
// via the Humbl.ai REST API
//
// Configuration (in mcp.json):
// {
//   "mcpServers": {
//     "humbl-advert": {
//       "command": "npx",
//       "args": ["@humbl-ai/mcp-advert", "--api-key=YOUR_KEY_HERE"]
//     }
//   }
// }
//
// Usage: npx @humbl-ai/mcp-advert --api-key=your-key-here
// Local dev: npx @humbl-ai/mcp-advert --api-key=key --api-url=http://localhost:8000
// Works with any MCP-compatible client: Claude Desktop, Cline, Cursor, etc.

import { Server } from "@anthropic-ai/sdk/resources/messages/beta/threads/runs/steps";
import axios, { AxiosInstance } from "axios";

// Parse command line arguments
function parseArgs(): { apiKey: string; apiUrl: string } {
  const args = process.argv.slice(2);
  let apiKey = "";
  let apiUrl = "https://humbl.ai"; // Default to production

  for (const arg of args) {
    if (arg.startsWith("--api-key=")) {
      apiKey = arg.substring("--api-key=".length);
    } else if (arg.startsWith("--api-url=")) {
      apiUrl = arg.substring("--api-url=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.error(`
Humbl.ai Advert MCP Server

Usage: npx @humbl-ai/mcp-advert --api-key=YOUR_KEY [--api-url=URL]

Arguments:
  --api-key=KEY      Your Humbl.ai API key (required)
  --api-url=URL      API URL (default: https://humbl.ai)
  --help, -h         Show this help message

Example:
  npx @humbl-ai/mcp-advert --api-key=abc123def456

Local development:
  npx @humbl-ai/mcp-advert --api-key=your-key --api-url=http://localhost:8000
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

class HumblAdvertMCPServer {
  private apiClient: AxiosInstance;
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;

    this.apiClient = axios.create({
      baseURL: `${this.apiUrl}/api/mcp/advert`,
      headers: {
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
      },
    });
  }

  getTools(): Array<{
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
  }> {
    return [
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
          "Find top advertising competitors for a keyword in a specific location and device over a date range. Returns domains ranked by ad exposure (impressions).",
        inputSchema: {
          type: "object",
          properties: {
            keyword: {
              type: "string",
              description: "The search keyword (e.g., 'casino', 'poker')",
            },
            location: {
              type: "string",
              description: "The location name (e.g., 'Amsterdam, Netherlands')",
            },
            device: {
              type: "string",
              enum: ["mobile", "desktop"],
              description: "Device type to search",
            },
            date_from: {
              type: "string",
              description: "Start date in format YYYY-MM-DD HH:MM (UTC)",
            },
            date_to: {
              type: "string",
              description: "End date in format YYYY-MM-DD HH:MM (UTC)",
            },
          },
          required: ["keyword", "location", "device", "date_from", "date_to"],
        },
      },
      {
        name: "domain_data",
        description:
          "Get cached ad exposure data for a specific domain across keywords and locations. Data is served from Redis cache and updated periodically.",
        inputSchema: {
          type: "object",
          properties: {
            domain: {
              type: "string",
              description:
                "Domain name (e.g., 'example.com' or 'www.example.com')",
            },
            country: {
              type: "string",
              description: "Optional: ISO country code to filter results (e.g., 'US', 'GB')",
            },
          },
          required: ["domain"],
        },
      },
      {
        name: "ppc_overview",
        description:
          "Get PPC site monitoring data for a location. Returns recently detected PPC sites with market share and licensing information.",
        inputSchema: {
          type: "object",
          properties: {
            location_id: {
              type: "number",
              description: "The location ID",
            },
            order_by: {
              type: "string",
              enum: ["newest", "market_share"],
              description: "Sort results by creation date or market share (default: newest)",
            },
          },
          required: ["location_id"],
        },
      },
      {
        name: "brand_lookup",
        description:
          "Search for recent detected appearances of a brand/operator in ad listings. Looks back 1 day and deduplicates by site URL.",
        inputSchema: {
          type: "object",
          properties: {
            brand_name: {
              type: "string",
              description: "Brand or operator name to search for (e.g., 'Bet365')",
            },
            country: {
              type: "string",
              description: "Optional: ISO country code to filter results",
            },
          },
          required: ["brand_name"],
        },
      },
      {
        name: "general_search",
        description:
          "Search the ad database by domain name or keyword. Searches across the last 14 days. Returns paginated results.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Domain (e.g., 'example.com') or keyword text",
            },
            date: {
              type: "string",
              description: "Optional: Filter to specific day (YYYY-MM-DD format)",
            },
            page: {
              type: "number",
              description: "Page number (1-20, default: 1)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "live_search",
        description:
          "Perform a live ad search via the HumblSERP proxy. Returns real-time ad results (not cached) for a keyword in a specific location, device, and search engine.",
        inputSchema: {
          type: "object",
          properties: {
            keyword: {
              type: "string",
              description: "Search keyword",
            },
            location: {
              type: "string",
              description: "Location name (e.g., 'Amsterdam, Netherlands')",
            },
            device: {
              type: "string",
              enum: ["mobile", "desktop"],
              description: "Device type",
            },
            engine: {
              type: "string",
              enum: ["google", "bing", "meta"],
              description: "Search engine",
            },
          },
          required: ["keyword", "location", "device", "engine"],
        },
      },
    ];
  }

  async callTool(toolName: string, toolInput: Record<string, unknown>): Promise<string> {
    try {
      let response;

      switch (toolName) {
        case "market_share":
          response = await this.apiClient.get("/market-share/", {
            params: { location_id: toolInput.location_id },
          });
          break;

        case "competitors":
          response = await this.apiClient.get("/competitors/", {
            params: {
              keyword: toolInput.keyword,
              location: toolInput.location,
              device: toolInput.device,
              date_from: toolInput.date_from,
              date_to: toolInput.date_to,
            },
          });
          break;

        case "domain_data":
          response = await this.apiClient.get("/domain-data/", {
            params: {
              domain: toolInput.domain,
              country: toolInput.country,
            },
          });
          break;

        case "ppc_overview":
          response = await this.apiClient.get("/ppc-overview/", {
            params: {
              location_id: toolInput.location_id,
              order_by: toolInput.order_by || "newest",
            },
          });
          break;

        case "brand_lookup":
          response = await this.apiClient.get("/brand-lookup/", {
            params: {
              brand_name: toolInput.brand_name,
              country: toolInput.country,
            },
          });
          break;

        case "general_search":
          response = await this.apiClient.get("/general-search/", {
            params: {
              query: toolInput.query,
              date: toolInput.date,
              page: toolInput.page || 1,
            },
          });
          break;

        case "live_search":
          response = await this.apiClient.get("/live-search/", {
            params: {
              keyword: toolInput.keyword,
              location: toolInput.location,
              device: toolInput.device,
              engine: toolInput.engine,
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

// Main server implementation - stdin/stdout based MCP protocol
async function main() {
  const { apiKey, apiUrl } = parseArgs();
  const server = new HumblAdvertMCPServer(apiKey, apiUrl);
  const tools = server.getTools();

  // Handle stdin for tool calls
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  // Send tools list on startup
  console.log(JSON.stringify({ type: "tools", tools }));

  let buffer = "";

  rl.on("line", async (line) => {
    buffer += line + "\n";

    try {
      const request = JSON.parse(buffer);
      buffer = "";

      if (request.type === "tool_call") {
        const result = await server.callTool(request.tool, request.input);
        console.log(
          JSON.stringify({
            type: "tool_result",
            tool_use_id: request.id,
            content: result,
          })
        );
      }
    } catch (e) {
      // Incomplete JSON, wait for more data
      if (!(e instanceof SyntaxError)) {
        console.error("Error:", e);
      }
    }
  });

  rl.on("close", () => {
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
