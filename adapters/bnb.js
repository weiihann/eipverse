// BNB Chain: BEPs (bnb-chain/BEPs README index + per-BEP preamble) and hard fork
// activation config from the BSC and opBNB clients (mainnet).
import { fetchText, raw, blob, pool, row, sectionText, isoFromUnix, forkStatus } from '../lib/util.js';

const CHAIN = 'BNB Chain';
const BEPS = 'bnb-chain/BEPs', BEPS_REF = 'master';
const BSC = 'bnb-chain/bsc', BSC_REF = 'master', BSC_CFG = 'params/config.go';
const OPBNB = 'bnb-chain/opbnb', OPBNB_REF = 'develop', OPBNB_CFG = 'op-node/chaincfg/chains.go';

/** Parse the README table rows: | [BEP-N](./BEPs/BEPN.md) | Title | Type | Status | */
export function parseBepIndex(md) {
  const out = [];
  for (const line of md.split('\n')) {
    const m = /^\|\s*\[(B[EA]P-\d+)\]\(\.?\/?([^)]+)\)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/.exec(line);
    if (m) out.push({ id: m[1], path: m[2], title: m[3].replace(new RegExp(`^${m[1]}:\\s*`), ''), type: m[4], status: m[5] });
  }
  return out;
}

/** Parse the `<pre> BEP: .. Created: ..</pre>` preamble of a BEP (BAPs use a ``` fence instead). */
export function parseBepPreamble(text) {
  const pre = (/<pre>([\s\S]*?)<\/pre>/i.exec(text) || /^```\s*\n([\s\S]*?)\n```/m.exec(text))?.[1] || '';
  const out = {};
  for (const line of pre.split('\n')) {
    const kv = /^\s*([A-Za-z-]+):\s*(.+?)\s*$/.exec(line);
    if (kv) out[kv[1].toLowerCase()] = kv[2];
  }
  return out;
}

/** Members of a "Hardfork Meta-<Fork>" BEP: top-level `* [BEP-N]` bullets. Returns {fork, members} or null. */
export function parseBepMeta(title, text) {
  const fork = /Hardfork Meta\s*-?\s*(.+)$/i.exec(title || '')?.[1]?.trim();
  if (!fork) return null;
  return { fork, members: [...text.matchAll(/^[*-]\s+\[(BEP-\d+)\]/gm)].map((m) => m[1]) };
}

/** Parse `NameBlock: big.NewInt(N)` / `NameTime: newUint64(N)` / `u64Ptr(N)` / nil inside a Go config block. */
export function parseGoForks(src, startMarker) {
  const start = src.indexOf(startMarker);
  if (start < 0) return [];
  const body = src.slice(start, src.indexOf('\n\t}', start) > 0 ? src.indexOf('\n\t}', start) : undefined);
  const out = [];
  const re = /^\s*(\w+?)(Block|Time):\s*(?:big\.NewInt\((\d+)\)|newUint64\((\d+)\)|u64Ptr\((\d+)\)|(nil)),?[ \t]*(?:\/\/[ \t]*(.*))?$/gm;
  for (let m; (m = re.exec(body));) {
    const v = m[3] ?? m[4] ?? m[5] ?? null;
    if (v === '0') continue; // active at genesis: not an upgrade
    out.push({ name: m[1], by: m[2] === 'Block' ? 'block' : 'time', value: v, skipped: !v && /skipped/i.test(m[7] || '') });
  }
  return out;
}

function forkRows(forks, network, repo, ref, path) {
  return forks.map((f) => row({
    chain: CHAIN, network, id: `${network}:${f.name}`, title: `${f.name} hard fork (${network} mainnet)`,
    status: f.skipped ? 'skipped (per source comment)' : f.by === 'time' ? forkStatus(f.value) : (f.value ? 'activated (block-based)' : 'no mainnet block set'),
    target_upgrade: f.name, type: 'network upgrade',
    dates: f.by === 'time' && f.value ? [{ label: 'mainnet activation (UTC)', value: isoFromUnix(f.value) }] : [],
    url: blob(repo, ref, path) + (f.by === 'block' && f.value ? `#:~:text=${f.name}Block` : ''),
  }));
}

export default {
  chain: CHAIN,
  sources: [
    { label: 'bnb-chain/BEPs README index (BEPs + BAPs) + preambles + Hardfork Meta BEPs', url: blob(BEPS, BEPS_REF, 'README.md') },
    { label: 'BSC mainnet hard fork config (bnb-chain/bsc params/config.go)', url: blob(BSC, BSC_REF, BSC_CFG) },
    { label: 'opBNB mainnet hard fork config (bnb-chain/opbnb chaincfg/chains.go)', url: blob(OPBNB, OPBNB_REF, OPBNB_CFG) },
  ],
  async fetch() {
    const index = parseBepIndex(await fetchText(raw(BEPS, BEPS_REF, 'README.md')));
    const texts = await pool(index, 16, async (b) => fetchText(raw(BEPS, BEPS_REF, b.path)).catch(() => ''));
    const target = new Map(); // BEP id -> fork names from Hardfork Meta BEPs
    index.forEach((b, i) => {
      const meta = parseBepMeta(b.title, texts[i]);
      for (const id of meta ? [b.id, ...meta.members] : []) target.set(id, [...(target.get(id) || []), meta.fork]);
    });
    const beps = index.map((b, i) => row({
      chain: CHAIN, id: b.id, title: b.title, status: b.status, type: `${b.id.slice(0, 3)} / ${b.type}`, kind: b.id.startsWith('BAP') ? 'app standard' : 'protocol', target_upgrade: (target.get(b.id) || []).join('; '),
      abstract: parseBepPreamble(texts[i]).description || sectionText(texts[i], ['summary', 'abstract']),
      dates: [{ label: 'created', value: parseBepPreamble(texts[i]).created }], url: blob(BEPS, BEPS_REF, b.path),
    }));
    const bsc = parseGoForks(await fetchText(raw(BSC, BSC_REF, BSC_CFG)), 'BSCChainConfig = &ChainConfig{');
    const op = parseGoForks(await fetchText(raw(OPBNB, OPBNB_REF, OPBNB_CFG)), 'var OPBNBMainnet = rollup.Config{');
    return {
      proposals: [...beps, ...forkRows(bsc, 'BSC', BSC, BSC_REF, BSC_CFG), ...forkRows(op, 'opBNB', OPBNB, OPBNB_REF, OPBNB_CFG)],
      notes: ['Target upgrade for BEPs comes from Hardfork Meta BEPs (only recent forks have one); hard forks are separate rows from client mainnet configs.'],
    };
  },
};
