import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffSnapshots, seedEntries, mergeLog, updateChanges, renderFeed, getJson, MAX_ENTRIES, MAX_PER_CHAIN } from '../lib/changes.js';
import { changeText, weekStartUtc, weekRangeLabel, groupByWeek } from '../site/changes.js';

const NOW = new Date('2026-11-28T10:00:00.000Z');
const row = (chain, id, o = {}) => ({ chain, id, title: `${id} title`, status: 'Draft', target_upgrade: null, dates: [], url: `https://example.com/${id}`, kind: 'protocol', ...o });
const chain = (name, proposals, status = 'ok') => ({ chain: name, status, count: proposals.length, proposals: status === 'ok' ? proposals : [] });
const snap = (...chains) => ({ generated_at: '2026-11-27T00:00:00.000Z', chains });
const fetchOf = (routes) => async (url) => {
  const hit = routes[new URL(url).pathname];
  if (hit instanceof Error) throw hit;
  return { status: hit.status, ok: hit.status < 400, json: async () => hit.body };
};

test('diff: new proposal, status change, target set, date moved or scheduled', () => {
  const prev = snap(chain('Tempo', [
    row('Tempo', 'TIP-1', { status: 'Draft' }),
    row('Tempo', 'TIP-2', { dates: [{ label: 'mainnet activation (UTC)', value: '2026-12-01T00:00:00Z' }] }),
  ]));
  const next = snap(chain('Tempo', [
    row('Tempo', 'TIP-1', { status: 'Mainnet', target_upgrade: 'protocol version T8' }),
    row('Tempo', 'TIP-2', { dates: [{ label: 'mainnet activation (UTC)', value: '2026-12-08T00:00:00Z' }, { label: 'testnet activation', value: '2026-11-30T00:00:00Z' }] }),
    row('Tempo', 'TIP-3', { status: 'Review' }),
  ]));
  const { entries } = diffSnapshots(prev, next, NOW);
  const pick = (id, change) => entries.find((e) => e.id === id && e.change === change);
  assert.deepEqual([pick('TIP-3', 'new').from, pick('TIP-3', 'new').to], [null, 'Review']);
  assert.deepEqual([pick('TIP-1', 'status').from, pick('TIP-1', 'status').to], ['Draft', 'Mainnet']);
  assert.deepEqual([pick('TIP-1', 'target').from, pick('TIP-1', 'target').to], [null, 'protocol version T8']);
  const moved = entries.find((e) => e.field === 'mainnet activation (UTC)');
  assert.deepEqual([moved.from, moved.to], ['2026-12-01T00:00:00Z', '2026-12-08T00:00:00Z']);
  assert.equal(entries.find((e) => e.field === 'testnet activation').from, null);
  assert.equal(entries.length, 5);
  for (const e of entries) {
    assert.equal(e.at, NOW.toISOString());
    assert.equal(e.basis, 'detected');
    assert.equal(e.chain, 'Tempo');
    assert.match(e.url, /^https:\/\//);
  }
});

test('diff: identical snapshots, title edits, last-activity churn and removals add nothing', () => {
  const a = snap(chain('Arbitrum', [row('Arbitrum', 'A', { dates: [{ label: 'last activity', value: '2026-11-01' }] }), row('Arbitrum', 'B')]));
  const b = snap(chain('Arbitrum', [row('Arbitrum', 'A', { title: 'renamed', dates: [{ label: 'last activity', value: '2026-11-27' }] })]));
  assert.deepEqual(diffSnapshots(a, a, NOW).entries, []);
  assert.deepEqual(diffSnapshots(a, b, NOW).entries, []);
});

test('diff: a row with the same date label twice compares equal to itself', () => {
  const dates = [{ label: 'vote start', value: '2023-04-08' }, { label: 'vote start', value: '2023-04-11' }];
  const s = snap(chain('Arbitrum', [row('Arbitrum', 'A', { dates })]));
  assert.deepEqual(diffSnapshots(s, s, NOW).entries, []);
});

test('diff: a chain that is not ok in either snapshot is skipped, so no mass new or removed noise', () => {
  const full = chain('Sei', Array.from({ length: 200 }, (_, i) => row('Sei', `SIP-${i}`)));
  const errored = chain('Sei', [], 'error');
  const empty = chain('Sei', [], 'empty');
  for (const [prev, next] of [[snap(full), snap(errored)], [snap(errored), snap(full)], [snap(empty), snap(full)], [snap(full), snap(empty)]]) {
    assert.deepEqual(diffSnapshots(prev, next, NOW).entries, []);
  }
  // other chains still diff normally
  const r = diffSnapshots(snap(errored, chain('Base', [row('Base', 'X')])), snap(full, chain('Base', [row('Base', 'X'), row('Base', 'Y')])), NOW);
  assert.deepEqual(r.entries.map((e) => e.id), ['Y']);
  assert.equal(r.skipped[0].chain, 'Sei');
});

test('diff: a chain missing from the previous snapshot (newly added) is skipped, not reported as hundreds of new rows', () => {
  const r = diffSnapshots(snap(chain('Base', [row('Base', 'X')])), snap(chain('Base', [row('Base', 'X')]), chain('Sei', [row('Sei', 'SIP-1')])), NOW);
  assert.deepEqual(r.entries, []);
});

test(`diff: more than ${MAX_PER_CHAIN} changes from one chain in one build is treated as a source glitch`, () => {
  const rows = (n) => Array.from({ length: n }, (_, i) => row('Arbitrum', `AIP-${i}`));
  const r = diffSnapshots(snap(chain('Arbitrum', rows(10)), chain('Base', [])), snap(chain('Arbitrum', rows(10 + MAX_PER_CHAIN + 1)), chain('Base', [row('Base', 'X')])), NOW);
  assert.deepEqual(r.entries.map((e) => e.chain), ['Base']);
  assert.match(r.skipped.find((s) => s.chain === 'Arbitrum').reason, /more than/);
});

test('diff: unusable snapshots give no entries', () => {
  assert.deepEqual(diffSnapshots(null, snap(chain('Base', [row('Base', 'X')])), NOW).entries, []);
  assert.deepEqual(diffSnapshots({}, {}, NOW).entries, []);
});

test('seed: only created dates from the source inside the window, labelled as created', () => {
  const next = snap(chain('Ethereum', [
    row('Ethereum', 'EIP-new', { dates: [{ label: 'created', value: '2026-11-20' }] }),
    row('Ethereum', 'EIP-old', { dates: [{ label: 'created', value: '2026-01-01' }] }),
    row('Ethereum', 'EIP-future', { dates: [{ label: 'created', value: '2027-01-01' }] }),
    row('Ethereum', 'EIP-nodate'),
    row('Ethereum', 'EIP-posted', { dates: [{ label: 'posted', value: '2026-11-25' }] }),
  ]), chain('Sei', [row('Sei', 'SIP-1', { dates: [{ label: 'created', value: '2026-11-25' }] })], 'error'));
  const s = seedEntries(next, NOW);
  assert.deepEqual(s.map((e) => e.id), ['EIP-new']);
  assert.equal(s[0].at, '2026-11-20T00:00:00.000Z');
  assert.equal(s[0].basis, 'created');
});

test('merge: re-detecting the same change adds nothing; a later different change is added', () => {
  const e = (to, at = NOW.toISOString(), change = 'status') => ({ at, chain: 'Tempo', id: 'TIP-1', title: 't', kind: 'protocol', change, from: 'Draft', to, url: 'https://x.test', basis: 'detected' });
  const log = { tracking_started: '2026-11-01T00:00:00.000Z', entries: [] };
  const once = mergeLog(log, [e('Review')], NOW);
  assert.equal(once.entries.length, 1);
  assert.equal(mergeLog(once, [e('Review')], NOW).entries.length, 1);
  const twice = mergeLog(once, [e('Final', '2026-11-29T00:00:00.000Z')], new Date('2026-11-29T00:00:00Z'));
  assert.deepEqual(twice.entries.map((x) => x.to), ['Final', 'Review']);
  // flip back to an earlier value is a real change and is kept
  assert.equal(mergeLog(twice, [e('Review', '2026-11-30T00:00:00.000Z')], new Date('2026-11-30T00:00:00Z')).entries.length, 3);
  // a proposal is "new" once
  const n1 = mergeLog(log, [e('Draft', NOW.toISOString(), 'new')], NOW);
  assert.equal(mergeLog(n1, [{ ...e('Draft', NOW.toISOString(), 'new'), at: '2026-11-10T00:00:00.000Z', basis: 'created' }], NOW).entries.length, 1);
});

test(`merge: newest first, entries older than 90 days drop, at most ${MAX_ENTRIES} kept`, () => {
  const mk = (i, at) => ({ at, chain: 'Base', id: `X${i}`, title: '', kind: 'protocol', change: 'new', from: null, to: 'Draft', url: 'https://x.test', basis: 'detected' });
  const old = mk(0, '2026-08-01T00:00:00.000Z'), recent = mk(1, '2026-11-01T00:00:00.000Z');
  const m = mergeLog({ tracking_started: 'x', entries: [recent, old] }, [mk(2, NOW.toISOString())], NOW);
  assert.deepEqual(m.entries.map((e) => e.id), ['X2', 'X1']);
  const many = Array.from({ length: MAX_ENTRIES + 5 }, (_, i) => mk(i, NOW.toISOString()));
  assert.equal(mergeLog({ tracking_started: 'x', entries: [] }, many, NOW).entries.length, MAX_ENTRIES);
});

const created = [{ label: 'created', value: '2026-11-26' }];
const next = snap(chain('Tempo', [row('Tempo', 'TIP-1', { status: 'Mainnet' }), row('Tempo', 'TIP-9', { dates: created }), row('Tempo', 'TIP-10', { dates: created })]));
const prevData = snap(chain('Tempo', [row('Tempo', 'TIP-1', { status: 'Draft' }), row('Tempo', 'TIP-9', { dates: created })]));
const O = 'https://site.test';

test('update: first run (no live changes.json) starts the log from the real diff plus created-date seeds; a detected "new" is not duplicated by its seed', async () => {
  const f = fetchOf({ '/changes.json': { status: 404 }, '/data.json': { status: 200, body: prevData } });
  const log = await updateChanges(next, { origin: O, fetchFn: f, now: NOW });
  assert.equal(log.tracking_started, NOW.toISOString());
  assert.deepEqual(log.entries.map((e) => `${e.id}:${e.change}:${e.basis}`).sort(), ['TIP-10:new:detected', 'TIP-1:status:detected', 'TIP-9:new:created']);
});

test('update: second run with no upstream change adds nothing and keeps the log and its start date', async () => {
  const f1 = fetchOf({ '/changes.json': { status: 404 }, '/data.json': { status: 200, body: prevData } });
  const first = await updateChanges(next, { origin: O, fetchFn: f1, now: NOW });
  const f2 = fetchOf({ '/changes.json': { status: 200, body: first }, '/data.json': { status: 200, body: next } });
  const later = new Date('2026-11-29T10:00:00.000Z');
  const second = await updateChanges(next, { origin: O, fetchFn: f2, now: later });
  assert.deepEqual(second.entries, first.entries);
  assert.equal(second.added, 0);
  assert.equal(second.tracking_started, first.tracking_started);
});

test('update: a failed previous-snapshot fetch means no diff, and the old log is kept as is', async () => {
  const log = { tracking_started: '2026-11-01T00:00:00.000Z', entries: [{ at: '2026-11-20T00:00:00.000Z', chain: 'Tempo', id: 'TIP-5', title: '', kind: 'protocol', change: 'new', from: null, to: 'Draft', url: 'https://x.test', basis: 'detected' }] };
  for (const data of [{ status: 500 }, new Error('network down')]) {
    const f = fetchOf({ '/changes.json': { status: 200, body: log }, '/data.json': data });
    const r = await updateChanges(next, { origin: O, fetchFn: f, now: NOW });
    assert.deepEqual(r.entries, log.entries);
    assert.equal(r.added, 0);
  }
});

test('update: an unreadable live changes.json stops the build instead of wiping the log', async () => {
  for (const changes of [{ status: 503 }, new Error('network down'), { status: 200, body: { nope: true } }]) {
    const f = fetchOf({ '/changes.json': changes, '/data.json': { status: 200, body: prevData } });
    await assert.rejects(updateChanges(next, { origin: O, fetchFn: f, now: NOW }), /not overwriting the log/);
  }
});

test('getJson retries, treats 404 as missing and other failures as errors', async () => {
  let n = 0;
  const flaky = async () => (++n < 3 ? { status: 502, ok: false } : { status: 200, ok: true, json: async () => ({ ok: 1 }) });
  assert.deepEqual(await getJson('https://x.test/a', flaky), { json: { ok: 1 } });
  assert.deepEqual(await getJson('https://x.test/a', async () => ({ status: 404, ok: false })), { missing: true });
  assert.match((await getJson('https://x.test/a', async () => ({ status: 500, ok: false }), 2)).error, /HTTP 500/);
});

test('feed: RSS 2.0, escaped, newest first, empty log still valid', () => {
  const e = { at: '2026-11-28T10:00:00.000Z', chain: 'BNB Chain', id: 'BEP-1', title: 'A & B <x>', kind: 'protocol', change: 'status', from: 'Draft', to: 'Review', url: 'https://x.test/?a=1&b=2', basis: 'detected' };
  const xml = renderFeed({ generated_at: NOW.toISOString(), tracking_started: NOW.toISOString(), entries: [e] });
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<rss version="2.0"/);
  assert.match(xml, /<title>BNB Chain BEP-1: Status: Draft → Review<\/title>/);
  assert.match(xml, /<link>https:\/\/x\.test\/\?a=1&amp;b=2<\/link>/);
  assert.match(xml, /A &amp; B &lt;x&gt;\. Status: Draft → Review/);
  assert.match(xml, /<pubDate>Sat, 28 Nov 2026 10:00:00 GMT<\/pubDate>/);
  assert.equal((xml.match(/<item>/g) || []).length, 1);
  const empty = renderFeed({ generated_at: NOW.toISOString(), tracking_started: NOW.toISOString(), entries: [] });
  assert.ok(empty.includes('</channel>') && !empty.includes('<item>'));
});

test('changeText reads as a sentence for every change kind', () => {
  const b = { chain: 'Tempo', id: 'TIP-1', to: 'x' };
  assert.equal(changeText({ ...b, change: 'new', to: 'Draft' }), 'New proposal (Draft)');
  assert.equal(changeText({ ...b, change: 'status', from: 'Draft', to: 'Final' }), 'Status: Draft → Final');
  assert.equal(changeText({ ...b, change: 'target', from: null, to: 'T8' }), 'Target upgrade: not stated → T8');
  assert.equal(changeText({ ...b, change: 'date', field: 'vote end', from: '1', to: '2' }), 'vote end: 1 → 2');
});

test('weeks start on Monday 00:00 UTC and a Sunday evening stays in the previous week', () => {
  const mon = weekStartUtc('2026-11-23T00:00:00.000Z');
  assert.equal(mon, Date.parse('2026-11-23T00:00:00.000Z'));
  assert.equal(weekStartUtc('2026-11-22T23:59:59.999Z'), Date.parse('2026-11-16T00:00:00.000Z'));
  assert.equal(weekStartUtc('2026-11-23T00:00:00.001Z'), mon);
  assert.equal(weekStartUtc('2026-11-29T23:59:59.999Z'), mon);
  assert.equal(weekRangeLabel(mon), 'Nov 23 – 29, 2026');
});

test('week labels cover a range that crosses a month or a year', () => {
  assert.equal(weekRangeLabel(weekStartUtc('2026-11-30T12:00:00.000Z')), 'Nov 30 – Dec 6, 2026');
  assert.equal(weekRangeLabel(weekStartUtc('2026-12-28T00:00:00.000Z')), 'Dec 28, 2026 – Jan 3, 2027');
});

test('groupByWeek is newest week first, newest entry first within a week, and does not mutate the input', () => {
  const entries = [
    { at: '2026-11-16T10:00:00.000Z', id: 'old-week' },
    { at: '2026-11-23T08:00:00.000Z', id: 'earlier-in-week' },
    { at: '2026-11-29T12:00:00.000Z', id: 'later-in-week' },
    { at: '2026-12-01T00:00:00.000Z', id: 'next-month' },
  ];
  const copy = entries.map((e) => ({ ...e }));
  const weeks = groupByWeek(entries);
  assert.deepEqual(entries, copy);
  assert.deepEqual(weeks.map((w) => [w.label, w.entries.map((e) => e.id)]), [
    ['Nov 30 – Dec 6, 2026', ['next-month']],
    ['Nov 23 – 29, 2026', ['later-in-week', 'earlier-in-week']],
    ['Nov 16 – 22, 2026', ['old-week']],
  ]);
});
