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

## Connect (Claude Desktop / Cursor)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "docapi": {
      "url": "https://mcp.docapi.co/mcp",
      "headers": {
        "x-api-key": "pk_live_your_key_here"
      }
    }
  }
}
```

Config file locations:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Cursor:** Settings → MCP Servers → add the same block.

---

## Tool Reference

### `docapi_generate_pdf`

```json
{
  "html": "<h1 style='font-family:sans-serif'>Hello World</h1>",
  "format": "A4",
  "landscape": false,
  "margin_inches": 0.5,
  "print_background": true
}
```

Returns base64-encoded PDF. Ask Claude to save it to a file path on your machine.

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

Returns `api_key`, `usdc_address`, and Python/JS integration snippets with the credit monitoring loop.

---

## Self-hosting

The server is deployed at `https://mcp.docapi.co` — no setup needed for most users.

To run your own instance:

```bash
git clone https://github.com/doc-api-llc/docapi-mcp
cd docapi-mcp
npm install && npm run build
PORT=3000 node dist/index.js   # HTTP (default)
TRANSPORT=stdio DOCAPI_KEY=pk_... node dist/index.js   # stdio
```

Deploy to Railway: set no env vars — each user authenticates with their own `x-api-key` header.

Health check: `GET /health` → `{ "status": "ok" }`
