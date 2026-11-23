// Gnosis Chain: network upgrades from gnosischain/specs network-upgrades/*.md (included-EIP table + "Upgrade Schedule"
// table), and GIPs (GnosisDAO Improvement Proposals) as votes on the GnosisDAO Snapshot space gnosis.eth.
// Gnosis forks activate Ethereum's EIPs; rows point to the Ethereum EIP rows (refs) instead of copying them.
import { ghList, fetchText, fetchJson, raw, blob, tree, row, sectionText, firstParagraph, forkStatus } from '../lib/util.js';

const CHAIN = 'Gnosis Chain';
const SPECS = 'gnosischain/specs', SPECS_REF = 'master', DIR = 'network-upgrades';
const SPACE = 'gnosis.eth';
const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

const plain = (s) => (s || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*\*|`/g, '').trim();

/** "Apr-30-2025 14:03:40 +UTC" / "Nov-12-2021 09:46:20 PM +UTC" / "Apr-14-2026, 12:06:20 +UTC" -> unix seconds. */
export function parseSpecDate(cell) {
  const m = /([A-Z][a-z]{2})-(\d{1,2})-(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?/.exec(cell || '');
  if (!m || !(m[1] in MON)) return null;
  let h = Number(m[4]);
  if (m[7]) h = (h % 12) + (m[7] === 'PM' ? 12 : 0);
  return String(Date.UTC(+m[3], MON[m[1]], +m[2], h, +m[5], +m[6]) / 1000);
}

/** One network-upgrades/<fork>.md -> { name, refs, metaEip, mainnet, intro, shared }. */
export function parseGnosisUpgrade(md) {
  const name = /^#\s+(?:The\s+)?(.+?)\s+Upgrade Specification/m.exec(md)?.[1]?.trim();
  if (!name) return null;
  const refs = [];
  for (const line of md.split('\n')) {
    const m = /^\|\s*\[(EIP-(\d+)[\w-]*)\]\(https:\/\/eips\.ethereum\.org[^)]*\)(?::\s*([^|]*))?\|(.*)$/.exec(line);
    if (!m) continue;
    const rest = m[4].split('|').map(plain).filter(Boolean);
    const variant = m[1] !== `EIP-${m[2]}` ? `Gnosis variant ${m[1]}` : null;
    refs.push({ chain: 'Ethereum', id: `EIP-${m[2]}`, note: [variant, ...rest].filter(Boolean).join(' · ') || null });
  }
  const metaEip = /\[hard-fork EIP\]\(https:\/\/eips\.ethereum\.org\/EIPS\/eip-(\d+)\)/.exec(md)?.[1] || null;
  const sched = md.split('\n').find((l) => /^\|\s*Mainnet\s*\|/.test(l));
  const mainnet = sched ? parseSpecDate(sched) : null;
  const intro = firstParagraph(md.replace(/^#[^\n]*\n/, ''), 20);
  return { name, refs, metaEip, mainnet, intro, shared: refs.length > 0 };
}

export function upgradeRow(u, path) {
  const refs = u.metaEip ? [{ chain: 'Ethereum', id: `EIP-${u.metaEip}`, note: 'hardfork meta EIP' }, ...u.refs] : u.refs;
  const changed = u.refs.filter((r) => r.note && !/^([^·]*·\s*)?not modifi?ed\b/i.test(r.note)).map((r) => `${r.id} (${r.note})`);
  return row({
    chain: CHAIN, id: `Gnosis:${u.name}`, title: `${u.name} upgrade (Gnosis Chain mainnet)`,
    status: u.mainnet ? forkStatus(u.mainnet) : 'no mainnet time in spec', target_upgrade: u.name, type: 'network upgrade',
    abstract: u.shared ? `Activates the Ethereum ${u.name} EIPs on Gnosis Chain${changed.length ? `; differences: ${changed.join(', ')}` : ', none modified'}.` : u.intro,
    dates: u.mainnet ? [{ label: 'mainnet activation (UTC)', value: new Date(u.mainnet * 1000).toISOString().replace('.000Z', 'Z') }] : [],
    shared_with: u.shared ? 'Ethereum' : null, refs, url: blob(SPECS, SPECS_REF, path),
  });
}

/** Snapshot vote whose title starts "GIP-<n>". Anything else in the space (signals, polls) is skipped. */
export function gipRow(p) {
  const n = /^GIP-(\d+)\b/i.exec(p.title || '')?.[1];
  if (!n) return null;
  const d = (s) => (s ? new Date(s * 1000).toISOString().slice(0, 10) : null);
  return row({
    chain: CHAIN, id: `GIP-${n}`, title: p.title.replace(/^GIP-\d+\s*[:\-–]\s*/i, ''), status: `Snapshot ${p.state}`,
    abstract: sectionText(p.body, ['abstract', 'summary', 'simple summary', 'tl;dr', 'tldr']) || firstParagraph(p.body),
    type: 'GIP (Snapshot vote)', dates: [{ label: 'vote start', value: d(p.start) }, { label: 'vote end', value: d(p.end) }],
    url: `https://snapshot.box/#/s:${SPACE}/proposal/${p.id}`,
  });
}

export default {
  chain: CHAIN,
  sources: [
    { label: 'gnosischain/specs network-upgrades/*.md (included EIPs, mainnet schedule)', url: tree(SPECS, SPECS_REF, DIR) },
    { label: `GnosisDAO Snapshot space ${SPACE} (votes titled "GIP-<n>")`, url: `https://snapshot.box/#/s:${SPACE}` },
  ],
  async fetch() {
    const files = (await ghList(SPECS, DIR, SPECS_REF)).filter((f) => f.name.endsWith('.md'));
    const ups = [];
    for (const f of files) { const u = parseGnosisUpgrade(await fetchText(raw(SPECS, SPECS_REF, f.path))); if (u) ups.push(upgradeRow(u, f.path)); }
    const votes = [], notes = [];
    try {
      for (let skip = 0; ; skip += 100) {
        const query = `{ proposals(first: 100, skip: ${skip}, where: {space: "${SPACE}", title_contains: "GIP"}, orderBy: "created", orderDirection: desc) { id title state start end body } }`;
        const res = await fetchJson('https://hub.snapshot.org/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
        const page = res.data?.proposals || [];
        votes.push(...page);
        if (page.length < 100) break;
      }
    } catch (e) {
      notes.push(`Snapshot votes not included in this build: ${e.message}`);
    }
    // A GIP re-voted keeps its number; the newest vote gets the plain id, earlier ones get the vote id appended.
    const seen = new Set();
    const gips = votes.map(gipRow).filter(Boolean).map((r) => {
      if (seen.has(r.id)) r.id = `${r.id} · ${r.url.split('/proposal/')[1].slice(0, 8)}`;
      seen.add(r.id.split(' · ')[0]);
      return r;
    });
    return {
      proposals: [...ups, ...gips],
      notes: [
        'No GIP repository exists on GitHub (gnosischain/GIPs and gnosis/GIPs return 404). GIPs are GnosisDAO governance (treasury, grants, chain parameters) and are read from Snapshot votes titled "GIP-<n>"; forum.gnosis.io drafts that never reached a vote are not included.',
        'Fork rows marked "shared with Ethereum" list the Ethereum EIPs they activate as links to the Ethereum rows, with Gnosis differences as stated in the spec; the EIPs are not duplicated as Gnosis rows.',
        ...notes,
      ],
    };
  },
};
