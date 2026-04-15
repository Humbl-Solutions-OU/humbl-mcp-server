# Humbl.ai MCP Server

Connect your AI assistant (Claude Desktop, Cursor, Cline, etc.) directly to Humbl.ai's intelligence data. Once set up, you can ask questions in plain English and get real insights back — no dashboards, no exports, no manual queries.

## What Can You Do With This?

Once connected, just ask your AI assistant things like:

- *"Who are the top advertisers for 'casino' in Amsterdam this week?"*
- *"Show me the market share data for Netherlands on desktop"*
- *"Has Bet365 shown up in any ads recently?"*
- *"Search the ad database for anything related to poker"*
- *"Run a live Google search for 'online casino' ads in Stockholm on mobile"*

The assistant handles the rest — it knows which tool to use and how to interpret the results.

---

## Available Modules

### Adverts ✅ Available now

PPC and paid media intelligence tools.

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

## Roadmap

The following modules are planned. Each will add new tools to the same MCP server — no reconfiguration needed when they ship.

| Module | What It Will Cover |
|---|---|
| **Top Lists** | SEO and organic search intelligence — top domains, keyword rankings, visibility trends |
| **Rankings** | Keyword rank tracking — monitor position changes over time for any domain |
| **Brand Monitoring** | Brand health tracking — mentions, share of voice, competitor movements |
| **Compliance** | Regulatory monitoring — detect unlicensed operators, flag policy violations |
| **Game Providers** | Gaming industry intelligence — provider market share, game distribution data |

---

## Installation

You'll need an API key first — ask your Humbl.ai administrator to generate one at:
```
https://humbl.ai/admin/mcp/mcpapikey/
```

### Option A: One-click install via `.mcpb` (Claude Desktop only)

1. Go to the [Releases page](https://github.com/Humbl-Solutions-OU/humbl-mcp-server/releases) and download the latest `humbl-advert-x.x.x.mcpb` file
2. Double-click the `.mcpb` file — Claude Desktop will launch the installer
3. Enter your API key when prompted — it's stored securely in your OS keychain
4. Done. The Humbl tools are now available

### Option B: Manual JSON config (Claude Desktop, Cursor, Cline, and others)

**Step 1** — Make sure Node.js 18+ is installed:
```
node --version
```
If not installed, get it from [nodejs.org](https://nodejs.org).

**Step 2** — Add this to your MCP config file, replacing `your-api-key-here`:

```json
{
  "mcpServers": {
    "humbl": {
      "command": "npx",
      "args": [
        "@humblai/mcp-server",
        "--api-key=your-api-key-here"
      ]
    }
  }
}
```

**Config file locations:**

| Client | Path |
|---|---|
| Claude Desktop (Mac) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor | Settings → MCP → Edit config |
| Cline | VS Code settings → Cline → MCP Servers |

**Step 3** — Restart your AI client. The Humbl tools will appear automatically.

---

## For Developers

### Local Development

```bash
git clone https://github.com/Humbl-Solutions-OU/humbl-mcp-server.git
cd humbl-mcp-server
npm install
npm run build
```

Run against a local Django server:
```bash
npm run dev -- --api-key=your-key --api-url=http://localhost:8000
```

Point your MCP client at the local build:
```json
{
  "mcpServers": {
    "humbl": {
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

### Releases

The release workflow runs automatically on version tags. It:
1. Builds TypeScript
2. Publishes to npm as `@humblai/mcp-server`
3. Packs the `.mcpb` bundle
4. Uploads it to GitHub Releases

**Prerequisites:** Add an `NPM_TOKEN` secret to the GitHub repo (Settings → Secrets → Actions).

```bash
git tag v1.0.0
git push origin v1.0.0
```

The npm package and `.mcpb` file will be live within a few minutes.

---

## Troubleshooting

**"--api-key is required"**
Check that `--api-key=your-key` is in the `args` array in your config.

**"Invalid or inactive API key"**
Ask your admin to verify the key is active at `/admin/mcp/mcpapikey/`.

**"Connection refused"**
The Humbl.ai API is unreachable. Check your internet connection or ask your admin if the server is running.

**"node: command not found"**
Node.js isn't installed or isn't in your PATH. Reinstall from [nodejs.org](https://nodejs.org).

**Tools don't appear in my AI client**
Restart the client after editing the config. Check for JSON syntax errors (missing commas, unclosed brackets).
