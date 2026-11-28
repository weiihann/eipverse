// "What changed": diff the live data.json (the previous build) against this build, keep a capped log in
// site/changes.json and write an RSS feed. Nothing is stored anywhere but the site itself: the live changes.json is
// the log and the live data.json is the previous snapshot, so there is no new service and no committed history.
import { writeFile } from 'node:fs/promises';
import { changeText } from '../site/changes.js';

export const ORIGIN = process.env.PREV_ORIGIN || 'https://eipverse.com';
export const MAX_ENTRIES = 1000;
export const MAX_AGE_DAYS = 90;
export const SEED_DAYS = 30; // first run only: proposals whose source says they were created this recently
export const MAX_PER_CHAIN = 50; // more than this from one chain in one build looks like a source glitch, not news
const FEED_ITEMS = 100;
const DAY = 864e5;
const NOISY_DATES = new Set(['last activity']); // moves on every forum reply, says nothing about the proposal
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const okChains = (d) => new Map((d?.chains || []).filter((c) => c.status === 'ok').map((c) => [c.chain, new Map((c.proposals || []).map((p) => [p.id, p]))]));
// A row can carry the same label twice (two merged votes), so values are grouped per label before comparing.
const byLabel = (dates = []) => dates.reduce((m, d) => m.set(d.label, m.has(d.label) ? `${m.get(d.label)}, ${d.value}` : d.value), new Map());
const entry = (now, p, change, from, to, extra = {}) => ({ at: now.toISOString(), chain: p.chain, id: p.id, title: p.title || '', kind: p.kind, change, ...extra, from: from ?? null, to, url: p.url, basis: 'detected' });

// Compare two data.json snapshots. A chain is compared only if it is ok in both; removals are never reported.
export function diffSnapshots(prev, next, now = new Date()) {
  const before = okChains(prev), after = okChains(next);
  const entries = [], skipped = [];
  for (const [chain, rows] of after) {
    const old = before.get(chain);
    if (!old) { skipped.push({ chain, reason: 'not ok or absent in the previous snapshot' }); continue; }
    const out = [];
    for (const p of rows.values()) {
      const o = old.get(p.id);
      if (!o) { out.push(entry(now, p, 'new', null, p.status)); continue; }
      if (p.status && p.status !== o.status) out.push(entry(now, p, 'status', o.status, p.status));
      if (p.target_upgrade && p.target_upgrade !== o.target_upgrade) out.push(entry(now, p, 'target', o.target_upgrade, p.target_upgrade));
      const was = byLabel(o.dates);
      for (const [label, value] of byLabel(p.dates)) if (!NOISY_DATES.has(label) && value !== was.get(label)) out.push(entry(now, p, 'date', was.get(label), value, { field: label }));
    }
    if (out.length > MAX_PER_CHAIN) { skipped.push({ chain, reason: `${out.length} changes in one build, more than ${MAX_PER_CHAIN}` }); continue; }
    entries.push(...out);
  }
  for (const [chain] of before) if (!after.has(chain)) skipped.push({ chain, reason: 'not ok in this build' });
  return { entries, skipped };
}

// First run only: "new proposal" entries for proposals whose own source gives a created date in the last SEED_DAYS.
// `at` is that created date and basis says so; nothing is inferred.
export function seedEntries(next, now = new Date()) {
  const out = [];
  for (const c of next.chains || []) {
    if (c.status !== 'ok') continue;
    for (const p of c.proposals || []) {
      const created = (p.dates || []).find((d) => d.label === 'created' && ISO_DAY.test(d.value))?.value;
      const t = created && Date.parse(`${created}T00:00:00Z`);
      if (!t || t > now.getTime() || now.getTime() - t > SEED_DAYS * DAY) continue;
      out.push({ ...entry(now, p, 'new', null, p.status), at: `${created}T00:00:00.000Z`, basis: 'created' });
    }
  }
  return out;
}

// Add entries to the log, newest first. Re-detecting something already logged adds nothing: a proposal is "new" once,
// and any other change is skipped when the latest logged change of that kind already ended on the same value.
export function mergeLog(log, entries, now = new Date()) {
  const all = [...log.entries];
  for (const e of entries) {
    const last = all.find((x) => x.chain === e.chain && x.id === e.id && x.change === e.change && x.field === e.field);
    if (last && (e.change === 'new' || last.to === e.to)) continue;
    all.unshift(e);
  }
  const cutoff = now.getTime() - MAX_AGE_DAYS * DAY;
  const kept = all.filter((e) => Date.parse(e.at) >= cutoff).sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, MAX_ENTRIES);
  return { ...log, entries: kept };
}

// 404 = never published (first run). Anything else that is not a clean JSON 200 is an error, never an empty log.
export async function getJson(url, fetchFn = fetch, tries = 3) {
  let error;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetchFn(url, { headers: { 'cache-control': 'no-cache' } });
      if (r.status === 404) return { missing: true };
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return { json: await r.json() };
    } catch (e) { error = e.message; }
  }
  return { error };
}

// The new log. Throws when the live log cannot be read, so the build stops rather than deploy a wiped log. A failed
// previous-snapshot read just means no diff this build.
export async function updateChanges(next, { origin = ORIGIN, fetchFn = fetch, now = new Date() } = {}) {
  const live = await getJson(`${origin}/changes.json`, fetchFn);
  if (live.error) throw new Error(`cannot read ${origin}/changes.json (${live.error}); not overwriting the log`);
  if (live.json && !Array.isArray(live.json.entries)) throw new Error(`${origin}/changes.json has no entries array; not overwriting the log`);
  const first = !!live.missing;
  const log = first ? { tracking_started: now.toISOString(), entries: [] } : { tracking_started: live.json.tracking_started, entries: live.json.entries };

  const prev = await getJson(`${origin}/data.json`, fetchFn);
  let found = [];
  if (prev.json) {
    const d = diffSnapshots(prev.json, next, now);
    found = d.entries;
    for (const s of d.skipped) console.warn(`changes: skipped ${s.chain}: ${s.reason}`);
  } else console.warn(`changes: no previous snapshot (${prev.error || 'not published'}); nothing to diff`);
  if (first) found = [...found, ...seedEntries(next, now)];

  const merged = mergeLog(log, found, now);
  return { generated_at: now.toISOString(), tracking_started: log.tracking_started, entries: merged.entries, added: merged.entries.filter((e) => !log.entries.includes(e)).length };
}

const xml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function renderFeed(log, origin = 'https://eipverse.com') {
  const items = log.entries.slice(0, FEED_ITEMS).map((e) => `    <item>
      <title>${xml(`${e.chain} ${e.id}: ${changeText(e)}`)}</title>
      <link>${xml(e.url)}</link>
      <guid isPermaLink="false">${xml([e.chain, e.id, e.change, e.field || '', e.to, e.at].join('|'))}</guid>
      <pubDate>${new Date(e.at).toUTCString()}</pubDate>
      <category>${xml(e.chain)}</category>
      <description>${xml(`${e.title ? `${e.title}. ` : ''}${changeText(e)}${e.basis === 'created' ? ' (created date from the source; first seen at tracking start)' : ''}`)}</description>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>eipverse: what changed</title>
    <link>${origin}/?view=changes</link>
    <atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>New proposals, status changes and upgrade date or target changes across EVM chains, detected between daily builds.</description>
    <language>en</language>
    <lastBuildDate>${new Date(log.generated_at).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

export async function writeChanges(next, dir = new URL('../site/', import.meta.url), opts) {
  const { added, ...log } = await updateChanges(next, opts);
  await writeFile(new URL('changes.json', dir), JSON.stringify(log));
  await writeFile(new URL('feed.xml', dir), renderFeed(log));
  return { total: log.entries.length, added };
}
