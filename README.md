# Humbl.ai Advert MCP Server

Connect your AI assistant (Claude Desktop, Cursor, Cline, etc.) directly to Humbl.ai's ad research data. Once set up, you can ask questions in plain English and get real ad intelligence back — no dashboards, no exports, no manual queries.

## What Can You Do With This?

Once connected, just ask your AI assistant things like:

- *"Who are the top advertisers for 'casino' in Amsterdam this week?"*
- *"Show me the market share data for Netherlands on desktop"*
- *"Has Bet365 shown up in any ads recently?"*
- *"Search the ad database for anything related to poker"*
- *"Run a live Google search for 'online casino' ads in Stockholm on mobile"*

The assistant handles the rest — it knows which tool to use and how to interpret the results.

## Available Tools

| Tool | What It Does |
|---|---|
| **Market Share** | Top 50 domains by ad exposure for a location |
| **Competitors** | Who's advertising for a keyword, where, and on which device |
| **Domain Data** | Full ad exposure history for a specific domain |
| **PPC Overview** | Recently detected PPC sites for a location |
| **Brand Lookup** | Has a specific brand appeared in ads in the last 24 hours? |
| **General Search** | Search the ad database by domain or keyword (last 14 days) |
| **Live Search** | Real-time ad results — not cached, pulled fresh from the web |

---

## Setup Guide

### Step 1: Get an API Key

Ask your Humbl.ai administrator to create an API key for you at:

```
https://humbl.ai/admin/mcp/mcpapikey/
```

They'll give you a key that looks like: `abc123def456...`

Keep this key private — treat it like a password.

### Step 2: Install Node.js (if you don't have it)

Check if you have it:
```
node --version
```

If that shows a version number (18 or higher), you're good. If not, download it from [nodejs.org](https://nodejs.org) and install the LTS version.

### Step 3: Configure Your AI Client

Find your MCP configuration file and add the following block. Replace `your-api-key-here` with the key from Step 1.

**Claude Desktop**

| Platform | Config file location |
|---|---|
| Mac | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

**Cursor / Cline / other clients** — check your client's MCP settings section.

```json
{
  "mcpServers": {
    "humbl-advert": {
      "command": "npx",
      "args": [
        "@humbl-ai/mcp-advert",
        "--api-key=your-api-key-here"
      ]
    }
  }
}
```

### Step 4: Restart Your AI Client

Close and reopen the app. The Humbl tools will appear automatically.

---

## For Developers

### Local Development Setup

```bash
git clone https://github.com/Humbl-Solutions-OU/humbl-mcp-server.git
cd humbl-mcp-server
npm install
```

Run against a local Django server:
```bash
npm run dev -- --api-key=your-key --api-url=http://localhost:8000
```

Build:
```bash
npm run build
```

Point your MCP client at the local build instead of npx:
```json
{
  "mcpServers": {
    "humbl-advert": {
      "command": "node",
      "args": [
        "/path/to/humbl-mcp-server/dist/index.js",
        "--api-key=your-key",
        "--api-url=http://localhost:8000"
      ]
    }
  }
}
```

### Publishing

```bash
npm publish
```

The package is scoped to `@humbl-ai` and published as restricted. Users need npm org access to install via `npx`.

---

## Troubleshooting

**"--api-key is required"**
Make sure `--api-key=your-key` is in the `args` array in your config.

**"Invalid or inactive API key"**
Ask your admin to check the key is active at `/admin/mcp/mcpapikey/`.

**"Connection refused"**
The Humbl.ai API is unreachable. Check your internet connection or ask your admin if the server is running.

**"npx command not found"**
Node.js isn't installed or isn't in your PATH. Reinstall from [nodejs.org](https://nodejs.org).

**Tools don't appear in my AI client**
Restart the client after editing the config. Check for JSON syntax errors in the config file (missing commas, unclosed brackets).
