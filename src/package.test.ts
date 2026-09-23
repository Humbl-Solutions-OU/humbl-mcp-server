// Guards the npx entry point. `npx @humblai/mcp-server` runs the bin whose name
// equals the unscoped package name when a package has more than one bin; with
// no such bin npx fails with "could not determine executable to run". 2.0.0
// shipped that way (two bins, neither named mcp-server) and broke every
// mcp.json that uses npx. The .mcpb bundle calls dist/index.js directly and is
// not affected.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("npx resolves a bin named after the unscoped package", () => {
  const unscoped = pkg.name.split("/").pop();
  assert.ok(pkg.bin[unscoped], `package.json bin needs a "${unscoped}" entry`);
  assert.equal(pkg.bin[unscoped], "dist/index.js");
});

test("global-install command stays available", () => {
  assert.equal(pkg.bin["humbl-mcp-server"], "dist/index.js");
});
