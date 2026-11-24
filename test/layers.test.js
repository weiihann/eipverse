import { test } from 'node:test';
import assert from 'node:assert/strict';
import { presentChains } from '../site/derive.js';
import { CHAINS } from '../site/chains.js';

const ORDER = CHAINS.map((c) => c.name);

test('presentChains keeps market-cap order and drops chains with no rows', () => {
  const rows = [
    { chain: 'Base' },
    { chain: 'Ethereum' },
    { chain: 'Tempo' },
    { chain: 'Ethereum' },
  ];
  assert.deepEqual(presentChains(ORDER, rows), ['Ethereum', 'Base', 'Tempo']);
});

test('presentChains omits a chain that has no rows in the current scope', () => {
  assert.deepEqual(
    presentChains(['Ethereum', 'BNB Chain', 'Hyperliquid', 'Sei'], [{ chain: 'BNB Chain' }]),
    ['BNB Chain'],
  );
});

test('presentChains is empty when no chain has a row', () => {
  assert.deepEqual(presentChains(ORDER, []), []);
  assert.deepEqual(presentChains(ORDER, [{ chain: 'Not a chain' }]), []);
});
