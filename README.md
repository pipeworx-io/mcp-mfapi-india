# mcp-mfapi-india

MFAPI.in MCP — Indian mutual-fund NAV (net asset value) data.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_schemes` | Find Indian mutual-fund scheme codes by fund name. Fetches the full MFAPI scheme list (~16,000 schemes) and filters client-side by case-insensitive token match (every word in the query must appear in the scheme name, any order — so "SBI Bluechip" matches "SBI Blue Chip Fund"). This is the way to obtain a scheme_code for get_nav_history and latest_nav. Note: this call downloads the full list (~1-2MB). Keyless. |
| `get_nav_history` | Get a mutual-fund scheme's NAV (net asset value) history from MFAPI — fund house, category, ISIN, latest NAV, and the most-recent NAV points (newest first). Use search_schemes to find a scheme_code first (e.g. 118550). Keyless. |
| `latest_nav` | Fast single-value lookup of a mutual-fund scheme's latest NAV (net asset value) from MFAPI. Returns the most recent NAV, its date, and basic scheme metadata. Use search_schemes to find a scheme_code first (e.g. 118550). Keyless. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "mfapi-india": {
      "url": "https://gateway.pipeworx.io/mfapi-india/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Mfapi India data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
