// Base: network upgrades and mainnet activation timestamps from the Base client (base/base).
import { fetchText, raw, blob, row, isoFromUnix, forkStatus } from '../lib/util.js';

const REPO = 'base/base', REF = 'main', PATH = 'crates/common/chains/src/config.rs', CHAIN = 'Base';

/** Parse `<name>_timestamp: 1_234 | Some(1_234) | None` inside `const MAINNET: ChainConfig = ChainConfig {`,
 *  plus the field's doc comment (e.g. "(optional, sepolia-only)"). */
export function parseBaseMainnet(src) {
  const docs = Object.fromEntries([...src.matchAll(/\/\/\/\s*(.+)\n\s*pub (\w+?)_timestamp:/g)].map((m) => [m[2], m[1]]));
  const start = src.indexOf('const MAINNET: ChainConfig');
  if (start < 0) return [];
  const body = src.slice(start, src.indexOf('\n};', start));
  const out = [];
  const re = /^\s*(\w+?)_timestamp:\s*(?:Some\()?([\d_]+|None)\)?,/gm;
  for (let m; (m = re.exec(body));) {
    const v = m[2] === 'None' ? null : m[2].replace(/_/g, '');
    out.push({ name: m[1].split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '), value: v, sepoliaOnly: /sepolia-only/i.test(docs[m[1]] || '') });
  }
  return out;
}

export default {
  chain: CHAIN,
  sources: [{ label: 'base/base mainnet ChainConfig (upgrade timestamps)', url: blob(REPO, REF, PATH) }],
  async fetch() {
    const forks = parseBaseMainnet(await fetchText(raw(REPO, REF, PATH)));
    return {
      proposals: forks.map((f) => row({
        chain: CHAIN, id: `Base:${f.name}`, title: `${f.name} upgrade (Base mainnet)`, status: f.sepoliaOnly && !f.value ? 'sepolia-only (per source)' : forkStatus(f.value),
        target_upgrade: f.name, type: 'network upgrade',
        dates: f.value ? [{ label: 'mainnet activation (UTC)', value: isoFromUnix(f.value) }] : [],
        url: blob(REPO, REF, PATH),
      })),
      notes: ['Base has no public proposal repo found in github.com/base; upgrades come from the client chain config. Status is activated/scheduled by comparing the stated timestamp with build time.'],
    };
  },
};
