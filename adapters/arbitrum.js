// Arbitrum: network upgrades from the Arbitrum Foundation's official "Network upgrades" table
// (ArbitrumFoundation/docs content/docs/network-upgrades.mdx, rendered at docs.arbitrum.foundation/network-upgrades)
// and the DAO proposal pipeline: forum drafts (forum.arbitrum.foundation "Proposals" category, public Discourse JSON),
// AIP votes on the Snapshot space arbitrumfoundation.eth (public GraphQL hub), and on-chain votes on the Core and
// Treasury Governors (addresses from the Foundation's deployment-addresses page), read from the public Arbitrum One RPC.
import { fetchText, fetchJson, raw, blob, row, sectionText, firstParagraph, htmlToText, pool } from '../lib/util.js';

const CHAIN = 'Arbitrum';
const DOCS = 'ArbitrumFoundation/docs', DOCS_REF = 'main', PAGE = 'content/docs/network-upgrades.mdx';
const PAGE_URL = 'https://docs.arbitrum.foundation/network-upgrades';
const SPACE = 'arbitrumfoundation.eth';
const FORUM = 'https://forum.arbitrum.foundation', FORUM_CAT = 'proposals/7';
const RPC = 'https://arb1.arbitrum.io/rpc';
// ArbitrumFoundation/docs content/docs/(governance-architecture)/deployment-addresses.mdx
const GOVERNORS = { '0xf07ded9dc292157749b6fd268e37df6ea38395b9': 'Core Governor', '0x789fc99093b09ad01c34dc7251d0c89ce743e5a4': 'Treasury Governor' };
const PROPOSAL_CREATED = '0x7d84a6263ae0d98d3329bd7b46bb4e8d6f98cd35a7adb45c274c8b7fd5ebd5e0';
// OpenZeppelin Governor ProposalState enum.
const GOV_STATE = ['pending', 'active', 'canceled', 'defeated', 'succeeded', 'queued', 'expired', 'executed'];
// The RPC allows 100k-block log queries; ~14M blocks is roughly the last 40 days at Arbitrum's block rate,
// which covers every proposal that can still be pending, active, succeeded or queued (3d delay + 14-16d vote + timelock).
const SCAN_BLOCKS = 14_000_000, CHUNK = 100_000;

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

/** ABI-decode the non-indexed ProposalCreated data: id (word 0), description (dynamic string at word 8). */
export function decodeProposalCreated(data) {
  const hex = data.replace(/^0x/, '');
  const word = (i) => BigInt('0x' + hex.slice(i * 64, i * 64 + 64));
  const off = Number(word(8)) * 2, len = Number(BigInt('0x' + hex.slice(off, off + 64)));
  const desc = Buffer.from(hex.slice(off + 64, off + 64 + len * 2), 'hex').toString('utf8');
  return { id: word(0).toString(), description: desc };
}

/** First markdown heading (or line) of a governor description is the proposal title. */
export const descTitle = (d) => (d.split('\n').map((l) => l.trim()).find(Boolean) || '').replace(/^#+\s*/, '').trim();

export function onchainRow(p) {
  return row({
    chain: CHAIN, id: `onchain:${p.id.slice(0, 10)}`, title: descTitle(p.description), status: `on-chain ${p.state} (${p.governor})`,
    abstract: sectionText(p.description, ['abstract', 'summary', 'executive summary', 'tl;dr', 'tldr']) || firstParagraph(p.description.split('\n').slice(1).join('\n')),
    type: `AIP (on-chain, ${p.governor})`, dates: [{ label: 'proposed on-chain', value: p.date }],
    url: `https://www.tally.xyz/gov/arbitrum/proposal/${p.id}`,
  });
}

export function forumRow(t, cooked = '') {
  return row({
    chain: CHAIN, id: `forum:${t.id}`, title: t.title, status: 'forum post',
    abstract: sectionText(htmlToText(cooked), ['abstract', 'summary', 'executive summary', 'tl;dr', 'tldr', 'motivation']) || firstParagraph(htmlToText(cooked)),
    type: 'AIP draft (forum)', dates: [{ label: 'posted', value: t.created_at?.slice(0, 10) }, { label: 'last activity', value: t.last_posted_at?.slice(0, 10) }],
    url: `${FORUM}/t/${t.slug}/${t.id}`,
  });
}

/** Same proposal across stages: compare titles without [Constitutional]/AIP prefixes, case and punctuation. */
export const titleKey = (t = '') => t.toLowerCase().replace(/\[[^\]]*\]/g, ' ').replace(/\baip\b\s*[:-]?/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/** Fold later stages into one row per proposal: on-chain > Snapshot > forum decides status and link; dates merge. */
export function mergeStages(forum, snapshot, onchain) {
  const byKey = new Map();
  const out = [];
  for (const r of [...forum, ...snapshot, ...onchain]) {
    const k = titleKey(r.title);
    const prev = k && byKey.get(k);
    if (!prev) { byKey.set(k, r); out.push(r); continue; }
    prev.dates = [...prev.dates, ...r.dates];
    prev.status = r.status; prev.url = r.url; prev.type = r.type;
    prev.abstract = prev.abstract || r.abstract;
    prev.target_upgrade = prev.target_upgrade || r.target_upgrade;
    if (/^forum:/.test(prev.id)) prev.id = r.id;
  }
  return out;
}

/** A proposal whose title is exactly an upgrade in the official table ("AIP: ArbOS 61 Elara") takes that upgrade as its
 *  target, and a forum-only row takes the table's governance status (the forum post itself states none). */
export function linkUpgrades(rows, ups) {
  const names = new Map(ups.map((u) => [titleKey(u.name), u]));
  for (const r of rows) {
    const u = names.get(titleKey(r.title));
    if (!u) continue;
    r.target_upgrade = r.target_upgrade || u.name;
    if (r.status === 'forum post') r.status = `${u.governance} (per upgrades table)`;
  }
  return rows;
}

async function rpc(method, params) {
  const r = await fetchJson(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  if (r.error) throw new Error(`${method}: ${r.error.message}`);
  return r.result;
}

async function onchainProposals() {
  const head = parseInt(await rpc('eth_blockNumber', []), 16);
  const ranges = [];
  for (let from = head - SCAN_BLOCKS; from <= head; from += CHUNK) ranges.push([from, Math.min(from + CHUNK - 1, head)]);
  const logs = (await pool(ranges, 8, ([a, b]) => rpc('eth_getLogs', [{ fromBlock: '0x' + a.toString(16), toBlock: '0x' + b.toString(16), address: Object.keys(GOVERNORS), topics: [PROPOSAL_CREATED] }]))).flat();
  return pool(logs, 8, async (l) => {
    const p = decodeProposalCreated(l.data);
    const idHex = BigInt(p.id).toString(16).padStart(64, '0');
    const st = parseInt(await rpc('eth_call', [{ to: l.address, data: '0x3e4f49e6' + idHex }, 'latest']), 16);
    const blk = await rpc('eth_getBlockByNumber', [l.blockNumber, false]);
    return { ...p, governor: GOVERNORS[l.address.toLowerCase()], state: GOV_STATE[st] || `state ${st}`, date: new Date(parseInt(blk.timestamp, 16) * 1000).toISOString().slice(0, 10) };
  });
}

async function forumTopics() {
  const topics = [];
  for (let page = 0; page < 20; page++) {
    const d = await fetchJson(`${FORUM}/c/${FORUM_CAT}.json?page=${page}`);
    const list = d.topic_list?.topics || [];
    topics.push(...list.filter((t) => !t.pinned && !/^about the /i.test(t.title)));
    if (!d.topic_list?.more_topics_url || !list.length) break;
  }
  return pool(topics, 6, async (t) => {
    let cooked = '';
    try { cooked = (await fetchJson(`${FORUM}/t/${t.id}.json`)).post_stream?.posts?.[0]?.cooked || ''; } catch { /* abstract stays empty */ }
    return forumRow(t, cooked);
  });
}

export default {
  chain: CHAIN,
  sources: [
    { label: 'Arbitrum Foundation network upgrades table (ArbitrumFoundation/docs)', url: blob(DOCS, DOCS_REF, PAGE) },
    { label: 'Arbitrum DAO forum, Proposals category (Discourse JSON)', url: `${FORUM}/c/${FORUM_CAT}` },
    { label: `Snapshot space ${SPACE} (proposals with "AIP" in title)`, url: `https://snapshot.box/#/s:${SPACE}` },
    { label: 'Core and Treasury Governor ProposalCreated events + state() via the Arbitrum One public RPC', url: 'https://docs.arbitrum.foundation/deployment-addresses' },
  ],
  async fetch() {
    const ups = parseUpgradeTable(await fetchText(raw(DOCS, DOCS_REF, PAGE)));
    const linked = new Map(ups.filter((u) => /snapshot\.box/.test(u.stageUrl || '')).map((u) => [u.stageUrl.split('/proposal/')[1].toLowerCase(), u.name]));
    // Bodies are large: filter server-side on the title and page in 100s so the hub doesn't time out.
    const votes = [], notes = [];
    try {
      for (let skip = 0; ; skip += 100) {
        const query = `{ proposals(first: 100, skip: ${skip}, where: {space: "${SPACE}", title_contains: "AIP"}, orderBy: "created", orderDirection: desc) { id title state start end body } }`;
        const res = await fetchJson('https://hub.snapshot.org/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
        const page = res.data?.proposals || [];
        votes.push(...page);
        if (page.length < 100) break;
      }
    } catch (e) {
      notes.push(`Snapshot votes not included in this build: ${e.message}`);
    }
    const aips = votes.filter((p) => /\bAIP\b/i.test(p.title)).map((p) => snapshotRow(p, linked));
    let forum = [], onchain = [];
    try { forum = await forumTopics(); } catch (e) { notes.push(`Forum proposals not included in this build: ${e.message}`); }
    try { onchain = (await onchainProposals()).map(onchainRow); } catch (e) { notes.push(`On-chain governor proposals not included in this build: ${e.message}`); }
    return {
      proposals: [...ups.map(upgradeRow), ...linkUpgrades(mergeStages(forum, aips, onchain), ups)],
      notes: [
        'Upgrade status and dates come from the official table; Snapshot votes get a target upgrade only when that table links the vote.',
        'One row per proposal: a forum draft, its Snapshot temp check and its on-chain vote are joined when their titles match (ignoring [Constitutional]/AIP prefixes); the latest stage sets the status and link.',
        `On-chain proposals are read from the governors' ProposalCreated logs over the last ~${SCAN_BLOCKS / 1e6}M blocks (about 40 days), with live state() from the contract; older on-chain votes are covered by their Snapshot rows. Tally's API needs a key, so links go to the public Tally page.`,
        ...notes,
      ],
    };
  },
};
