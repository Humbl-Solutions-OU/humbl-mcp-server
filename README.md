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

You'll need an API key first — ask your Humbl.ai administrator to generate one.

### Option A: One-click install (Claude Desktop only)

Easiest way in. No terminal, no config files.

1. Go to the [Releases page](https://github.com/Humbl-Solutions-OU/humbl-mcp-server/releases) and download the latest `humbl-advert-x.x.x.mcpb` file
2. Double-click it — Claude Desktop launches the installer
3. Paste your API key when prompted — it's stored securely in your OS keychain
4. Done. The Humbl tools are now available

### Option B: npm install + config file (Cursor, Cline, Claude Desktop, and others)

**Step 1** — Install the server. This needs Node.js 18+ ([get it here](https://nodejs.org) if `node --version` doesn't work):

```bash
npm install -g @humblai/mcp-server
```

**Step 2** — Add this to your MCP config file, replacing `your-api-key-here`:

```json
{
  "mcpServers": {
    "humbl": {
      "command": "humbl-mcp-server",
      "args": [
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

## Troubleshooting

**"--api-key is required"**
Check that `--api-key=your-key` is in the `args` array in your config.

**"Invalid or inactive API key"**
Ask your Humbl.ai administrator to verify the key is active.

**"Connection refused"**
The Humbl.ai API is unreachable. Check your internet connection or ask your admin if the server is running.

**"humbl-mcp-server: command not found"**
The install didn't finish, or npm's global folder isn't in your PATH. Re-run `npm install -g @humblai/mcp-server`. If it still fails, run `npm root -g` and point your config at the full path instead:

```json
"command": "node",
"args": ["<npm root -g output>/@humblai/mcp-server/dist/index.js", "--api-key=your-api-key-here"]
```

**"node: command not found"**
Node.js isn't installed or isn't in your PATH. Reinstall from [nodejs.org](https://nodejs.org).

**Tools don't appear in my AI client**
Restart the client after editing the config. Check for JSON syntax errors (missing commas, unclosed brackets).
