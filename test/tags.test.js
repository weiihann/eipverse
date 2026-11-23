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

const app = (id, title, abstract = '') => classify({ id, title, abstract, kind: 'app standard', type: 'Standards Track / ERC' });
const subOf = (r, t = 'app-standard') => r.subs[t]?.sub ?? null;

test('app standard subs: the canonical ERCs land where an app developer expects', () => {
  assert.equal(subOf(app('ERC-20', 'Token Standard')), 'fungible-tokens');
  assert.equal(subOf(app('ERC-2612', 'Permit Extension for EIP-20 Signed Approvals')), 'fungible-tokens');
  assert.equal(subOf(app('ERC-721', 'Non-Fungible Token Standard')), 'nfts');
  assert.equal(subOf(app('ERC-2981', 'NFT Royalty Standard')), 'nfts');
  assert.equal(subOf(app('ERC-1155', 'Multi Token Standard')), 'multi-token');
  assert.equal(subOf(app('ERC-3525', 'Semi-Fungible Token')), 'multi-token');
  assert.equal(subOf(app('ERC-7579', 'Minimal Modular Smart Accounts')), 'smart-accounts');
  assert.equal(subOf(app('ERC-1271', 'Standard Signature Validation Method for Contracts')), 'wallets-signing');
  assert.equal(subOf(app('ERC-4626', 'Tokenized Vaults')), 'defi-vaults');
  assert.equal(subOf(app('ERC-137', 'Ethereum Domain Name Service - Specification')), 'identity-naming');
  assert.equal(subOf(app('ERC-165', 'Standard Interface Detection')), 'metadata-introspection');
  assert.equal(subOf(app('ERC-7683', 'Cross Chain Intents')), 'cross-chain');
  assert.equal(subOf(app('ERC-1337', 'Subscriptions on the blockchain')), 'payments');
  assert.equal(subOf(app('ERC-3643', 'T-REX - Token for Regulated EXchanges')), 'rwa-compliance');
  assert.equal(subOf(app('ERC-1967', 'Proxy Storage Slots')), 'proxies');
});

test('app standard subs: near-misses do not trip the wrong bucket', () => {
  assert.equal(subOf(app('ERC-3754', 'A Vanilla Non-Fungible Token Standard')), 'nfts'); // "Fungible" inside "Non-Fungible" is not fungible-tokens
  assert.equal(subOf(app('ERC-8023', 'Multi-step Contract Ownership')), 'access-control'); // ownership is not DAO voting
  assert.equal(subOf(app('EIP-8182', 'Private ETH and ERC-20 Transfers')), 'privacy');
  assert.equal(subOf(app('ERC-5850', 'Complex Numbers stored in `bytes32` types')), null); // no cluster -> other, not guessed
});

test('protocol subs: one per layer, with the matched terms', () => {
  const r = tag('PeerDAS - Peer Data Availability Sampling');
  assert.equal(subOf(r, 'blobs-da'), 'peerdas');
  assert.ok(r.subs['blobs-da'].why.length);
  assert.equal(subOf(tag('Blob Parameter Only Hardforks'), 'blobs-da'), 'blob-params');
  assert.equal(subOf(tag('State conversion to Verkle Tree'), 'state'), 'trees');
  assert.equal(subOf(tag('Fork-choice enforced Inclusion Lists (FOCIL)'), 'consensus'), 'pbs-inclusion');
  assert.equal(subOf(tag('Create eth_chainId method for JSON-RPC'), 'networking'), 'rpc');
  assert.equal(subOf(tag('Increase the gas limit to 60M'), 'fee-market'), 'gas-limits');
  assert.equal(subOf(tag('Set Code for EOAs'), 'account-abstraction'), 'eoa-delegation');
  assert.equal(subOf(tag('EXTSLOAD opcode'), 'execution'), 'opcodes');
});

test('a layer can have no sub; subs only exist for kept layers', () => {
  const r = tag('Simplify the EVM');
  assert.deepEqual(r.tags, ['execution']);
  assert.equal(r.subs.execution, undefined);
  for (const t of Object.keys(r.subs)) assert.ok(r.tags.includes(t));
});

import { sourceLabel, sourceList } from '../site/derive.js';
test('sources: one short human label per canonical URL', () => {
  assert.equal(sourceLabel('https://github.com/ethereum/EIPs/blob/master/EIPS/eip-7702.md'), 'EIPs repo');
  assert.equal(sourceLabel('https://github.com/bnb-chain/BEPs/blob/master/README.md'), 'BEPs README');
  assert.equal(sourceLabel('https://snapshot.box/#/s:arbitrumfoundation.eth/proposal/0xabc'), 'Snapshot vote');
  assert.equal(sourceLabel('https://gov.optimism.io/t/upgrade-proposal-15/9804'), 'OP forum');
  assert.equal(sourceLabel('https://github.com/ethereum-optimism/superchain-registry/blob/main/superchain/configs/mainnet/op.toml'), 'superchain-registry');
  assert.equal(sourceLabel('https://github.com/base/base/blob/main/crates/common/chains/src/config.rs'), 'chain config');
  assert.equal(sourceLabel('https://example.org/x'), 'example.org');
  const l = sourceList([{ url: 'https://github.com/ethereum/EIPs/tree/master/EIPS' }, { url: 'https://github.com/ethereum/EIPs/blob/master/EIPS/eip-7773.md' }]);
  assert.deepEqual(l.map((x) => x.short), ['EIPs repo', 'EIP-7773']);
});
