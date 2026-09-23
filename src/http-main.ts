#!/usr/bin/env node

// CLI entry for the remote server. Config is env-only because it runs under a
// process manager on the box, not from a user's mcp.json.
//
//   PORT=3000 HUMBL_API_URL=https://humbl.ai humbl-mcp-http

import { startHttpServer } from "./http.js";

const port = Number(process.env.PORT ?? 3000);
const apiUrl = (process.env.HUMBL_API_URL ?? "https://humbl.ai").replace(/\/+$/, "");

startHttpServer({ apiUrl, port }).then((server) => {
  const address = server.address() as { port: number };
  console.error(`humbl MCP remote server listening on :${address.port}, upstream ${apiUrl}`);
});
