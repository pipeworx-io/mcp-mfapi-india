interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * MFAPI.in MCP — Indian mutual-fund NAV (net asset value) data.
 *
 * Keyless access to daily NAVs and full NAV history for ~16,000 Indian mutual
 * fund schemes (AMFI data). Search schemes by fund name to get a scheme code,
 * then pull latest NAV or full history. Source: https://www.mfapi.in. Keyless.
 */


const BASE = 'https://api.mfapi.in';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

/** Parse a NAV string ("103.21620", "N/A", "") into a number or null. */
function num(s: unknown): number | null {
  if (typeof s === 'number') return Number.isFinite(s) ? s : null;
  if (typeof s !== 'string') return null;
  const t = s.trim();
  if (!t || t.toUpperCase() === 'N/A') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Validate that a value is a positive integer scheme code. */
function validCode(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.trim()) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function mfGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (res.status === 404) return { __notfound: true };
  if (!res.ok) return { __error: `mfapi.in: ${res.status} ${(await res.text()).slice(0, 200)}` };
  return res.json();
}

const tools: McpToolExport['tools'] = [
  {
    name: 'search_schemes',
    description:
      'Find Indian mutual-fund scheme codes by fund name. Fetches the full MFAPI scheme list (~16,000 schemes) and filters client-side by a case-insensitive substring match on the scheme name. This is the way to obtain a scheme_code for get_nav_history and latest_nav. Note: this call downloads the full list (~1-2MB). Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Fund-name fragment, e.g. "SBI Bluechip", "Parag Parikh", "index fund". Matched case-insensitively against scheme names.',
        },
        limit: { type: 'number', description: 'Max schemes to return (default 15, max 30).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_nav_history',
    description:
      'Get a mutual-fund scheme\'s NAV (net asset value) history from MFAPI — fund house, category, ISIN, latest NAV, and the most-recent NAV points (newest first). Use search_schemes to find a scheme_code first (e.g. 118550). Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        scheme_code: { type: 'number', description: 'AMFI scheme code, e.g. 118550. Get one from search_schemes.' },
        limit: { type: 'number', description: 'Number of most-recent NAV points to return (default 30, max 120).' },
      },
      required: ['scheme_code'],
    },
  },
  {
    name: 'latest_nav',
    description:
      'Fast single-value lookup of a mutual-fund scheme\'s latest NAV (net asset value) from MFAPI. Returns the most recent NAV, its date, and basic scheme metadata. Use search_schemes to find a scheme_code first (e.g. 118550). Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        scheme_code: { type: 'number', description: 'AMFI scheme code, e.g. 118550. Get one from search_schemes.' },
      },
      required: ['scheme_code'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'search_schemes':
        return searchSchemes(args);
      case 'get_nav_history':
        return getNavHistory(args);
      case 'latest_nav':
        return latestNav(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function searchSchemes(args: Record<string, unknown>): Promise<unknown> {
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  if (!query) return { error: 'provide a query (fund-name fragment)', query: args.query ?? null };
  let limit = typeof args.limit === 'number' ? Math.floor(args.limit) : 15;
  if (!Number.isFinite(limit) || limit < 1) limit = 15;
  if (limit > 30) limit = 30;

  const data = await mfGet('/mf');
  if ((data as Record<string, unknown>)?.__error) return { error: (data as Record<string, unknown>).__error };
  const list = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];

  const q = query.toLowerCase();
  const matches = list.filter((s) => String(s.schemeName ?? '').toLowerCase().includes(q));

  return {
    total_matches: matches.length,
    count: Math.min(matches.length, limit),
    schemes: matches.slice(0, limit).map((s) => ({
      scheme_code: s.schemeCode,
      scheme_name: s.schemeName,
    })),
  };
}

async function getNavHistory(args: Record<string, unknown>): Promise<unknown> {
  const code = validCode(args.scheme_code);
  if (code === null) return { error: 'scheme_code must be a positive integer', scheme_code: args.scheme_code ?? null };
  let limit = typeof args.limit === 'number' ? Math.floor(args.limit) : 30;
  if (!Number.isFinite(limit) || limit < 1) limit = 30;
  if (limit > 120) limit = 120;

  const resp = await mfGet(`/mf/${code}`);
  if ((resp as Record<string, unknown>)?.__notfound) return { error: 'scheme not found', scheme_code: code };
  if ((resp as Record<string, unknown>)?.__error) return { error: (resp as Record<string, unknown>).__error };

  const r = resp as Record<string, unknown>;
  const meta = (r.meta as Record<string, unknown>) ?? {};
  const data = Array.isArray(r.data) ? (r.data as Array<Record<string, unknown>>) : [];
  const latest = data[0] ?? {};

  return {
    scheme_code: code,
    fund_house: meta.fund_house ?? null,
    scheme_name: meta.scheme_name ?? null,
    category: meta.scheme_category ?? null,
    type: meta.scheme_type ?? null,
    isin: meta.isin_growth ?? null,
    latest_nav: num(latest.nav),
    latest_date: latest.date ?? null,
    count: Math.min(data.length, limit),
    nav_history: data.slice(0, limit).map((d) => ({ date: d.date, nav: num(d.nav) })),
  };
}

async function latestNav(args: Record<string, unknown>): Promise<unknown> {
  const code = validCode(args.scheme_code);
  if (code === null) return { error: 'scheme_code must be a positive integer', scheme_code: args.scheme_code ?? null };

  const resp = await mfGet(`/mf/${code}/latest`);
  if ((resp as Record<string, unknown>)?.__notfound) return { error: 'scheme not found', scheme_code: code };
  if ((resp as Record<string, unknown>)?.__error) return { error: (resp as Record<string, unknown>).__error };

  const r = resp as Record<string, unknown>;
  const meta = (r.meta as Record<string, unknown>) ?? {};
  const data = Array.isArray(r.data) ? (r.data as Array<Record<string, unknown>>) : [];
  const latest = data[0] ?? {};

  return {
    scheme_code: code,
    scheme_name: meta.scheme_name ?? null,
    fund_house: meta.fund_house ?? null,
    category: meta.scheme_category ?? null,
    nav: num(latest.nav),
    date: latest.date ?? null,
    isin: meta.isin_growth ?? null,
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
