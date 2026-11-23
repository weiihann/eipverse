// Tempo: TIPs (Tempo Improvement Proposals) in tempoxyz/tempo/tips/*.md frontmatter.
import { ghList, fetchText, raw, blob, tree, parseFrontmatter, pool, row, sectionText, isoFromUnix, forkStatus } from '../lib/util.js';

const REPO = 'tempoxyz/tempo', REF = 'main', CHAIN = 'Tempo';
// presto = Tempo mainnet: crates/chainspec/src/spec.rs maps "mainnet" and chain id 4217 to PRESTO (built from this
// genesis, follow URL wss://rpc.mainnet.tempo.xyz); Tempo docs list Mainnet chain ID 4217.
const GENESIS = 'crates/chainspec/src/genesis/presto.json';

/** Tempo hardforks `t<N>Time` in a genesis config (skips forks active at genesis). */
export function parseTempoForks(genesis) {
  const cfg = genesis.config || {};
  return Object.entries(cfg)
    .filter(([k, v]) => /^t\d+[a-z]?Time$/.test(k) && Number(v) > 0)
    .map(([k, v]) => ({ name: k.replace(/Time$/, '').toUpperCase(), value: String(v), chainId: cfg.chainId }));
}

export function parseTip(text, path) {
  const fm = parseFrontmatter(text);
  if (!fm?.id) return null;
  return row({
    chain: CHAIN, id: fm.id, title: fm.title, status: fm.status, abstract: fm.description || sectionText(text, ['abstract']),
    target_upgrade: fm.protocolversion && !/^(n\/?a|tbd)$/i.test(fm.protocolversion) ? `protocol version ${fm.protocolversion}` : null,
    dates: [{ label: 'created', value: fm.created }],
    url: blob(REPO, REF, path), type: 'TIP',
  });
}

export default {
  chain: CHAIN,
  sources: [
    { label: 'tempoxyz/tempo tips/*.md frontmatter', url: tree(REPO, REF, 'tips') },
    { label: 'Tempo mainnet genesis hardfork times (presto.json)', url: blob(REPO, REF, GENESIS) },
    { label: 'presto = mainnet: chainspec maps mainnet / 4217 to PRESTO', url: blob(REPO, REF, 'crates/chainspec/src/spec.rs') },
  ],
  async fetch() {
    const files = (await ghList(REPO, 'tips', REF)).filter((f) => /^tip-\d+\.md$/.test(f.name));
    const rows = await pool(files, 16, async (f) => parseTip(await fetchText(raw(REPO, REF, f.path)), f.path));
    const genesis = JSON.parse(await fetchText(raw(REPO, REF, GENESIS)));
    const forks = parseTempoForks(genesis).map((f) => row({
      chain: CHAIN, id: `Tempo:${f.name}`, title: `${f.name} hardfork (Tempo mainnet, chain ${f.chainId})`, status: forkStatus(f.value),
      target_upgrade: `protocol version ${f.name}`, type: 'network upgrade',
      dates: [{ label: 'mainnet activation (UTC)', value: isoFromUnix(f.value) }], url: blob(REPO, REF, GENESIS),
    }));
    // Protocol versions that TIPs target but the mainnet genesis has no time for yet (e.g. a T15 in progress).
    const tips = rows.filter(Boolean);
    const known = new Set(forks.map((f) => f.target_upgrade));
    const pending = [...new Set(tips.map((t) => t.target_upgrade).filter((v) => /^protocol version T\d+[A-Z]?$/.test(v || '') && !known.has(v) && !/ T0$/.test(v)))].map((v) => {
      const meta = tips.find((t) => t.target_upgrade === v && /hardfork meta/i.test(t.title || ''));
      return row({
        chain: CHAIN, id: `Tempo:${v.replace('protocol version ', '')}`, title: `${v.replace('protocol version ', '')} hardfork (targeted by TIPs; not in mainnet genesis)`,
        status: 'no mainnet time in genesis', target_upgrade: v, type: 'network upgrade', url: meta?.url || blob(REPO, REF, GENESIS),
      });
    });
    return { proposals: [...tips, ...forks, ...pending], notes: ['TIP frontmatter has no dates. Hardfork times come from the mainnet genesis (presto.json, chain 4217; confirmed mainnet in chainspec/src/spec.rs and docs.tempo.xyz connection details); versions TIPs target without a genesis time are listed as pending.'] };
  },
};
