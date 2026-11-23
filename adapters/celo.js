// Celo: CIPs in celo-org/celo-proposals (CIPs/cip-NNNN.md frontmatter), plus Celo L2 mainnet hardfork times from the
// superchain-registry entry Celo maintains there (superchain/configs/mainnet/celo.toml). Celo became an OP Stack L2 in 2025.
import { ghList, fetchText, raw, blob, tree, parseFrontmatter, pool, row, sectionText, isoFromUnix, forkStatus } from '../lib/util.js';
import { parseSuperchainHardforks } from './optimism.js';

const CHAIN = 'Celo';
const CIPS = 'celo-org/celo-proposals', CIPS_REF = 'master';
// Celo Governance Proposals: the on-chain governance pipeline (draft -> proposed -> executed/rejected/expired).
const CGPS = 'celo-org/governance', CGPS_REF = 'main';
const REG = 'ethereum-optimism/superchain-registry', REG_REF = 'main', TOML = 'superchain/configs/mainnet/celo.toml';

export function parseCip(text, path) {
  const fm = parseFrontmatter(text);
  if (!fm?.cip || !/^\d+$/.test(fm.cip)) return null;
  return row({
    chain: CHAIN, id: `CIP-${Number(fm.cip)}`, title: fm.title, status: fm.status,
    abstract: fm.description || sectionText(text, ['abstract', 'simple summary', 'summary']),
    dates: [{ label: 'created', value: fm.created }], url: blob(CIPS, CIPS_REF, path),
    type: ['CIP', fm.type, fm.category].filter(Boolean).join(' · '),
  });
}

export function parseCgp(text, path) {
  const fm = parseFrontmatter(text);
  if (!fm?.cgp || !/^\d+$/.test(fm.cgp)) return null;
  const pid = /^\d+$/.test(fm['governance-proposal-id'] || '') ? fm['governance-proposal-id'] : null;
  return row({
    chain: CHAIN, id: `CGP-${Number(fm.cgp)}`, title: fm.title, status: fm.status || null,
    abstract: sectionText(text, ['proposal description', 'summary', 'abstract']),
    dates: [{ label: 'created', value: fm['date-created'] }, { label: 'executed', value: fm['date-executed'] }],
    url: blob(CGPS, CGPS_REF, path), type: pid ? `CGP · on-chain proposal ${pid}` : 'CGP',
  });
}

/** L2 genesis time from `[genesis] l2_time = N`. */
export const parseL2Genesis = (toml) => /^\[genesis\][\s\S]*?^\s*l2_time\s*=\s*(\d+)/m.exec(toml)?.[1] || null;

export default {
  chain: CHAIN,
  sources: [
    { label: 'celo-org/celo-proposals CIPs/*.md frontmatter', url: tree(CIPS, CIPS_REF, 'CIPs') },
    { label: 'celo-org/governance CGPs/cgp-NNNN.md frontmatter (Celo Governance Proposals)', url: tree(CGPS, CGPS_REF, 'CGPs') },
    { label: 'superchain-registry celo.toml (Celo mainnet L2 hardfork times)', url: blob(REG, REG_REF, TOML) },
  ],
  async fetch() {
    const files = (await ghList(CIPS, 'CIPs', CIPS_REF)).filter((f) => /^cip-\d+\.md$/i.test(f.name));
    const cips = await pool(files, 16, async (f) => parseCip(await fetchText(raw(CIPS, CIPS_REF, f.path)), f.path));
    const cgpFiles = (await ghList(CGPS, 'CGPs', CGPS_REF)).filter((f) => /^cgp-\d+\.md$/i.test(f.name));
    const cgps = await pool(cgpFiles, 16, async (f) => parseCgp(await fetchText(raw(CGPS, CGPS_REF, f.path)), f.path));
    const toml = await fetchText(raw(REG, REG_REF, TOML));
    const forks = Object.entries(parseSuperchainHardforks(toml)).filter(([, v]) => Number(v) > 0);
    const genesis = parseL2Genesis(toml);
    const cap = (s) => s[0].toUpperCase() + s.slice(1);
    const rows = forks.map(([k, v]) => row({
      chain: CHAIN, id: `Celo:${cap(k)}`, title: `${cap(k)} hardfork (Celo L2 mainnet)`, status: forkStatus(v), target_upgrade: cap(k),
      type: 'network upgrade', shared_with: 'Optimism / OP Stack', refs: [{ chain: 'Optimism / OP Stack', upgrade: cap(k) }],
      abstract: `OP Stack ${cap(k)} upgrade activated on Celo at its own time (superchain-registry celo.toml).`,
      dates: [{ label: 'mainnet activation (UTC)', value: isoFromUnix(v) }], url: blob(REG, REG_REF, TOML),
    }));
    if (genesis) rows.push(row({
      chain: CHAIN, id: 'Celo:L2', title: 'Celo L2 genesis (migration from L1 to an OP Stack L2)', status: forkStatus(genesis), target_upgrade: 'L2',
      type: 'network upgrade', abstract: 'First block of Celo as an OP Stack L2, per the registry genesis l2_time. OP Stack forks with time 0 were active from this block.',
      dates: [{ label: 'mainnet activation (UTC)', value: isoFromUnix(genesis) }], url: blob(REG, REG_REF, TOML),
    }));
    return {
      proposals: [...cips.filter(Boolean), ...cgps.filter(Boolean), ...rows],
      notes: [
        'CIP folders (CIP-0020, CIP-0033, CIP-0040) hold supporting files, not separate CIPs; only cip-NNNN.md files are rows.',
        'L2 hardforks with time 0 in celo.toml were active from the L2 genesis and are not listed separately. Celo L1-era hardforks (pre-2025) are not included.',
        'CIPs are protocol standards (the repo was last updated in 2025); live proposals go through Celo on-chain governance as CGPs, whose status (DRAFT, PROPOSED, EXECUTED, REJECTED, EXPIRED, WITHDRAWN) is copied from each file.',
        'Hardfork rows are OP Stack upgrades, marked "shared with OP Stack" and linked to the Optimism rows.',
      ],
    };
  },
};
