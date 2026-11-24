import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCols, serializeCols, toggleCol, rowState, DEFAULT_COLS } from '../site/compare.js';

const ids = ['ethereum', 'bsc', 'opbnb', 'hyperliquid', 'avalanche', 'arbitrum', 'base', 'tempo'];

test('URL selection: known ids, page order, deduped, capped at 4, default when too few', () => {
  assert.deepEqual(parseCols('base,ethereum,bsc', ids), ['ethereum', 'bsc', 'base']);
  assert.deepEqual(parseCols('base,base,nope,arbitrum', ids), ['arbitrum', 'base']);
  assert.deepEqual(parseCols('tempo,base,arbitrum,avalanche,bsc', ids), ['bsc', 'avalanche', 'arbitrum', 'base']);
  assert.deepEqual(parseCols('base', ids), DEFAULT_COLS);
  assert.deepEqual(parseCols('', ids), DEFAULT_COLS);
  assert.deepEqual(DEFAULT_COLS, ['ethereum', 'bsc', 'tempo']);
  assert.equal(serializeCols(['ethereum', 'bsc', 'base'], ids), 'ethereum,bsc,base');
  assert.deepEqual(parseCols(null, ids), DEFAULT_COLS);
  assert.deepEqual(parseCols('ALL', ids), ids);
});

test('URL selection round-trips, with the default kept out of the URL', () => {
  assert.equal(serializeCols(DEFAULT_COLS, ids), '');
  assert.equal(serializeCols(ids, ids), 'all');
  for (const p of ['ethereum,arbitrum', 'bsc,opbnb,tempo', 'all']) assert.equal(serializeCols(parseCols(p, ids), ids), p);
});

test('toggling keeps 2 to 4 chains', () => {
  assert.deepEqual(toggleCol(['ethereum', 'bsc'], 'bsc', ids), ['ethereum', 'bsc']);
  assert.deepEqual(toggleCol(['ethereum', 'bsc', 'base'], 'bsc', ids), ['ethereum', 'base']);
  assert.deepEqual(toggleCol(['ethereum', 'base'], 'arbitrum', ids), ['ethereum', 'arbitrum', 'base']);
  assert.deepEqual(toggleCol(['ethereum', 'bsc', 'arbitrum', 'base'], 'tempo', ids), ['ethereum', 'bsc', 'arbitrum', 'base']);
  assert.deepEqual(toggleCol(ids, 'tempo', ids), ['ethereum', 'tempo']);
});

test('row state: same, differs, or unverified gap', () => {
  const eth = { mark: 'base', value: 'Burned' };
  assert.equal(rowState([eth, { mark: '=', value: 'EIP-7825 adopted' }]), 'same');
  assert.equal(rowState([{ mark: '-', value: 'Not  supported' }, { mark: '-', value: 'not supported' }]), 'same');
  assert.equal(rowState([eth, { mark: '~', value: 'Kept in vault' }]), 'diff');
  assert.equal(rowState([eth, undefined, { mark: '~', value: 'x' }]), 'diff');
  assert.equal(rowState([eth, undefined]), 'gap');
});
