// Sei: SIPs (Sei Improvement Proposals) in sei-protocol/sips (sips/sip-<n>.md, each opening with a metadata table),
// plus Sei mainnet (pacific-1) on-chain governance proposals from the chain's own REST API (the cosmos gov module, at
// rest.sei-apis.com, the endpoint the Sei docs use). A passed software-upgrade proposal is a network upgrade row; its
// state ("activated" or "scheduled") comes from the chain's upgrade module (applied_plan / current_plan).
// The REST node keeps no old blocks, so upgrade rows carry the upgrade height but no activation time.
import { ghList, fetchText, fetchJson, raw, blob, tree, pool, row, sectionText } from '../lib/util.js';

const CHAIN = 'Sei';
const SIPS = 'sei-protocol/sips', SIPS_REF = 'main';
const REST = 'https://rest.sei-apis.com';
const plain = (s) => (s || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\\([[\]])/g, '$1').replace(/\*\*/g, '').trim();

/** Created dates appear as ISO (2025-03-21) or US (05/07/2025 = May 7). Anything else is dropped, not guessed. */
export function sipDate(s) {
  const v = plain(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  return us && +us[1] <= 12 ? `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}` : null;
}

/** SIP file: `**SIP-7: Title**` line, then a `| Key | Value |` table (rows may hold several key/value pairs). */
export function parseSip(text, path) {
  const meta = {};
  for (const line of String(text).split('\n')) {
    if (!/^\s*\|/.test(line)) { if (Object.keys(meta).length) break; continue; }
    const c = line.trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
    for (let i = 0; i + 1 < c.length; i += 2) if (c[i] && !/^:?-+:?$/.test(c[i])) meta[plain(c[i]).toLowerCase()] = c[i + 1];
  }
  const n = plain(meta['sip-number'] || meta['sip number']) || /sip-(\d+)\.md$/i.exec(path)?.[1];
  if (!/^\d+$/.test(n || '')) return null;
  return row({
    chain: CHAIN, id: `SIP-${n}`, title: plain(meta.title), status: plain(meta.status) || null,
    abstract: sectionText(String(text).replace(/^(#{1,6}\s*)\*\*(.+?)\*\*\s*$/gm, '$1$2'), ['abstract', 'summary', 'simple summary']) || plain(meta.description) || null,
    dates: [{ label: 'created', value: sipDate(meta.created) }], url: blob(SIPS, SIPS_REF, path),
    type: meta.type ? `SIP · ${plain(meta.type)}` : 'SIP',
  });
}

const STATUS = { PROPOSAL_STATUS_DEPOSIT_PERIOD: 'deposit period', PROPOSAL_STATUS_VOTING_PERIOD: 'voting period', PROPOSAL_STATUS_PASSED: 'passed', PROPOSAL_STATUS_REJECTED: 'rejected', PROPOSAL_STATUS_FAILED: 'failed' };
const day = (t) => (t && !t.startsWith('0001') ? t.slice(0, 10) : null);
const kindOf = (p) => (p.content?.['@type'] || '').split('.').pop().replace(/Proposal(V\d+)?$/, '$1') || 'proposal';
const propUrl = (id) => `${REST}/cosmos/gov/v1beta1/proposals/${id}`;
const isUpgradeProp = (p) => /SoftwareUpgradeProposal$/.test(p.content?.['@type'] || '') && p.status === 'PROPOSAL_STATUS_PASSED';

/** One gov module proposal (v1beta1 JSON) as a governance row. The description is kept only when it is prose. */
export function govRow(p) {
  const d = (p.content?.description || '').trim();
  return row({
    chain: CHAIN, id: `Prop ${p.proposal_id}`, title: p.content?.title || null,
    status: `on-chain ${STATUS[p.status] || p.status}`, abstract: /^https?:\/\/\S+$/.test(d) ? null : d,
    dates: [{ label: 'submitted', value: day(p.submit_time) }, { label: 'voting ends', value: day(p.voting_end_time) }],
    url: propUrl(p.proposal_id), type: `Sei governance · ${kindOf(p)}`,
  });
}

/** Passed software upgrade -> network upgrade row. applied: height from applied_plan (0 = not applied); next: current_plan name. */
export function upgradeRow(p, applied, next) {
  const { name, height } = p.content.plan;
  const status = Number(applied) > 0 ? 'activated' : next === name ? 'scheduled' : 'passed; not applied per upgrade module';
  const h = Number(Number(applied) > 0 ? applied : height).toLocaleString('en-US');
  return row({
    chain: CHAIN, network: 'Sei mainnet (pacific-1)', id: `Sei:${name}`, title: `${name} software upgrade at height ${h}`,
    status, target_upgrade: name, type: 'network upgrade', abstract: null,
    dates: [{ label: 'upgrade vote ended', value: day(p.voting_end_time) }], url: propUrl(p.proposal_id),
  });
}

export default {
  chain: CHAIN,
  sources: [
    { label: 'sei-protocol/sips sips/sip-<n>.md metadata tables', url: tree(SIPS, SIPS_REF, 'sips') },
    { label: 'Sei mainnet governance proposals (cosmos gov module REST, rest.sei-apis.com)', url: `${REST}/cosmos/gov/v1beta1/proposals?pagination.limit=500` },
    { label: 'Sei mainnet upgrade module (current_plan / applied_plan)', url: `${REST}/cosmos/upgrade/v1beta1/current_plan` },
  ],
  async fetch() {
    const files = (await ghList(SIPS, 'sips', SIPS_REF)).filter((f) => /^sip-\d+\.md$/i.test(f.name));
    const sips = (await pool(files, 8, async (f) => parseSip(await fetchText(raw(SIPS, SIPS_REF, f.path)), f.path))).filter(Boolean);
    const props = (await fetchJson(`${REST}/cosmos/gov/v1beta1/proposals?pagination.limit=500`)).proposals || [];
    const next = (await fetchJson(`${REST}/cosmos/upgrade/v1beta1/current_plan`)).plan?.name || null;
    // One upgrade row per name: the newest passed proposal for that name.
    const byName = new Map();
    for (const p of props.filter(isUpgradeProp)) if (!byName.has(p.content.plan.name) || +p.proposal_id > +byName.get(p.content.plan.name).proposal_id) byName.set(p.content.plan.name, p);
    const ups = await pool([...byName.values()], 6, async (p) => upgradeRow(p, (await fetchJson(`${REST}/cosmos/upgrade/v1beta1/applied_plan/${encodeURIComponent(p.content.plan.name)}`)).height, next));
    const gov = props.filter((p) => !byName.has(p.content?.plan?.name) || byName.get(p.content.plan.name) !== p).map(govRow);
    return {
      proposals: [...sips, ...ups, ...gov],
      notes: [
        'Governance rows are every proposal the mainnet gov module still returns; proposal IDs it no longer holds (it answers "doesn\'t exist") are absent.',
        'Upgrade rows: status from the upgrade module (applied_plan height > 0 = activated; current_plan = scheduled). The REST node has pruned old blocks, so no activation time is stated.',
      ],
    };
  },
};
