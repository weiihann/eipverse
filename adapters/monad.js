// Monad: MIPs (Monad Improvement Proposals) in monad-crypto/MIPs/MIPs/*.md frontmatter.
import { ghList, fetchText, raw, blob, tree, parseFrontmatter, pool, row, isoFromUnix, forkStatus } from '../lib/util.js';

const REPO = 'monad-crypto/MIPs', REF = 'main', CHAIN = 'Monad';
const BFT = 'category-labs/monad-bft', BFT_REF = 'master', CFG = 'monad-chain-config/src/lib.rs';

/** Mainnet revision activations in MONAD_MAINNET_CHAIN_CONFIG: consensus by round, execution by timestamp. */
export function parseMonadMainnet(src) {
  const start = src.indexOf('const MONAD_MAINNET_CHAIN_CONFIG');
  if (start < 0) return [];
  const body = src.slice(start, src.indexOf('\n};', start));
  const out = [];
  for (const m of body.matchAll(/^\s*(v_[\d_]+|execution_v_\w+?)_activation:\s*(?:Round\(([\d_]+)\)|([\d_]+)|Round::MIN),?\s*(?:\/\/\s*(.*))?$/gm)) {
    const round = m[2]?.replace(/_/g, ''), ts = m[3]?.replace(/_/g, '');
    if (!round && (!ts || ts === '0')) continue; // active from genesis
    const name = m[1].startsWith('execution') ? `Execution ${m[1].replace('execution_', '').replace(/_/g, ' ')}` : `Consensus ${m[1].replace(/^v_/, 'v').replace(/_/g, '.')}`;
    out.push({ name, round, ts, comment: m[4]?.trim() || null });
  }
  return out;
}


export function parseMip(text, path) {
  const fm = parseFrontmatter(text);
  if (!fm?.mip) return null;
  const mrc = /^MRCs\//.test(path);
  return row({
    chain: CHAIN, id: `${mrc ? 'MRC' : 'MIP'}-${fm.mip}`, kind: mrc ? 'app standard' : 'protocol', title: fm.title, status: fm.status,
    target_upgrade: fm['network-upgrade'] || fm.upgrade || fm.fork || null,
    type: [fm.type, fm.category].filter(Boolean).join(' / ') || 'MIP',
    dates: [{ label: 'created', value: fm.created }],
    url: blob(REPO, REF, path),
  });
}

export default {
  chain: CHAIN,
  sources: [
    { label: 'monad-crypto/MIPs MIPs/*.md frontmatter', url: tree(REPO, REF, 'MIPs') },
    { label: 'monad-crypto/MIPs MRCs/*.md frontmatter (app standards)', url: tree(REPO, REF, 'MRCs') },
    { label: 'monad-bft mainnet chain config (revision activations)', url: blob(BFT, BFT_REF, CFG) },
  ],
  async fetch() {
    const files = [...await ghList(REPO, 'MIPs', REF), ...await ghList(REPO, 'MRCs', REF)].filter((f) => /^M(IP|RC)-\d+\.md$/i.test(f.name));
    const rows = await pool(files, 16, async (f) => parseMip(await fetchText(raw(REPO, REF, f.path)), f.path));
    const revs = parseMonadMainnet(await fetchText(raw(BFT, BFT_REF, CFG)));
    const upgrades = revs.map((r) => row({
      chain: CHAIN, id: `Monad:${r.name}`, title: `${r.name} revision (Monad mainnet${r.round ? `, activation round ${Number(r.round).toLocaleString('en-US')}` : ''})`,
      status: r.ts ? forkStatus(r.ts) : null, target_upgrade: r.name, type: 'network upgrade',
      dates: [r.ts ? { label: 'mainnet activation (UTC)', value: isoFromUnix(r.ts) } : { label: 'activation (source comment)', value: r.comment }],
      url: blob(BFT, BFT_REF, CFG),
    }));
    return { proposals: [...rows.filter(Boolean), ...upgrades], notes: ['Consensus revisions activate by round; dates shown are the source code comments (some marked "Approx").'] };
  },
};
