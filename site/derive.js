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
const DONE = /final|withdrawn|stagnant|living|skipped|sepolia-only|activated/i;

/** Proposals (non-upgrade rows) whose stated target names this upgrade. */
function targeting(u, rows) {
  return rows.filter((p) => !isUpgrade(p) && (p.target_upgrade || '').split('; ')
    .some((t) => t === u.target_upgrade || u.target_upgrade.startsWith(`${t} `) || t.startsWith(`${u.target_upgrade} (`)
      || t.split('/').includes(u.target_upgrade)));
}

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
