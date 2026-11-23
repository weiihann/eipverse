// Polygon PoS: PIPs (and PRCs) in 0xPolygon/Polygon-Improvement-Proposals, plus mainnet hard forks from the
// bor client's chain config (internal/cli/server/chains/mainnet.go). Bor forks are block-based: status comes
// from comparing the configured block with the chain head read from Polygon's public RPC at build time.
import { ghList, fetchText, fetchJson, raw, blob, tree, parseFrontmatter, pool, row, sectionText } from '../lib/util.js';

const CHAIN = 'Polygon PoS';
const PIPS = '0xPolygon/Polygon-Improvement-Proposals', PIPS_REF = 'main';
const BOR = '0xPolygon/bor', BOR_REF = 'develop', CFG = 'internal/cli/server/chains/mainnet.go';
// Head block only. polygon.drpc.org is listed at docs.polygon.technology/pos/reference/rpc-endpoints (polygon-rpc.com
// now needs a key); publicnode (also listed there) is the fallback.
const RPCS = ['https://polygon.drpc.org', 'https://polygon-bor-rpc.publicnode.com'];

export function parsePip(text, path) {
  const fm = parseFrontmatter(text);
  if (!fm?.pip) return null;
  return row({
    chain: CHAIN, id: `PIP-${Number(fm.pip)}`, title: fm.title, status: fm.status, abstract: fm.description || sectionText(text, ['abstract', 'summary']),
    dates: [{ label: 'created', value: fm.date || fm.created }], url: blob(PIPS, PIPS_REF, path), type: fm.type ? `PIP · ${fm.type}` : 'PIP',
  });
}

/** PRC files open with a one-row markdown table (PIP | Title | Description | ... | Status | Type | Category | Created). */
export function parsePrc(text, path) {
  const lines = text.split('\n').filter((l) => /^\|/.test(l));
  if (lines.length < 3) return null;
  const cells = (l) => l.split('|').slice(1, -1).map((c) => c.trim());
  const head = cells(lines[0]).map((h) => h.toLowerCase()), vals = cells(lines[2]);
  const get = (k) => vals[head.indexOf(k)] || null;
  const n = get('pip') || /PRC-(\d+)/.exec(path)?.[1];
  if (!n) return null;
  return row({
    chain: CHAIN, id: `PRC-${Number(n)}`, title: get('title'), status: get('status'), abstract: get('description') || sectionText(text, ['abstract']),
    dates: [{ label: 'created', value: get('created') }], url: blob(PIPS, PIPS_REF, path), type: `PRC${get('type') ? ` · ${get('type')}` : ''}`,
  });
}

/** `<Name>Block: big.NewInt(N)` / `nil` inside a Go config block; also keeps a trailing `// comment`. */
export function parseBorForks(src) {
  const start = src.indexOf('Bor: &params.BorConfig');
  const out = [];
  const re = /^\s*(\w+?)Block:\s*(?:big\.NewInt\((\d+)\)|(nil))\s*,?\s*(?:\/\/\s*(.*))?$/gm;
  for (let m; (m = re.exec(src));) {
    out.push({ name: m[1], block: m[2] || null, comment: m[4]?.trim() || null, scope: start >= 0 && m.index > start ? 'bor' : 'eth' });
  }
  return out.filter((f) => f.block !== '0' && (f.scope === 'bor' || f.block));
}

export function forkRow(f, head) {
  const n = f.block ? Number(f.block) : null;
  const status = !n ? (f.comment ? `${f.comment} (per source comment)` : 'no mainnet block set')
    : head == null ? 'block-based (chain head not checked)' : n <= head ? 'activated (block-based)' : 'scheduled (block-based)';
  return row({
    chain: CHAIN, id: `Polygon:${f.name}`, title: `${f.name} hard fork (Polygon PoS mainnet${n ? `, block ${n.toLocaleString('en-US')}` : ''})`,
    status, target_upgrade: f.name, type: 'network upgrade',
    abstract: f.scope === 'eth' ? `Ethereum ${f.name} rules enabled on Polygon PoS at this block (bor chain config).` : null,
    shared_with: f.scope === 'eth' ? 'Ethereum' : null, refs: f.scope === 'eth' ? [{ chain: 'Ethereum', upgrade: f.name }] : [], url: `${blob(BOR, BOR_REF, CFG)}#:~:text=${f.name}Block`,
  });
}

export default {
  chain: CHAIN,
  sources: [
    { label: '0xPolygon/Polygon-Improvement-Proposals PIPs/*.md frontmatter', url: tree(PIPS, PIPS_REF, 'PIPs') },
    { label: 'PRCs (Polygon Request for Comments) PIPs/PRC/*.md', url: tree(PIPS, PIPS_REF, 'PIPs/PRC') },
    { label: 'bor mainnet chain config (fork blocks, chain 137)', url: blob(BOR, BOR_REF, CFG) },
  ],
  async fetch() {
    const notes = [];
    const pips = (await ghList(PIPS, 'PIPs', PIPS_REF)).filter((f) => /^PIP-\d+\.md$/i.test(f.name));
    const prcs = (await ghList(PIPS, 'PIPs/PRC', PIPS_REF)).filter((f) => /^PRC-\d+\.md$/i.test(f.name));
    const rows = await pool(pips, 16, async (f) => parsePip(await fetchText(raw(PIPS, PIPS_REF, f.path)), f.path));
    const prcRows = await pool(prcs, 4, async (f) => parsePrc(await fetchText(raw(PIPS, PIPS_REF, f.path)), f.path));
    const forks = parseBorForks(await fetchText(raw(BOR, BOR_REF, CFG)));
    let head = null, rpc = null;
    for (const u of RPCS) {
      try {
        const r = await fetchJson(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }) });
        const n = parseInt(r.result, 16);
        if (Number.isFinite(n) && n > 0) { head = n; rpc = u; break; }
      } catch (e) {
        notes.push(`Chain head not read from ${u}: ${e.message}`);
      }
    }
    if (head == null) notes.push('No RPC answered, so fork rows say "chain head not checked".');
    // Ethereum forks in the bor config share a block with a Bor fork when they shipped together (e.g. London at Jaipur).
    const forkRows = forks.map((f) => forkRow(f, head));
    return {
      proposals: [...rows, ...prcRows].filter(Boolean).concat(forkRows),
      notes: [
        `Bor forks activate at block heights, not times, so no activation dates are shown. Activated vs scheduled compares each block with the chain head read at build${head ? ` (block ${head.toLocaleString('en-US')} from ${rpc})` : ''}.`,
        'Ethereum forks enabled by bor (London, Shanghai, Cancun, Prague, ...) are marked "shared with Ethereum" and point to the Ethereum rows rather than copying their EIPs.',
        'PIP frontmatter does not name the hard fork that ships each PIP, so PIP rows have no target upgrade.',
        ...notes,
      ],
    };
  },
};
