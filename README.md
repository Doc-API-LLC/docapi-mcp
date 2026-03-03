# docapi-mcp

MCP server for [DocAPI](https://www.docapi.co) — generate PDFs and screenshots via Claude Desktop, Cursor, and any MCP-compatible agent.

## Tools

| Tool | Description |
|------|-------------|
| `docapi_generate_pdf` | Convert HTML to PDF (full CSS: Grid, Flexbox, custom fonts) |
| `docapi_capture_screenshot` | Screenshot a URL or HTML template — returns the image inline |
| `docapi_check_credits` | Check remaining credits and USDC top-up address |
| `docapi_register_agent` | Register a new agent account programmatically |

Get a free API key at [docapi.co/signup](https://www.docapi.co/signup) — 100 calls/month, no credit card.

---

## Option A: Local (Claude Desktop / Cursor)

**claude_desktop_config.json:**
```json
{
  "mcpServers": {
    "docapi": {
      "command": "npx",
      "args": ["docapi-mcp"],
      "env": {
        "DOCAPI_KEY": "pk_live_..."
      }
    }
  }
}
```

Config file locations:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Cursor:** Add the same JSON block under Settings → MCP Servers.

---

## Option B: Remote (Railway)

Deploy your own instance so any HTTP MCP client can connect.

### 1. Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

Or manually:
```bash
git clone https://github.com/doc-api-llc/docapi-mcp
cd docapi-mcp
railway login
railway init
railway up
```

### 2. Set environment variables in Railway dashboard

| Variable | Value |
|----------|-------|
| `DOCAPI_KEY` | `pk_live_...` (your API key) |
| `TRANSPORT` | `http` |

Railway sets `PORT` automatically.

### 3. Connect your MCP client

Your server URL will be something like:
```
https://docapi-mcp-production.up.railway.app/mcp
```

**Claude Desktop with remote server:**
```json
{
  "mcpServers": {
    "docapi": {
      "url": "https://docapi-mcp-production.up.railway.app/mcp"
    }
  }
}
```

Health check: `GET /health` → `{ "status": "ok" }`

---

## Development

```bash
npm install
npm run build
DOCAPI_KEY=pk_... npm start          # stdio
TRANSPORT=http DOCAPI_KEY=pk_... npm start   # HTTP on :3000
```

Test with MCP Inspector:
```bash
npx @modelcontextprotocol/inspector
```

---

## Tool Reference

### `docapi_generate_pdf`

```json
{
  "html": "<h1>Hello World</h1>",
  "output_path": "/Users/you/report.pdf",
  "format": "A4",
  "landscape": false,
  "margin_inches": 0.5,
  "print_background": true
}
```

Omit `output_path` to get base64 PDF content back (useful for remote HTTP deployments).

### `docapi_capture_screenshot`

```json
{ "url": "https://mysite.com/blog/post", "width": 1200, "height": 630 }
```
```json
{ "html": "<div style='background:#0f172a;color:white;padding:60px'><h1>My Post</h1></div>", "width": 1200, "height": 630 }
```

Returns an inline image you can view directly in Claude.

### `docapi_check_credits`

```json
{}
```

Returns credits remaining and USDC address (agent accounts only).

### `docapi_register_agent`

```json
{ "notify_email": "ops@yourcompany.com" }
```

Returns `api_key`, `usdc_address`, and Python/JS integration snippets.
