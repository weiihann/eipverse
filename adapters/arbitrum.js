// Arbitrum: network upgrades from the Arbitrum Foundation's official "Network upgrades" table
// (ArbitrumFoundation/docs content/docs/network-upgrades.mdx, rendered at docs.arbitrum.foundation/network-upgrades)
// and AIP votes on the Arbitrum DAO Snapshot space (arbitrumfoundation.eth, public GraphQL hub).
import { fetchText, fetchJson, raw, blob, row, sectionText, firstParagraph } from '../lib/util.js';

const CHAIN = 'Arbitrum';
const DOCS = 'ArbitrumFoundation/docs', DOCS_REF = 'main', PAGE = 'content/docs/network-upgrades.mdx';
const PAGE_URL = 'https://docs.arbitrum.foundation/network-upgrades';
const SPACE = 'arbitrumfoundation.eth';

/** "Thu, 2026-08-20 at 05:08:23 PM UTC" / "Tues, 2024-09-03 at 17:00:00 UTC" -> ISO UTC; "N/A" -> null. */
export function parseTableDate(cell) {
  const m = /(\d{4}-\d{2}-\d{2})(?:\s+(?:at\s+)?(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i.exec(cell || '');
  if (!m) return null;
  if (!m[2]) return m[1];
  let h = Number(m[2]);
  if (m[5]) h = (h % 12) + (/pm/i.test(m[5]) ? 12 : 0);
  return `${m[1]}T${String(h).padStart(2, '0')}:${m[3]}:${m[4] || '00'}Z`;
}

const text = (cell) => cell.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim();
const link = (cell) => /\]\(([^)]+)\)/.exec(cell)?.[1] || null;

/** Rows of the "Network activation statuses" table. */
export function parseUpgradeTable(md) {
  const out = [];
  for (const line of md.split('\n')) {
    if (!/^\|/.test(line) || /^\|\s*-/.test(line)) continue;
    const c = line.split('|').slice(1, -1);
    if (c.length < 6 || /^\s*Upgrade\s*$/.test(c[0])) continue;
    out.push({
      name: text(c[0]), docs: link(c[0]), governance: text(c[1]), stage: text(c[2]) === 'N/A' ? null : text(c[2]), stageUrl: link(c[2]),
      sepolia: parseTableDate(c[3]), one: parseTableDate(c[4]), nova: parseTableDate(c[5]),
    });
  }
  return out;
}

export function upgradeRow(u) {
  return row({
    chain: CHAIN, id: u.name, title: `${u.name} (network upgrade)`, target_upgrade: u.name, type: 'network upgrade (ArbOS)',
    status: u.one || u.nova ? u.governance : `${u.governance}; Sepolia only (Arbitrum One/Nova: N/A)`,
    dates: [{ label: 'Arbitrum One activation', value: u.one }, { label: 'Arbitrum Nova', value: u.nova }, { label: 'Arbitrum Sepolia (testnet)', value: u.sepolia }],
    url: u.docs || PAGE_URL,
  });
}

/** Snapshot vote row. Target upgrade only when the official table links this exact vote. */
export function snapshotRow(p, linked = new Map()) {
  const d = (s) => (s ? new Date(s * 1000).toISOString().slice(0, 10) : null);
  return row({
    chain: CHAIN, id: `snapshot:${p.id.slice(0, 10)}`, title: p.title, status: `Snapshot ${p.state}`,
    target_upgrade: linked.get(p.id.toLowerCase()) || null,
    abstract: sectionText(p.body, ['abstract', 'summary', 'executive summary', 'tl;dr', 'tldr']) || firstParagraph(p.body),
    type: 'AIP (Snapshot vote)', dates: [{ label: 'vote start', value: d(p.start) }, { label: 'vote end', value: d(p.end) }],
    url: `https://snapshot.box/#/s:${SPACE}/proposal/${p.id}`,
  });
}

export default {
  chain: CHAIN,
  sources: [
    { label: 'Arbitrum Foundation network upgrades table (ArbitrumFoundation/docs)', url: blob(DOCS, DOCS_REF, PAGE) },
    { label: `Snapshot space ${SPACE} (proposals with "AIP" in title)`, url: `https://snapshot.box/#/s:${SPACE}` },
  ],
  async fetch() {
    const ups = parseUpgradeTable(await fetchText(raw(DOCS, DOCS_REF, PAGE)));
    const linked = new Map(ups.filter((u) => /snapshot\.box/.test(u.stageUrl || '')).map((u) => [u.stageUrl.split('/proposal/')[1].toLowerCase(), u.name]));
    const query = `{ proposals(first: 1000, where: {space: "${SPACE}"}, orderBy: "created", orderDirection: desc) { id title state start end body } }`;
    const res = await fetchJson('https://hub.snapshot.org/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
    const aips = (res.data?.proposals || []).filter((p) => /\bAIP\b/i.test(p.title)).map((p) => snapshotRow(p, linked));
    return {
      proposals: [...ups.map(upgradeRow), ...aips],
      notes: [
        'Upgrade status and dates come from the official table; Snapshot votes get a target upgrade only when that table links the vote.',
        'On-chain AIP results (Tally) need an API key and are not included; Snapshot rows are off-chain temperature checks.',
      ],
    };
  },
};
