// Ethereum: EIPs from ethereum/EIPs (frontmatter) + hardfork meta EIPs for target upgrades.
import { ghList, fetchText, raw, blob, tree, parseFrontmatter, pool, row, isoFromUnix } from '../lib/util.js';

const REPO = 'ethereum/EIPs', REF = 'master', CHAIN = 'Ethereum';
const ERCS = 'ethereum/ERCs', ERCS_REF = 'master';

/** Parse a "Hardfork Meta - <Fork>" EIP into {fork, members: [{eip, stage}], mainnet}.
 *  Handles both layouts: `### Included EIPs` headings (newer) and `- Included EIPs:` bullets (older). */
export function parseMetaEip(text) {
  const fm = parseFrontmatter(text) || {};
  const fork = /Hardfork Meta\s*[-:–]\s*(.+)$/i.exec(fm.title || '')?.[1]?.trim();
  if (!fork) return null;
  const spec = (/^## Specification\s*$([\s\S]*?)(?=^## )/m.exec(text) || [])[1] || '';
  const members = [];
  let stage = null;
  for (const line of spec.split('\n')) {
    const h = /^###\s+(.+)$/.exec(line)?.[1] || /^[*-]\s+([^[]+?):\s*$/.exec(line)?.[1];
    if (h) {
      stage = /activation|mascot|blob parameter|full specification|upgrade schedule|parameters/i.test(h) ? null : h.trim().replace(/^EIPs?\s+/i, '').replace(/\s+EIPs?$/i, '');
      continue;
    }
    const b = /^\s*[*-]\s+\[EIP-(\d+)\]/.exec(line);
    if (b && stage) members.push({ eip: b[1], stage });
  }
  return { fork, members, mainnet: parseMainnetActivation(text) };
}

/** Mainnet activation as stated: a date in the Mainnet row, else its unix timestamp, else a BPO "Activation Time" row. */
function parseMainnetActivation(text) {
  const rowText = /^\|\s*Mainnet\s*\|.*$/m.exec(text)?.[0] || /^\|\s*Activation Time \(UTC\)\s*\|.*$/m.exec(text)?.[0];
  if (!rowText) return null;
  const date = /(\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?)/.exec(rowText)?.[1];
  if (date) return `${date.replace(' ', 'T')}${date.length > 10 ? 'Z' : ''}`;
  const ts = /`?\b(1\d{9})\b`?/.exec(rowText)?.[1];
  return ts ? isoFromUnix(ts) : null;
}

/** An ERC file from ethereum/ERCs (frontmatter key is still `eip:`). */
export function parseErc(text, path) {
  const fm = parseFrontmatter(text);
  if (!fm?.eip) return null;
  return row({
    chain: CHAIN, id: `ERC-${fm.eip}`, title: fm.title, status: fm.status, kind: 'app standard',
    type: [fm.type, fm.category].filter(Boolean).join(' / ') || 'ERC',
    dates: [{ label: 'created', value: fm.created }, { label: 'last call deadline', value: fm['last-call-deadline'] }],
    url: blob(ERCS, ERCS_REF, path),
  });
}

export default {
  chain: CHAIN,
  sources: [
    { label: 'ethereum/EIPs EIPS/*.md frontmatter', url: tree(REPO, REF, 'EIPS') },
    { label: 'Hardfork Meta EIPs (e.g. EIP-7607, EIP-7773) for target upgrade', url: blob(REPO, REF, 'EIPS/eip-7773.md') },
    { label: 'ethereum/ERCs ERCS/erc-*.md frontmatter (app standards)', url: tree(ERCS, ERCS_REF, 'ERCS') },
  ],
  async fetch() {
    const files = (await ghList(REPO, 'EIPS', REF)).filter((f) => /^eip-\d+\.md$/.test(f.name));
    const docs = await pool(files, 24, async (f) => ({ f, text: await fetchText(raw(REPO, REF, f.path)) }));
    const metas = docs.map((d) => parseMetaEip(d.text)).filter(Boolean);
    const targets = new Map(); // eip -> ["Fork (stage)"]
    const metaInfo = new Map(); // fork name -> mainnet date
    for (const m of metas) {
      metaInfo.set(m.fork, m.mainnet);
      for (const { eip, stage } of m.members) {
        const label = /^included$/i.test(stage) ? m.fork : `${m.fork} (${stage})`;
        targets.set(eip, [...(targets.get(eip) || []), label]);
      }
    }
    let moved = 0;
    const proposals = [];
    for (const { f, text } of docs) {
      const fm = parseFrontmatter(text);
      if (!fm?.eip) continue;
      if (/^moved$/i.test(fm.status || '')) { moved++; continue; }
      const meta = parseMetaEip(text);
      proposals.push(row({
        chain: CHAIN, id: `EIP-${fm.eip}`, title: fm.title, status: fm.status,
        target_upgrade: meta ? meta.fork : (targets.get(fm.eip) || []).join('; '),
        type: meta ? 'network upgrade (meta EIP)' : [fm.type, fm.category].filter(Boolean).join(' / '),
        dates: [
          { label: 'created', value: fm.created },
          { label: 'last call deadline', value: fm['last-call-deadline'] },
          meta && { label: 'mainnet activation (UTC)', value: meta.mainnet },
        ],
        url: blob(REPO, REF, f.path),
      }));
    }
    const ercFiles = (await ghList(ERCS, 'ERCS', ERCS_REF)).filter((f) => /^erc-\d+\.md$/.test(f.name));
    const ercs = await pool(ercFiles, 24, async (f) => parseErc(await fetchText(raw(ERCS, ERCS_REF, f.path)), f.path));
    proposals.push(...ercs.filter(Boolean));
    return { proposals, notes: [`${moved} EIP stubs with status "Moved" are excluded; their ERCs come from ethereum/ERCs.`, `${metas.length} Hardfork Meta EIPs used for target-upgrade mapping.`] };
  },
};
