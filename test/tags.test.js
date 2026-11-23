import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, TAGS } from '../lib/tags.js';
import { clip, sectionText, firstParagraph, htmlToText } from '../lib/util.js';
import { statusBucket } from '../site/derive.js';

const tag = (title, abstract = '', extra = {}) => classify({ id: 'EIP-1', title, abstract, kind: 'protocol', type: 'Standards Track / Core', ...extra });

test('real proposal titles get the layer a protocol engineer would expect', () => {
  assert.deepEqual(tag('PeerDAS - Peer Data Availability Sampling').tags.slice(0, 1), ['blobs-da']);
  assert.ok(tag('Set Code for EOAs', 'Add a new tx type that permanently sets the code for an EOA').tags.includes('account-abstraction'));
  assert.ok(tag('Precompile for BLS12-381 curve operations').tags.includes('crypto-precompiles'));
  assert.ok(tag('Fork-choice enforced Inclusion Lists (FOCIL)').tags.includes('consensus'));
  assert.ok(tag('Increase calldata cost').tags.includes('fee-market'));
  assert.ok(tag('Verkle state tree').tags.includes('state'));
  assert.ok(tag('eth/69 - history serving and simpler receipts').tags.includes('networking'));
  assert.ok(tag('EOF - EVM Object Format').tags.includes('execution'));
});

test('word boundaries: substrings never trigger a tag', () => {
  assert.deepEqual(tag('Stated intentionally: the gaslight protocol', 'Statement about Stakeholders and Tipping').tags, []);
  assert.deepEqual(tag('TIP-20 Rewards cleanup').tags, []);
  assert.ok(!tag('Validator voting rules for fast finality').tags.includes('governance-meta'));
  assert.ok(!tag('Token ownership on BNB Beacon Chain').tags.includes('consensus'));
});

test('at most three tags, from the fixed taxonomy, each with the terms that matched', () => {
  const r = tag('Gas repricing for blob precompile state access in EVM consensus');
  assert.ok(r.tags.length <= 3 && r.tags.every((t) => TAGS.includes(t)));
  for (const t of r.tags) assert.ok(r.why[t].length > 0);
});

test('structural tags come from stated kind and category', () => {
  assert.deepEqual(classify({ id: 'ERC-4626', title: 'Tokenized Vaults', kind: 'app standard', type: 'Standards Track / ERC' }).tags, ['app-standard']);
  assert.ok(classify({ id: 'EIP-1', title: 'EIP Purpose and Guidelines', kind: 'protocol', type: 'Meta' }).tags.includes('governance-meta'));
  assert.deepEqual(tag('Forkid checks', '', { type: 'Standards Track / Networking' }).why.networking, ['category: Networking']);
});

test('no matching terms -> untagged, not guessed', () => {
  assert.deepEqual(tag('Simplify EIP-161').tags, []);
});

test('abstract helpers: clip at a word boundary, pick the summary section', () => {
  const c = clip('word '.repeat(100));
  assert.ok(c.length <= 261 && c.endsWith('…') && !c.includes('  '));
  assert.equal(clip(''), null);
  assert.equal(sectionText('# T\n\n## 1. Summary\n\nShort **bold** text.\n\n## 2. Motivation\n\nNo.', ['summary']), 'Short bold text.');
  assert.equal(sectionText('## Motivation\n\nNo.', ['summary']), null);
  assert.equal(firstParagraph(htmlToText('<h2>Title</h2><p>Hi, I am Bob.</p><p>This upgrade raises the gas limit.</p>')), 'This upgrade raises the gas limit.');
});

test('status buckets: shipped/closed is historical, in-flight is active, unknown stays visible', () => {
  const b = (status, dates = []) => statusBucket({ status, dates }, Date.parse('2026-11-22'));
  for (const s of ['Draft', 'Review', 'Last Call', 'Candidate', 'Approved', 'scheduled', 'no mainnet time set']) assert.equal(b(s), 'active', s);
  for (const s of ['Final', 'Stagnant', 'Withdrawn', 'Enabled', 'Mainnet', 'activated', 'Approved & executed', 'Snapshot closed', 'skipped (per source comment)']) assert.equal(b(s), 'historical', s);
  assert.equal(b(null), 'active');
  assert.equal(b('forum post', [{ label: 'posted', value: '2026-11-01' }]), 'active');
  assert.equal(b('forum post', [{ label: 'posted', value: '2024-01-01' }]), 'historical');
});
