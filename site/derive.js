// Pure data derivations shared by the page (app.js) and tests.

const MONTH = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? (\d{1,2}),? (\d{4})/;

/** Milliseconds for a stated date string (ISO-ish or "Month D, YYYY"), else null. */
export function statedTime(v) {
  const iso = /(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?/.exec(v || '');
  if (iso) return Date.parse(`${iso[1]}T${iso[2] || '00:00'}Z`);
  const m = MONTH.exec(v || '');
  return m ? Date.parse(`${m[1]} ${m[2]}, ${m[3]} UTC`) : null;
}

const newest = (r) => Math.max(...r.dates.map((d) => statedTime(d.value) ?? -Infinity));

/** Newest stated date first; rows without any parseable date last (stable otherwise). */
export function sortNewestFirst(rows) {
  return rows.map((r, i) => ({ r, i, t: newest(r) })).sort((a, b) => (b.t - a.t) || (a.i - b.i)).map((x) => x.r);
}

const isUpgrade = (r) => /^network upgrade/.test(r.type || '');
const activation = (r) => r.dates.find((d) => /activation/i.test(d.label));
const DONE = /final|withdrawn|stagnant|living|skipped|sepolia[- ]only|activated/i;

/** Does a proposal's stated target name this upgrade? ("Glamsterdam (Scheduled for Inclusion)", "Osaka/Mendel", "protocol version T14 ...") */
export function targetsUpgrade(p, name) {
  return !!name && (p.target_upgrade || '').split('; ')
    .some((t) => t === name || name.startsWith(`${t} `) || t.startsWith(`${name} (`) || t.split('/').includes(name));
}

/** Proposals (non-upgrade rows) whose stated target names this upgrade. */
function targeting(u, rows) {
  return rows.filter((p) => !isUpgrade(p) && targetsUpgrade(p, u.target_upgrade));
}

export { isUpgrade };

/** Per chain: next dated upgrade after `now`, latest dated upgrade at/before `now`,
 *  and in-progress upgrades with no stated date (non-null, non-terminal status). */
export function upgradesByChain(chains, now = Date.now()) {
  return chains.map((c) => {
    const ups = c.proposals.filter(isUpgrade).map((r) => ({ r, d: activation(r), t: statedTime(activation(r)?.value) }));
    const dated = ups.filter((u) => u.t != null).sort((a, b) => a.t - b.t);
    const pack = (u) => u && { row: u.r, date: u.d.value, proposals: targeting(u.r, c.proposals) };
    return {
      chain: c.chain,
      next: pack(dated.find((u) => u.t > now)),
      latest: pack(dated.filter((u) => u.t <= now).at(-1)),
      undated: ups.filter((u) => u.t == null && u.r.status && !DONE.test(u.r.status))
        .map((u) => ({ row: u.r, date: null, proposals: targeting(u.r, c.proposals) })),
    };
  });
}

// Scope buckets. "active" = still moving or upcoming; "historical" = shipped, closed or abandoned.
// The verbatim status is always what the page shows; the bucket only drives the default filter.
const HISTORICAL = /^(final|stagnant|stale|withdrawn|superseded|abandoned|living|continuous|enabled|mainnet|cancelled|snapshot closed)\b|activated|executed|skipped|sepolia[- ]only|deprecated|final \(per title\)|later upgrades activated/i;
const ACTIVE = /^(draft|review|last call|candidate|approved|backlog|idea|proposed|snapshot (active|pending))\b|scheduled|no (op )?mainnet time (set|in genesis)|draft \(per title\)/i;
const RECENT_MS = 120 * 864e5;

/** -> 'active' | 'historical'. Unknown statuses stay visible ('active') rather than being hidden. */
export function statusBucket(r, now = Date.now()) {
  const s = r.status || '';
  if (/^(forum|blog) post$/i.test(s)) return now - newest(r) <= RECENT_MS ? 'active' : 'historical';
  if (HISTORICAL.test(s)) return 'historical';
  if (ACTIVE.test(s)) return 'active';
  return 'active';
}

// One short human label per canonical source URL, for rows and the sources list (the full link stays clickable).
const SOURCE_LABELS = [
  [/github\.com\/ethereum\/EIPs\/(tree|blob)\/[^/]+\/EIPS\/?$/, 'EIPs repo'],
  [/github\.com\/ethereum\/EIPs/, 'EIPs repo'],
  [/github\.com\/ethereum\/ERCs/, 'ERCs repo'],
  [/github\.com\/bnb-chain\/BEPs\/blob\/[^/]+\/README\.md/, 'BEPs README'],
  [/github\.com\/bnb-chain\/BEPs\/blob\/[^/]+\/BAPs\//, 'BAPs repo'],
  [/github\.com\/bnb-chain\/BEPs/, 'BEPs repo'],
  [/github\.com\/bnb-chain\/bsc\//, 'BSC chain config'],
  [/github\.com\/bnb-chain\/opbnb\//, 'opBNB chain config'],
  [/github\.com\/tempoxyz\/tempo\/(tree|blob)\/[^/]+\/tips/, 'TIPs repo'],
  [/github\.com\/tempoxyz\/tempo\/blob\/[^/]+\/crates\/chainspec\/src\/spec\.rs/, 'chain spec'],
  [/github\.com\/tempoxyz\/tempo\//, 'chain config'],
  [/github\.com\/monad-crypto\/MIPs\/(tree|blob)\/[^/]+\/MRCs/, 'MRCs repo'],
  [/github\.com\/monad-crypto\/MIPs/, 'MIPs repo'],
  [/github\.com\/category-labs\/monad-bft/, 'chain config'],
  [/github\.com\/ArbitrumFoundation\/docs|docs\.arbitrum\.foundation/, 'Arbitrum upgrades table'],
  [/docs\.arbitrum\.io/, 'Arbitrum docs'],
  [/snapshot\.(box|org)\/#\/s:[^/]+\/proposal\//, 'Snapshot vote'],
  [/snapshot\.(box|org)/, 'Snapshot space'],
  [/github\.com\/ethereum-optimism\/specs/, 'OP specs'],
  [/github\.com\/ethereum-optimism\/superchain-registry/, 'superchain-registry'],
  [/gov\.optimism\.io\/search/, 'OP forum search'],
  [/gov\.optimism\.io/, 'OP forum'],
  [/github\.com\/base\/base/, 'chain config'],
  [/(www\.)?base\.org\/blog/, 'Base blog'],
  [/github\.com\/0xPolygon\/Polygon-Improvement-Proposals\/(tree|blob)\/[^/]+\/PIPs\/PRC/, 'PRCs repo'],
  [/github\.com\/0xPolygon\/Polygon-Improvement-Proposals/, 'PIPs repo'],
  [/github\.com\/0xPolygon\/bor\//, 'bor chain config'],
  [/github\.com\/avalanche-foundation\/ACPs/, 'ACPs repo'],
  [/github\.com\/ava-labs\/avalanchego\//, 'avalanchego config'],
  [/github\.com\/celo-org\/celo-proposals/, 'CIPs repo'],
  [/github\.com\/gnosischain\/specs/, 'Gnosis specs'],
];
export function sourceLabel(url = '') {
  for (const [re, label] of SOURCE_LABELS) if (re.test(url)) return label;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'source'; }
}

/** Chain-level sources with short labels; when two share a label, the file name tells them apart. */
export function sourceList(sources = []) {
  const labels = sources.map((s) => sourceLabel(s.url));
  return sources.map((s, i) => {
    if (labels.indexOf(labels[i]) === i) return { ...s, short: labels[i] };
    const file = s.url.split(/[/#]/).filter(Boolean).pop();
    const doc = /^([a-z]+)-(\d+)\.md$/i.exec(file);
    return { ...s, short: doc ? `${doc[1].toUpperCase()}-${doc[2]}` : `${labels[i]} · ${file}` };
  });
}
