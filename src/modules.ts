// Tool discovery and execution for the registry-backed modules (toplists,
// rankings, games). Django lists each module's tools at
// GET /api/mcp/<module>/tools/ and runs one at POST /api/mcp/<module>/tools/<name>/,
// so this file has no per-tool code: whatever Django reports is what the MCP
// client sees. Adding a tool on the Django side ships it here with no release.
//
// The tool list is cached per (module, key) for a few minutes. Keying on the
// key as well as the module is what makes a bad or revoked key fail at
// discovery instead of riding on another caller's cached list.
//
// Related: advert.ts (the static module), server.ts (builds the MCP Server).

import { ADVERT_TOOLS, HumblAdvertClient } from "./advert.js";

export const REGISTRY_MODULES = ["toplists", "rankings", "games"] as const;
export const MODULES = ["advert", ...REGISTRY_MODULES] as const;
export type Module = (typeof MODULES)[number];

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export class UpstreamError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const TOOL_LIST_TTL_MS = 5 * 60 * 1000;
const toolListCache = new Map<string, { at: number; tools: McpTool[] }>();

async function djangoJson(url: string, apiKey: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: { "X-Api-Key": apiKey, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = await response.text().catch(() => "");
  }
  if (!response.ok) {
    throw new UpstreamError(response.status, `humbl.ai returned ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function listModuleTools(apiUrl: string, module: string, apiKey: string): Promise<McpTool[]> {
  const cacheKey = `${module}:${apiKey}`;
  const cached = toolListCache.get(cacheKey);
  if (cached && Date.now() - cached.at < TOOL_LIST_TTL_MS) return cached.tools;
  const data = (await djangoJson(`${apiUrl}/api/mcp/${module}/tools/`, apiKey)) as { tools: McpTool[] };
  toolListCache.set(cacheKey, { at: Date.now(), tools: data.tools });
  return data.tools;
}

export async function callModuleTool(
  apiUrl: string,
  module: string,
  name: string,
  args: Record<string, unknown>,
  apiKey: string
): Promise<string> {
  const data = (await djangoJson(`${apiUrl}/api/mcp/${module}/tools/${name}/`, apiKey, {
    method: "POST",
    body: JSON.stringify(args),
  })) as { result: string };
  return data.result;
}

// Advert's tools are the static list in advert.ts, but the key must still be
// checked before they are listed: without this, /advert listed all 7 tools for
// any bearer token, while the other modules rejected it. Django answers GET
// /api/mcp/advert/tools/ with 200 and an empty list for a key that has ads, and
// 401 or 403 otherwise. Any other answer, including a 404 from an older Django,
// throws, so a moved route fails closed instead of open. Cached per key with
// the other modules' lists.
async function advertTools(apiUrl: string, apiKey: string): Promise<McpTool[]> {
  await listModuleTools(apiUrl, "advert", apiKey);
  return ADVERT_TOOLS as McpTool[];
}

// A resolved view over one or more modules: the tools to advertise and, for
// each tool name, how to run it. Built per request on the remote server.
export interface ToolSet {
  tools: McpTool[];
  call(name: string, args: Record<string, unknown>): Promise<string>;
}

export async function buildToolSet(apiUrl: string, modules: readonly Module[], apiKey: string): Promise<ToolSet> {
  const tools: McpTool[] = [];
  const owners = new Map<string, Module>();
  for (const module of modules) {
    const moduleTools = module === "advert" ? await advertTools(apiUrl, apiKey) : await listModuleTools(apiUrl, module, apiKey);
    for (const tool of moduleTools) {
      tools.push(tool);
      owners.set(tool.name, module);
    }
  }
  const advert = new HumblAdvertClient(apiKey, apiUrl);
  return {
    tools,
    async call(name, args) {
      const module = owners.get(name);
      if (!module) throw new UpstreamError(404, `Unknown tool: ${name}`);
      if (module === "advert") return advert.call(name, args);
      return callModuleTool(apiUrl, module, name, args, apiKey);
    },
  };
}
