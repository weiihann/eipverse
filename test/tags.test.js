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
  assert.ok(!tag('TIP-20 Rewards cleanup').tags.includes('fee-market')); // "TIP" is not a tip
  assert.deepEqual(tag('TIP-20 Rewards cleanup', '', { type: 'TIP' }).tags, ['native-assets']);
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
  assert.equal(subOf(app('ERC-7876', 'Ethereum Network Configuration for DApps')), null); // no cluster -> other, not guessed
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
  assert.equal(sourceLabel('https://www.base.org/blog/denim'), 'Base blog');
  assert.equal(sourceLabel('https://example.org/x'), 'example.org');
  const l = sourceList([{ url: 'https://github.com/ethereum/EIPs/tree/master/EIPS' }, { url: 'https://github.com/ethereum/EIPs/blob/master/EIPS/eip-7773.md' }]);
  assert.deepEqual(l.map((x) => x.short), ['EIPs repo', 'EIP-7773']);
});

// ---------- regressions from the hand audit of every untagged row (Nov 2026) ----------
const real = (chain, id, title, abstract = '', type = 'Standards Track / Core', kind = 'protocol') => classify({ chain, id, title, abstract, type, kind });
const has = (r, t, sub) => r.tags.includes(t) && (sub === undefined || r.subs[t]?.sub === sub);

test('audit: frame transactions and friends are account abstraction', () => {
  const ft = real('Ethereum', 'EIP-8141', 'Frame Transaction', 'Add frame abstraction for transaction validation, execution, and gas payment');
  assert.equal(ft.tags[0], 'account-abstraction');
  assert.ok(has(ft, 'account-abstraction', 'native-aa') && has(ft, 'execution', 'tx-types'));
  for (const [id, title] of [['EIP-8209', 'Commit-Reveal Transaction Frames'], ['EIP-8250', 'Keyed Nonces for Frame Transactions'], ['EIP-8266', 'Expiring Nonces for Frame Transactions'], ['EIP-8272', 'Recent Roots for Frame Transactions'], ['EIP-8397', 'Frame Authenticator Signatures']])
    assert.ok(has(real('Ethereum', id, title), 'account-abstraction'), id);
  assert.ok(has(real('Ethereum', 'EIP-8130', 'Keystore Accounts', 'An onchain keystore that authorizes account actors through authenticator contracts'), 'account-abstraction'));
  assert.ok(has(tag('Native Account Abstraction', 'RIP-7560 style validation'), 'account-abstraction', 'native-aa'));
  assert.ok(has(tag('Set Code for EOAs', 'EIP-7702'), 'account-abstraction', 'eoa-delegation'));
  assert.ok(has(tag('AUTH and AUTHCALL opcodes', 'EIP-3074 lets EOAs delegate'), 'account-abstraction', 'eoa-delegation'));
  assert.ok(has(tag('Recent Block Bound Delegation Authorizations', 'Require delegation authorizations to bind to a recent block hash'), 'account-abstraction', 'eoa-delegation'));
  assert.ok(!tag('Frame pointer support for memory load and store operations').tags.includes('account-abstraction'));
});

test('audit: consensus, state and blob concepts land in the right layer and sub', () => {
  assert.ok(has(tag('Enshrined Proposer-Builder Separation', 'ePBS'), 'consensus', 'pbs-inclusion'));
  assert.ok(has(real('Ethereum', 'EIP-7928', 'Block-Level Access Lists'), 'state', 'storage-access'));
  assert.ok(has(real('Ethereum', 'EIP-7928', 'Block-Level Access Lists'), 'execution', 'parallel'));
  assert.ok(has(tag('Let exits use the consolidation queue'), 'consensus', 'validators-staking'));
  assert.ok(has(tag('Perpetually Valid Signed Voluntary Exits'), 'consensus', 'validators-staking'));
  assert.ok(has(tag('Hash-Chain RANDAO'), 'consensus', 'randomness'));
  assert.ok(has(tag('Shard Blob Transactions'), 'blobs-da', 'blob-tx'));
  assert.ok(has(tag('Bound Historical Data in Execution Clients', 'history expiry'), 'state', 'expiry-history'));
  assert.ok(has(tag('Empty accounts deprecation'), 'state', 'expiry-history'));
  assert.ok(has(tag('Chunk-Based Code Merkleization'), 'state', 'trees'));
  assert.ok(has(tag('Warm COINBASE'), 'state', 'storage-access'));
  assert.ok(has(tag('Delayed execution', 'Separate block validation from execution'), 'execution', 'parallel'));
  assert.ok(!tag('Last-Written Block for Accounts and Slots').tags.includes('consensus')); // storage slots, not consensus slots
  assert.ok(has(tag('Constantinople Difficulty Bomb Delay and Block Reward Adjustment'), 'consensus', 'pow'));
});

test('audit: SSZ, tx validity, logs and repricings', () => {
  for (const t of ['SSZ transactions', 'SSZ ProgressiveContainer', 'SSZ CompatibleUnion', 'SSZ Compact Multiproofs']) assert.ok(has(tag(t), 'networking', 'serialization'), t);
  assert.ok(has(tag('SSZ transactions'), 'execution', 'tx-types'));
  for (const t of ['Simple replay attack protection', 'Limit account nonce to 2^64-1', 'Strict enforcement of chainId', 'Conditional Transactions']) assert.ok(has(tag(t), 'execution', 'tx-types'), t);
  for (const t of ['ETH Transfers Emit a Log', 'Remove bloom filters', 'Replace cumulative receipt fields', 'Blockhash refactoring']) assert.ok(has(tag(t), 'execution', 'blocks-logs'), t);
  assert.ok(has(tag('DELEGATECALL'), 'execution', 'opcodes'));
  assert.ok(has(tag('EXP cost increase'), 'fee-market', 'repricing'));
  assert.ok(has(tag('Unified Transaction Content Floor'), 'fee-market', 'repricing'));
  assert.ok(has(tag('Precompile Falcon512 generic verifier'), 'crypto-precompiles', 'zk-pq'));
  assert.ok(!tag('eth_sendRawTransactionSync Method', 'returns the transaction hash').tags.includes('crypto-precompiles')); // a tx hash is not hashing research
  assert.ok(!tag('Announce EIP-6049 Deprecate SELFDESTRUCT').tags.includes('networking'));
});

test('audit: upgrades, meta and enshrined assets are no longer untagged', () => {
  const up = classify({ chain: 'Base', id: 'Base:Jovian', title: 'Jovian upgrade (Base mainnet)', type: 'network upgrade', kind: 'protocol' });
  assert.ok(has(up, 'governance-meta', 'hardfork-meta'));
  assert.ok(has(tag('Network Upgrade Naming', '', { type: 'Informational' }), 'governance-meta'));
  assert.ok(has(tag('On-chain upgrade signaling'), 'governance-meta', 'hardfork-meta'));
  assert.ok(has(tag('Place-only mode for next quote token', 'A new DEX function for creating trading pairs', { type: 'TIP' }), 'native-assets', 'native-dex'));
  assert.ok(has(tag('Compound Transfer Policies', 'Extends TIP-403 with compound policies', { type: 'TIP' }), 'native-assets', 'transfer-policy'));
  assert.ok(has(tag('Payment Lane on BNB Smart Chain', 'Reserve a fraction of block gas for payment transactions'), 'native-assets', 'payments'));
  assert.ok(has(tag('Mini-BEP2 Tokens'), 'native-assets', 'native-tokens'));
  assert.ok(!app('ERC-20', 'Token Standard', 'stablecoins and orders').tags.includes('native-assets')); // enshrined-asset rules skip app standards
  assert.ok(!tag('Elected block proposer has not been slashed').tags.includes('governance-meta'));
});

test('curated overrides: replace derived tags, say why, and only apply on their own chain', () => {
  const r = real('Ethereum', 'EIP-3541', 'Reject new contract code starting with the 0xEF byte', 'trie');
  assert.deepEqual(r.tags, ['execution']);
  assert.equal(r.subs.execution.sub, 'eof-bytecode');
  assert.ok(r.curated && r.why.execution[0] === 'curated');
  assert.equal(real('Ethereum', 'EIP-1', 'EIP Purpose and Guidelines', '', 'Meta').curated, null);
  assert.equal(real('BNB Chain', 'EIP-3541', 'Reject new contract code starting with the 0xEF byte', 'trie').curated, null); // wrong chain -> derived
  assert.deepEqual(real('BNB Chain', 'BEP-20', 'Tokens on BNB Smart Chain', '', 'BEP / Standards').tags, ['app-standard']);
});

import { OVERRIDES } from '../lib/tag-overrides.js';
test('curated overrides: every entry is valid and has a reason', () => {
  for (const [id, o] of Object.entries(OVERRIDES)) {
    assert.ok(o.chain && o.reason && o.reason.length > 10 && o.tags.length >= 1 && o.tags.length <= 3, id);
    assert.equal(new Set(o.tags.map((t) => t.split('/')[0])).size, o.tags.length, `${id}: duplicate layer`);
    const r = classify({ chain: o.chain, id, title: '', kind: 'protocol' }); // throws on unknown layer/sub
    assert.equal(r.curated, o.reason);
  }
});

test('audit: Polygon and Avalanche concepts', () => {
  assert.ok(has(tag('Change in SprintLength'), 'consensus', 'block-time'));
  assert.ok(has(tag('Increase BaseFeeChangeDenominator to 64'), 'fee-market', 'base-fee'));
  assert.ok(has(tag('Increase StateSync Confirmations'), 'interop-crosschain', 'messaging'));
  assert.ok(has(tag('Pectra EIPs'), 'governance-meta', 'hardfork-meta'));
  assert.ok(has(tag('MATIC to POL Migration'), 'native-assets', 'native-tokens'));
  assert.ok(has(tag('Update Membership of the Protocol Council'), 'governance-meta', 'council-treasury'));
  assert.ok(!tag('Launch Liquidity Mining program').tags.includes('consensus')); // liquidity mining is not PoW
});

test('audit: Base engineering blog posts', () => {
  const post = (id, title, abstract = '', target_upgrade = null) => classify({ chain: 'Base', id, title, abstract, target_upgrade, type: 'engineering blog post', kind: 'protocol' });
  assert.ok(has(post('blog:denim', 'Introducing Base Denim', 'Base’s fourth upgrade, Denim, is now live on mainnet.', 'Denim'), 'governance-meta', 'hardfork-meta'));
  assert.ok(has(post('blog:x', 'We’re making Base 10x faster with Flashblocks'), 'consensus', 'pbs-inclusion'));
  assert.ok(has(post('blog:y', 'Base has reached Stage 1 Decentralization'), 'interop-crosschain', 'rollups'));
  assert.ok(!post('blog:z', 'Introducing Base Beryl', 'Beryl makes Base a first-class issuance platform', 'Beryl').tags.includes('consensus'));
});
