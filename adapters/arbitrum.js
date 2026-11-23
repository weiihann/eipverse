// Arbitrum: ArbOS upgrade release pages (OffchainLabs/arbitrum-docs) and AIP votes on the
// Arbitrum DAO Snapshot space (arbitrumfoundation.eth, public GraphQL hub).
import { ghList, fetchText, fetchJson, raw, blob, tree, parseFrontmatter, pool, row } from '../lib/util.js';

const CHAIN = 'Arbitrum';
const DOCS = 'OffchainLabs/arbitrum-docs', DOCS_REF = 'master', DIR = 'content/docs/run-a-node/arbos-releases';
const SPACE = 'arbitrumfoundation.eth';

/** Parse an ArbOS release page: title from frontmatter, activation date only if the page states one. */
export function parseArbosPage(text, path) {
  const fm = parseFrontmatter(text) || {};
  if (!/ArbOS/i.test(fm.title || '')) return null;
  const name = fm.title;
  const act = (/activates on Arbitrum One[^*]*\*\*([^*]+)\*\*/i.exec(text) || /\bactivated on \[?([A-Z][a-z]+ \d{1,2}, \d{4})/.exec(text))?.[1]?.trim() || null;
  return row({
    chain: CHAIN, id: name.replace(/\s+/g, ' '), title: `${name} (ArbOS upgrade)`, status: null,
    target_upgrade: name, type: 'network upgrade (ArbOS)',
    dates: [{ label: 'Arbitrum One activation (as stated)', value: act }], url: blob(DOCS, DOCS_REF, path),
  });
}

export function snapshotRow(p) {
  const d = (s) => (s ? new Date(s * 1000).toISOString().slice(0, 10) : null);
  return row({
    chain: CHAIN, id: `snapshot:${p.id.slice(0, 10)}`, title: p.title, status: `Snapshot ${p.state}`,
    target_upgrade: /\bArbOS\s+(\d+)/i.exec(p.title) ? `ArbOS ${/\bArbOS\s+(\d+)/i.exec(p.title)[1]}` : null,
    type: 'AIP (Snapshot vote)', dates: [{ label: 'vote start', value: d(p.start) }, { label: 'vote end', value: d(p.end) }],
    url: `https://snapshot.box/#/s:${SPACE}/proposal/${p.id}`,
  });
}

export default {
  chain: CHAIN,
  sources: [
    { label: 'ArbOS release pages (OffchainLabs/arbitrum-docs)', url: tree(DOCS, DOCS_REF, DIR) },
    { label: `Snapshot space ${SPACE} (proposals with "AIP" in title)`, url: `https://snapshot.box/#/s:${SPACE}` },
  ],
  async fetch() {
    const files = (await ghList(DOCS, DIR, DOCS_REF)).filter((f) => /^arbos\d+\.mdx$/.test(f.name));
    const arbos = (await pool(files, 8, async (f) => parseArbosPage(await fetchText(raw(DOCS, DOCS_REF, f.path)), f.path))).filter(Boolean);
    const query = `{ proposals(first: 1000, where: {space: "${SPACE}"}, orderBy: "created", orderDirection: desc) { id title state start end } }`;
    const res = await fetchJson('https://hub.snapshot.org/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
    const aips = (res.data?.proposals || []).filter((p) => /\bAIP\b/i.test(p.title)).map(snapshotRow);
    return {
      proposals: [...arbos, ...aips],
      notes: ['On-chain AIP results (Tally) need an API key and are not included; Snapshot rows are off-chain temperature checks.', 'ArbOS pages state no status field; status left blank.'],
    };
  },
};
