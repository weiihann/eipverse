import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDiffs, validateDiffs, DIMENSIONS, COLUMNS } from '../lib/diffs.js';

const diffs = await loadDiffs();

test('chain diff data passes schema validation', () => {
  assert.deepEqual(validateDiffs(diffs), []);
});

test('every non-blank cell has an https source URL and an ISO as-of date', () => {
  for (const c of diffs.chains) for (const [dim, f] of Object.entries(c.facts)) {
    assert.ok(f.sources.length > 0, `${c.id}.${dim} has no source`);
    for (const s of f.sources) assert.match(s.url, /^https:\/\/\S+$/, `${c.id}.${dim}`);
    assert.match(f.as_of, /^\d{4}-\d{2}-\d{2}$/, `${c.id}.${dim}`);
    assert.ok(!Number.isNaN(Date.parse(f.as_of)), `${c.id}.${dim} as_of parses`);
  }
});

test('Ethereum holds the baseline for every dimension; others only use delta marks', () => {
  const eth = diffs.chains.find((c) => c.id === 'ethereum');
  for (const [dim] of DIMENSIONS) assert.equal(eth.facts[dim]?.mark, 'base', `ethereum.${dim}`);
  for (const c of diffs.chains.filter((x) => x.id !== 'ethereum')) for (const [dim, f] of Object.entries(c.facts)) assert.ok(['+', '-', '~', '='].includes(f.mark), `${c.id}.${dim}`);
});

test('every column is present once, in order, and a missing dimension stays blank', () => {
  assert.deepEqual(diffs.chains.map((c) => c.id), COLUMNS);
  const blanks = diffs.chains.reduce((n, c) => n + DIMENSIONS.filter(([d]) => !(d in c.facts)).length, 0);
  assert.ok(blanks > 0, 'some cells are expected to be unsourced blanks');
});

test('observed facts name the RPC block they were read at', () => {
  for (const c of diffs.chains) for (const [dim, f] of Object.entries(c.facts)) if (f.kind === 'observed') assert.ok(f.sources.some((s) => /block/i.test(s.label)), `${c.id}.${dim}`);
});

test('lineage edges are sourced and point at known columns', () => {
  assert.ok(diffs.lineage.edges.length > 0);
  for (const e of diffs.lineage.edges) {
    assert.ok(COLUMNS.includes(e.to), e.to);
    assert.ok(e.sources.length > 0 && e.sources.every((s) => s.url.startsWith('https://')), `${e.from}->${e.to}`);
  }
});

test('validator rejects an unsourced or undated fact', () => {
  const bad = structuredClone(diffs);
  const c = bad.chains.find((x) => x.id === 'base');
  const dim = Object.keys(c.facts)[0];
  c.facts[dim].sources = [];
  delete c.facts[dim].as_of;
  const errs = validateDiffs(bad);
  assert.ok(errs.some((e) => e.includes('no source')));
  assert.ok(errs.some((e) => e.includes('missing as_of')));
});
