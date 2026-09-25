# mcp-mfapi-india

MFAPI.in MCP — Indian mutual-fund NAV (net asset value) data.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1679+ live data sources.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/mfapi-india/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1679+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/search_schemes \
  -H 'Content-Type: application/json' \
  -d '{"query":"SBI Bluechip"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/search_schemes`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Standalone (no gateway account)

This package also runs as a local stdio MCP server — no Pipeworx account, no
gateway round-trip:

```json
{
  "mcpServers": {
    "mfapi-india": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-mfapi-india"]
    }
  }
}
```

Or run it directly to confirm it starts:

```bash
npx -y @pipeworx/mcp-mfapi-india
```

It speaks MCP over stdin/stdout and answers `initialize`/`tools/list`/`tools/call`
for **only** this pack's tools — none of the shared meta-tools the gateway
connection above adds. Same source, same tools, no ask_pipeworx routing.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Mfapi India data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
