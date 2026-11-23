// Optimism / OP Stack: protocol upgrades from ethereum-optimism/specs (SUMMARY "Protocol Upgrades"),
// OP Mainnet activation times from superchain-registry configs/mainnet/op.toml, and governance
// "Upgrade Proposal" topics from the official forum (gov.optimism.io, Discourse JSON API).
import { fetchText, fetchJson, raw, blob, row, isoFromUnix, forkStatus } from '../lib/util.js';

const CHAIN = 'Optimism / OP Stack';
const SPECS = 'ethereum-optimism/specs', SPECS_REF = 'main';
const REG = 'ethereum-optimism/superchain-registry', REG_REF = 'main', REG_PATH = 'superchain/configs/mainnet/op.toml';
const FORUM = 'https://gov.optimism.io';

/** Names + overview paths listed under "Protocol Upgrades" in specs/SUMMARY.md. */
export function parseSpecUpgrades(md) {
  const lines = md.split('\n');
  const i = lines.findIndex((l) => /^\s*-\s*\[Protocol Upgrades\]/.test(l));
  if (i < 0) return [];
  const indent = /^\s*/.exec(lines[i])[0].length;
  const out = [];
  for (const l of lines.slice(i + 1)) {
    const lead = /^\s*/.exec(l)[0].length;
    if (l.trim() && lead <= indent) break;
    const m = /^\s*-\s*\[([^\]]+)\]\(\.\/(protocol\/[^)]+)\)/.exec(l);
    if (m && lead === indent + 2) out.push({ name: m[1], path: `specs/${m[2]}` });
  }
  return out;
}

/** `<fork>_time = <unix>` under [hardforks] in a registry chain toml. */
export function parseSuperchainHardforks(toml) {
  const sec = /^\[hardforks\]\s*$([\s\S]*?)(?=^\[)/m.exec(toml)?.[1] || '';
  const out = {};
  for (const m of sec.matchAll(/^\s*(\w+)_time\s*=\s*(\d+)/gm)) out[m[1].toLowerCase()] = m[2];
  return out;
}

/** Forum topic titles that are upgrade proposals; status only if the title states one, e.g. "[FINAL]",
 *  target upgrade only if the title names a spec'd upgrade, e.g. "Upgrade Proposal #10: Granite Network Upgrade". */
export function forumRow(t, upgradeNames = []) {
  const tag = /^\[([^\]]+)\]/.exec(t.title)?.[1];
  return row({
    chain: CHAIN, id: `forum:${t.id}`, title: t.title, status: tag ? `${tag} (per title)` : 'forum post',
    target_upgrade: upgradeNames.find((n) => new RegExp(`\\b${n}\\b`, 'i').test(t.title)),
    type: 'governance upgrade proposal (forum)', dates: [{ label: 'posted', value: t.created_at?.slice(0, 10) }],
    url: `${FORUM}/t/${t.slug}/${t.id}`,
  });
}

export default {
  chain: CHAIN,
  sources: [
    { label: 'OP Stack specs: Protocol Upgrades (specs/SUMMARY.md)', url: blob(SPECS, SPECS_REF, 'specs/SUMMARY.md') },
    { label: 'superchain-registry OP Mainnet hardfork times (op.toml)', url: blob(REG, REG_REF, REG_PATH) },
    { label: 'gov.optimism.io forum search: "Upgrade Proposal" in title', url: `${FORUM}/search?q=%22Upgrade%20Proposal%22%20in%3Atitle` },
  ],
  async fetch() {
    const ups = parseSpecUpgrades(await fetchText(raw(SPECS, SPECS_REF, 'specs/SUMMARY.md')));
    const times = parseSuperchainHardforks(await fetchText(raw(REG, REG_REF, REG_PATH)));
    const timeOf = (u) => times[u.name.toLowerCase().replace(/\s+/g, '_')];
    const lastActivated = ups.findLastIndex((u) => timeOf(u) && forkStatus(timeOf(u)) === 'activated');
    const forks = ups.map((u, i) => {
      const t = timeOf(u);
      const untimed = i < lastActivated ? 'no OP Mainnet time in registry (later upgrades activated)' : 'specified; no OP Mainnet time in registry';
      return row({
        chain: CHAIN, id: `OP:${u.name}`, title: `${u.name} network upgrade (OP Mainnet)`,
        status: t ? forkStatus(t) : untimed, target_upgrade: u.name, type: 'network upgrade',
        dates: t ? [{ label: 'mainnet activation (UTC)', value: isoFromUnix(t) }] : [], url: blob(SPECS, SPECS_REF, u.path),
      });
    });
    const topics = new Map();
    for (let page = 1; page <= 4; page++) {
      const q = encodeURIComponent('"Upgrade Proposal" in:title order:latest');
      const d = await fetchJson(`${FORUM}/search.json?q=${q}&page=${page}`, { headers: { accept: 'application/json' } });
      const ts = d.topics || [];
      for (const t of ts) if (/upgrade\s+(#?\d+\w?\s+)?proposal/i.test(t.title) && !/template|request for comment/i.test(t.title)) topics.set(t.id, t);
      if (!d.grouped_search_result?.more_full_page_results || !ts.length) break;
    }
    return {
      proposals: [...forks, ...[...topics.values()].map((t) => forumRow(t, ups.map((u) => u.name)))],
      notes: ['Forum topics do not carry a vote outcome; final votes are on Agora (API key required, not used).', 'Hardfork status is activated/scheduled by comparing the registry timestamp with build time.'],
    };
  },
};
