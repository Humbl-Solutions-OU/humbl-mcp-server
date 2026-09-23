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

One server, four modules. Connect to all of them or pick a subset.

### Adverts

| Tool | What It Does |
|---|---|
| **market_share** | Top 50 domains by ad exposure for a location |
| **competitors** | Who's advertising for a keyword, where, and on which device |
| **domain_data** | Full ad exposure history for a specific domain |
| **ppc_overview** | Recently detected PPC sites for a location |
| **brand_lookup** | Has a specific brand appeared in ads in the last 24 hours? |
| **general_search** | Search the ad database by domain or keyword (last 14 days) |
| **live_search** | Real-time ad results, pulled fresh from the web |

### Toplists

| Tool | What It Does |
|---|---|
| **query_toplist_market_share** | Brand share across affiliate toplists per market (default / licensed / unlicensed / sports / casino) |
| **query_toplist_positions** | Where a brand is listed on affiliate sites, or what a site lists |
| **query_toplist_sites** | Affiliate sites we track, by market, vertical, page type |
| **query_toplist_brands** | Resolve a brand name and its aliases |
| **explore_toplist_schema** | Valid countries, filter types, verticals, page types |

### Rankings

| Tool | What It Does |
|---|---|
| **query_rankings_locations** | Find a location_id |
| **query_rankings_keywords** | Find a keyword_id |
| **query_rankings_top_domains** | Who ranks for a keyword in a location |
| **query_rankings_domain_monitor** | Position history of one domain for one keyword |
| **query_rankings_domain_traffic** | Estimated search traffic for a domain |
| **query_rankings_domain_top_keywords** | What a domain ranks for |

### Games

| Tool | What It Does |
|---|---|
| **query_games_data** | Game positions and rankings across casino lobbies |
| **get_game_metadata** | Supplier, release date, RTP and other facts about a game |
| **explore_games_schema** | Valid countries, operators, suppliers, sections |
| **query_market_analytics** | GGR estimates and market share |
| **query_new_games** | Newly released / first-seen games |
| **query_compliance** | Licensing status of games and suppliers per market |

Toplists, rankings and games tools are defined on the humbl.ai side and discovered at startup; new tools there show up here without an update.

---

## Installation

You'll need an API key first — ask your Humbl.ai administrator to generate one.

### Option A: Remote server (claude.ai web, Claude mobile, Cursor, anything that supports remote MCP)

No install. Add a remote MCP server (also called a "connector" or "integration") in your client with:

| Field | Value |
|---|---|
| URL | `https://mcp.humbl.ai/all` (or `/advert`, `/toplists`, `/rankings`, `/games` for one module) |
| Auth | Bearer token = your Humbl.ai API key |

For clients that take a config file:

```json
{
  "mcpServers": {
    "humbl": {
      "url": "https://mcp.humbl.ai/all",
      "headers": { "Authorization": "Bearer your-api-key-here" }
    }
  }
}
```

### Option B: One-click install (Claude Desktop only)

Easiest way in. No terminal, no config files.

1. Go to the [Releases page](https://github.com/Humbl-Solutions-OU/humbl-mcp-server/releases) and download the latest `humbl-advert-x.x.x.mcpb` file
2. Double-click it — Claude Desktop launches the installer
3. Paste your API key when prompted — it's stored securely in your OS keychain
4. Done. The Humbl tools are now available

### Option C: npm install + config file (Cursor, Cline, Claude Desktop, and others)

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

Add `"--modules=advert,toplists"` to the args to load a subset.

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
