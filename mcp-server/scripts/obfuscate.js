#!/usr/bin/env node

// Obfuscation script for MCP server
// Compresses and obfuscates the compiled JavaScript to prevent reverse engineering

const fs = require("fs");
const path = require("path");
const JavaScriptObfuscator = require("javascript-obfuscator");

const inputFile = path.join(__dirname, "../dist/index.js");
const outputFile = path.join(__dirname, "../dist/index.js");

if (!fs.existsSync(inputFile)) {
  console.error(`Error: ${inputFile} not found. Run 'npm run build' first.`);
  process.exit(1);
}

try {
  const code = fs.readFileSync(inputFile, "utf8");

  const obfuscated = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    debugProtectionInterval: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: "hexadecimal",
    log: false,
    renameGlobals: false,
    rotateStringArray: true,
    selfDefending: false,
    stringArray: true,
    stringArrayEncoding: "base64",
    stringArrayThreshold: 0.75,
    unicodeEscapeSequence: false,
  });

  fs.writeFileSync(outputFile, obfuscated.getObfuscatedCode(), "utf8");
  console.log(`✓ Obfuscated ${inputFile}`);
  console.log(`  - Removed readable variable names`);
  console.log(`  - Encoded string literals`);
  console.log(`  - Minified output`);
  console.log(`  - Ready for distribution`);
} catch (error) {
  console.error("Obfuscation failed:", error.message);
  process.exit(1);
}
