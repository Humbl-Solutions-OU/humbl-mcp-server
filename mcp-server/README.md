# Humbl.ai Advert MCP Server

An MCP (Model Context Protocol) server for accessing Humbl.ai's advert research tools. Works with **any MCP-compatible client** including Claude Desktop, Cline, Cursor, and custom AI agents.

Provides 7 tools for ad research, PPC analysis, and competitive intelligence.

## Tools Provided

1. **Market Share** — Top domains by ad exposure for a location
2. **Competitors** — Top advertisers for a keyword/location over a date range
3. **Domain Data** — Ad exposure data for a domain across keywords and locations
4. **PPC Overview** — PPC site monitoring data for a location
5. **Brand Lookup** — Recent detected brand appearances in ad listings
6. **General Search** — Database search by domain or keyword (14-day window)
7. **Live Search** — Real-time ad search via HumblSERP proxy

## Installation

### Prerequisites
- Node.js 18+
- An API key from Humbl.ai (create one at `https://humbl.ai/admin/mcp/mcpapikey/`)

**No global installation required!** The server runs via `npx` on demand.

## Compatible Clients

This MCP server works with any client that supports the MCP protocol:

- **Claude Desktop** — Anthropic's desktop app
- **Cline** — VS Code extension for Claude
- **Cursor IDE** — AI-first code editor
- **Custom MCP Clients** — Any tool that implements MCP

## Configuration

### For Claude Desktop

Add to your `mcp.json` configuration file:

**macOS:** `~/Library/Application Support/Claude/mcp.json`
**Windows:** `%APPDATA%\Claude\mcp.json`
**Linux:** `~/.config/Claude/mcp.json`

#### Production (Using humbl.ai)

```json
{
  "mcpServers": {
    "humbl-advert": {
      "command": "npx",
      "args": ["@humbl-ai/mcp-advert", "--api-key=your-api-key-here"]
    }
  }
}
```

#### Local Development (Using localhost:8000)

```json
{
  "mcpServers": {
    "humbl-advert": {
      "command": "npx",
      "args": ["@humbl-ai/mcp-advert", "--api-key=your-api-key-here", "--api-url=http://localhost:8000"]
    }
  }
}
```

That's it! The server will download and run automatically via `npx`. No `npm install` needed.

### Command Arguments

- `--api-key=KEY` — Your Humbl.ai API key (required)
- `--api-url=URL` — API URL (optional, default: `https://humbl.ai`)

### For Cline (VS Code Extension)

Add to your Cline MCP servers configuration:

```json
{
  "mcpServers": {
    "humbl-advert": {
      "command": "npx",
      "args": ["@humbl-ai/mcp-advert", "--api-key=your-api-key-here"]
    }
  }
}
```

### For Cursor IDE

Cursor uses the same MCP configuration format:

```json
{
  "mcpServers": {
    "humbl-advert": {
      "command": "npx",
      "args": ["@humbl-ai/mcp-advert", "--api-key=your-api-key-here"]
    }
  }
}
```

### For Custom MCP Clients

Run directly with command line arguments:

```bash
npx @humbl-ai/mcp-advert --api-key=your-key-here
```

For local development:

```bash
npx @humbl-ai/mcp-advert --api-key=your-key-here --api-url=http://localhost:8000
```

## Usage Examples

Once configured in Claude Desktop, you can ask:

### Market Share
> "What are the top domains by ad exposure in Amsterdam?"
- Uses the `market_share` tool with location_id for Amsterdam

### Competitors
> "Who are the top competitors advertising for 'casino' in Stockholm on mobile?"
- Uses the `competitors` tool to find advertisers for a specific keyword

### Domain Research
> "What's the ad exposure data for example.com?"
- Uses the `domain_data` tool to get cached exposure information

### Brand Tracking
> "Has Bet365 been detected in ads recently?"
- Uses the `brand_lookup` tool to find recent brand detections

### General Search
> "Search for ads mentioning 'poker' in the last 14 days"
- Uses the `general_search` tool to query the database

### Live Search
> "Show me live Google ads for 'casino' in Amsterdam on mobile"
- Uses the `live_search` tool for real-time results

## API Key Management

### Creating an API Key

1. Go to `http://your-humbl-server/admin/mcp/mcpapikey/`
2. Click "Add MCP API Key"
3. Enter a descriptive name (e.g., "Claude Desktop")
4. The key will be auto-generated
5. Copy the key and add it to your configuration

### Key Security

- API keys are sensitive — treat them like passwords
- Rotate keys quarterly in production environments
- If a key is compromised, deactivate it immediately in the admin panel
- Use environment variables instead of hardcoding keys in config files

## Troubleshooting

### "--api-key is required"

Make sure you've set the `--api-key` parameter in your `mcp.json`:

```json
{
  "args": ["@humbl-ai/mcp-advert", "--api-key=your-actual-key-here"]
}
```

### "Invalid or inactive MCP API key"

1. Check the key is correct (no extra spaces)
2. Verify the key is active in `/admin/mcp/mcpapikey/`
3. Make sure `HUMBL_API_URL` points to the correct server

### "Connection refused"

1. Verify the Humbl.ai API is running: `curl http://localhost:8000/api/mcp/advert/market-share/`
2. Check `HUMBL_API_URL` matches your server URL
3. Ensure no firewall blocks the connection

### "location_id not found"

- Check the location ID exists in Humbl.ai
- Use the `general_search` tool to verify locations

### "npx command not found"

1. Ensure Node.js 18+ is installed: `node --version`
2. Reinstall Node.js from https://nodejs.org
3. Try full path: `/usr/local/bin/npx @humbl-ai/mcp-advert`

## Development (Building from Source)

### Clone and Build

```bash
git clone https://github.com/your-org/humbl.ai.git
cd humbl.ai/mcp-server
npm install
npm run build
```

The build process:
1. Compiles TypeScript to JavaScript
2. **Obfuscates the output** to prevent reverse engineering
3. Minifies and encodes string literals
4. Publishes only the compiled `dist/` folder

### Testing Locally

```bash
npm run dev
```

This runs the unobfuscated TypeScript source for easier debugging.

### Publishing

```bash
npm publish
```

This publishes only the obfuscated compiled code in `dist/`, not the source files.

## Compatibility

### MCP Protocol
- Implements the official MCP (Model Context Protocol) standard
- Compatible with any MCP-compliant client
- Uses stdin/stdout for communication
- Proper JSON message framing

### Humbl.ai API
- Requires Humbl.ai with MCP advert integration deployed
- API endpoints: `/api/mcp/advert/{endpoint}/`
- Authentication: `X-Api-Key` header
- Response format: JSON

## Security

### Code Obfuscation
- The published npm package contains **obfuscated JavaScript only**
- Source code (TypeScript) is not included in distributions
- Variable names, string literals, and logic flow are obscured
- Makes it significantly harder to reverse engineer or extract implementation details

### API Key Security
- API keys are passed via command-line parameters, never hardcoded
- Keys are never logged or exposed in error messages
- Use strong, randomly-generated keys from the admin panel
- Rotate keys immediately if compromised
- Store keys securely (not in version control)

### HTTPS by Default
- Production uses `https://humbl.ai` by default
- Always verify SSL certificates
- Use `--api-url` parameter only for trusted local development

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API documentation: `/docs/mcp/DEPLOYMENT.md`
3. Contact Humbl.ai support

## License

See LICENSE file in the Humbl.ai repository.
