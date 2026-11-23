import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { parseMetaEip, parseErc } from '../adapters/ethereum.js';
import { parseBepIndex, parseBepPreamble, parseBepMeta, parseGoForks } from '../adapters/bnb.js';
import { parseBaseMainnet } from '../adapters/base.js';
import { parseSpecUpgrades, parseSuperchainHardforks, forumRow } from '../adapters/optimism.js';
import { parseUpgradeTable, upgradeRow, snapshotRow, parseTableDate } from '../adapters/arbitrum.js';
import { parseTip, parseTempoForks } from '../adapters/tempo.js';
import { parseMip, parseMonadMainnet } from '../adapters/monad.js';
import { runAdapter } from '../build.js';
import { statedTime, sortNewestFirst, upgradesByChain } from '../site/derive.js';

const ROW_KEYS = ['chain', 'dates', 'id', 'kind', 'network', 'status', 'target_upgrade', 'title', 'type', 'url'];
function assertRow(r) {
  assert.deepEqual(Object.keys(r).sort(), ROW_KEYS);
  assert.equal(typeof r.id, 'string');
  assert.match(r.url, /^https:\/\//);
  assert.ok(['protocol', 'app standard'].includes(r.kind));
  for (const d of r.dates) { assert.ok(d.label); assert.ok(d.value); }
}

test('every adapter file exports the common shape', async () => {
  for (const f of (await readdir(new URL('../adapters/', import.meta.url))).filter((f) => f.endsWith('.js'))) {
    const a = (await import(`../adapters/${f}`)).default;
    assert.equal(typeof a.chain, 'string', f);
    assert.equal(typeof a.fetch, 'function', f);
    assert.ok(a.sources.length && a.sources.every((s) => s.label && /^https:\/\//.test(s.url)), f);
  }
});

test('hardfork meta EIP: fork name, inclusion stages, mainnet activation', () => {
  const md = `---\neip: 7607\ntitle: Hardfork Meta - Fusaka\nstatus: Final\n---\n## Specification\n\n### Included EIPs\n\n#### Core EIPs\n\n* [EIP-7594](./eip-7594.md): PeerDAS\n\n### Considered for Inclusion\n\n* [EIP-7999](./eip-7999.md): X\n\n### Activation\n\n| Network Name | Epoch | Timestamp | Activation Time (UTC) |\n| Mainnet | 411392 | 1764798551 | 2025-12-03 21:49:11 |\n\n* [EIP-1](./eip-1.md): not a member\n\n## Rationale\n`;
  const m = parseMetaEip(md);
  assert.equal(m.fork, 'Fusaka');
  assert.deepEqual(m.members, [{ eip: '7594', stage: 'Included' }, { eip: '7999', stage: 'Considered for Inclusion' }]);
  assert.equal(m.mainnet, '2025-12-03T21:49:11Z');
  assert.equal(parseMetaEip('---\neip: 1\ntitle: EIP Purpose\n---\n'), null);
});

test('older meta EIP layouts: bullet sections, indented members, timestamp-only mainnet row', () => {
  const byz = parseMetaEip('---\neip: 609\ntitle: "Hardfork Meta: Byzantium"\n---\n## Specification\n\n- Codename: Byzantium\n- Activation:\n  - Block >= 4,370,000 on Mainnet\n- Included EIPs:\n  - [EIP-100](./eip-100.md) (Difficulty)\n  - [EIP-140](./eip-140.md) (REVERT)\n\n## References\n');
  assert.equal(byz.fork, 'Byzantium');
  assert.deepEqual(byz.members.map((m) => m.eip), ['100', '140']);
  assert.equal(byz.mainnet, null);
  const dencun = parseMetaEip('---\neip: 7569\ntitle: Hardfork Meta - Dencun\n---\n## Specification\n\n### Activation\n\n| Network Name | Activation Epoch | Activation Timestamp |\n| Mainnet | `269568` | `1710338135` |\n\n## Rationale\n');
  assert.equal(dencun.mainnet, '2024-03-13T13:55:35Z');
});

test('BEP index table and preamble', () => {
  const idx = parseBepIndex('| Number | Title | Type | Status |\n|--|--|--|--|\n| [BEP-594](./BEPs/BEP-594.md) | L2 Fast Withdrawal by TEE | Standards | Draft |\n');
  assert.deepEqual(idx, [{ id: 'BEP-594', path: 'BEPs/BEP-594.md', title: 'L2 Fast Withdrawal by TEE', type: 'Standards', status: 'Draft' }]);
  assert.equal(parseBepPreamble('<pre>\n  BEP: 594\n  Created: 2025-07-10\n</pre>').created, '2025-07-10');
  assert.equal(parseBepPreamble('no preamble').created, undefined);
  const meta = parseBepMeta('Hardfork Meta-Osaka/Mendel', '### BEPs Scheduled for Inclusion\n* [BEP-651](./BEP-651.md): X\n    * follow [BEP-381](./BEP-381.md)\n* [BEP-648](./BEP-648.md): Y\n');
  assert.deepEqual(meta, { fork: 'Osaka/Mendel', members: ['BEP-651', 'BEP-648'] });
  assert.equal(parseBepMeta('Tokens on BNB Smart Chain', ''), null);
});

test('app standards: ERCs, BAPs and MRCs are rows with kind "app standard"', () => {
  const erc = parseErc('---\neip: 20\ntitle: Token Standard\ntype: Standards Track\ncategory: ERC\nstatus: Final\ncreated: 2015-11-19\n---\n', 'ERCS/erc-20.md');
  assertRow(erc);
  assert.deepEqual([erc.id, erc.kind, erc.status, erc.url], ['ERC-20', 'app standard', 'Final', 'https://github.com/ethereum/ERCs/blob/master/ERCS/erc-20.md']);
  const [bap] = parseBepIndex('| [BAP-578](./BAPs/BAP-578.md) | BAP-578: Non-Fungible Agent (NFA) Token Standard | Application | Draft |');
  assert.deepEqual(bap, { id: 'BAP-578', path: 'BAPs/BAP-578.md', title: 'Non-Fungible Agent (NFA) Token Standard', type: 'Application', status: 'Draft' });
  assert.equal(parseBepPreamble('```\nBAP: 578\nStatus: Draft\nCreated: 2025-05-27\n```\n# BAP-578').created, '2025-05-27');
  const mrc = parseMip('---\nmip: 13\ntitle: Validator Metadata Registry\nstatus: Final\ncategory: MRC\ncreated: 2026-06-15\n---\n', 'MRCs/MRC-13.md');
  assert.deepEqual([mrc.id, mrc.kind], ['MRC-13', 'app standard']);
  assert.equal(parseMip('---\nmip: 3\ntitle: Linear Memory\nstatus: Final\n---\n', 'MIPs/MIP-3.md').kind, 'protocol');
});

test('Go chain config forks: skips genesis, keeps unscheduled as null', () => {
  const src = 'x\n\tBSCChainConfig = &ChainConfig{\n\t\tHomesteadBlock: big.NewInt(0),\n\t\tBrunoBlock: big.NewInt(13082000),\n\t\tJennerTime: newUint64(1796697000), // c\n\t\tBPO1Time: nil, // will be skipped in BSC\n\t\tAmsterdamTime: nil,\n\t}\n\tOther = &ChainConfig{\n\t\tZTime: newUint64(5),\n\t}';
  assert.deepEqual(parseGoForks(src, 'BSCChainConfig = &ChainConfig{'), [
    { name: 'Bruno', by: 'block', value: '13082000', skipped: false }, { name: 'Jenner', by: 'time', value: '1796697000', skipped: false },
    { name: 'BPO1', by: 'time', value: null, skipped: true }, { name: 'Amsterdam', by: 'time', value: null, skipped: false }]);
  assert.deepEqual(parseGoForks(src, 'missing'), []);
});

test('Base mainnet upgrade timestamps', () => {
  const src = '    /// Pectra blob schedule activation timestamp (optional, sepolia-only).\n    pub pectra_blob_schedule_timestamp: Option<u64>,\nconst MAINNET: ChainConfig = ChainConfig {\n    bedrock_block: 0,\n    jovian_timestamp: 1_764_691_201,\n    azul_timestamp: Some(1_779_991_200),\n    everest_timestamp: None,\n    pectra_blob_schedule_timestamp: None,\n};\nconst SEPOLIA: ChainConfig = ChainConfig {\n    x_timestamp: 1,\n};';
  assert.deepEqual(parseBaseMainnet(src), [
    { name: 'Jovian', value: '1764691201', sepoliaOnly: false }, { name: 'Azul', value: '1779991200', sepoliaOnly: false },
    { name: 'Everest', value: null, sepoliaOnly: false }, { name: 'Pectra Blob Schedule', value: null, sepoliaOnly: true }]);
});

test('OP specs upgrades list, registry hardfork times, forum rows', () => {
  const md = '- [Protocol]()\n  - [Protocol Upgrades]()\n    - [Canyon](./protocol/canyon/overview.md)\n      - [Sub](./protocol/canyon/x.md)\n    - [Lagoon](./protocol/lagoon/overview.md)\n  - [Other]()\n    - [Nope](./protocol/nope.md)\n';
  assert.deepEqual(parseSpecUpgrades(md).map((u) => u.name), ['Canyon', 'Lagoon']);
  assert.deepEqual(parseSuperchainHardforks('name = "Mainnet"\n[hardforks]\ncanyon_time =  1704992401 # c\n\n[l1]\nchain_id = 1\n'), { canyon: '1704992401' });
  const r = forumRow({ id: 7088, slug: 'upgrade-proposal-2', title: '[FINAL] Upgrade Proposal #2: Canyon Network Upgrade', created_at: '2023-11-14T00:00:00Z' }, ['Canyon', 'Delta']);
  assertRow(r);
  assert.equal(r.status, 'FINAL (per title)');
  assert.equal(r.target_upgrade, 'Canyon');
  assert.equal(forumRow({ id: 1, slug: 's', title: 'Upgrade Proposal #9', created_at: '2024-05-30T00:00:00Z' }).status, 'forum post');
});

test('Arbitrum network-upgrades table: dates, Sepolia-only upgrades, Snapshot votes linked only by the table', () => {
  const md = `| Upgrade | Governance Approval Status | Link | Arbitrum Sepolia (YYYY-MM-DD) | Arbitrum One (YYYY-MM-DD) | Arbitrum Nova (YYYY-MM-DD) |
| --- | --- | --- | --- | --- | --- |
| [ArbOS 61 Elara](https://docs.arbitrum.io/x/arbos61) | Approved & executed | [On-chain vote](https://alt.gov.arbitrum.foundation/proposal/1) | Mon, 2026-06-29 at 03:00:00 PM UTC | [Thu, 2026-08-20 at 05:08:23 PM UTC](https://etherscan.io/tx/0x1) | Thu, 2026-08-20 at 05:11:49 PM UTC |
| ArbOS 60 Elara | Approved & executed | [Temperature Check](https://snapshot.box/#/s:arbitrumfoundation.eth/proposal/0xABC) | Tues, 2026-05-19 at 03:57:31 PM UTC | N/A | N/A |
| ArbOS 32 Bianca | Approved & executed by the Arbitrum Security Council | N/A | Weds, 2024-09-25 at 02:06:01 UTC | Weds, 2024-09-25 at 02:37:30 UTC | Thu, 2026-01-08 5:01:13 PM UTC |`;
  const ups = parseUpgradeTable(md);
  assert.deepEqual(ups.map((u) => [u.name, u.one, u.sepolia]), [
    ['ArbOS 61 Elara', '2026-08-20T17:08:23Z', '2026-06-29T15:00:00Z'], ['ArbOS 60 Elara', null, '2026-05-19T15:57:31Z'], ['ArbOS 32 Bianca', '2024-09-25T02:37:30Z', '2024-09-25T02:06:01Z']]);
  assert.equal(ups[2].nova, '2026-01-08T17:01:13Z');
  assert.equal(parseTableDate('N/A'), null);
  const sixty = upgradeRow(ups[1]);
  assertRow(sixty);
  assert.match(sixty.status, /Sepolia only/);
  assert.deepEqual(sixty.dates.map((d) => d.label), ['Arbitrum Sepolia (testnet)']);
  assert.equal(upgradeRow(ups[0]).url, 'https://docs.arbitrum.io/x/arbos61');
  const linked = new Map([['0xabc', 'ArbOS 60 Elara']]);
  const vote = (id, title) => snapshotRow({ id, title, state: 'closed', start: 1774483200, end: 1775088000 }, linked);
  assert.equal(vote('0xAbC', '[Constitutional] AIP: ArbOS 60 Elara').target_upgrade, 'ArbOS 60 Elara');
  assert.equal(vote('0xdef', 'AIP: ArbOS 30 upgrade').target_upgrade, null);
});

test('TIP and MIP frontmatter rows', () => {
  const tip = parseTip('---\nid: TIP-1000\ntitle: State Creation Cost Increase\nstatus: Mainnet\nprotocolVersion: T1\n---\n', 'tips/tip-1000.md');
  assertRow(tip);
  assert.equal(tip.target_upgrade, 'protocol version T1');
  assert.equal(parseTip('---\nid: TIP-0000\ntitle: P\nstatus: Approved\nprotocolVersion: N/A\n---', 'tips/tip-0000.md').target_upgrade, null);
  const mip = parseMip('---\nmip: 3\ntitle: Linear Memory\nstatus: Final\ntype: Standards Track\ncategory: Core\ncreated: 2025-12-10\n---\n', 'MIPs/MIP-3.md');
  assertRow(mip);
  assert.equal(mip.id, 'MIP-3');
  assert.deepEqual(mip.dates, [{ label: 'created', value: '2025-12-10' }]);
  assert.equal(parseMip('# no frontmatter', 'x'), null);
});

test('Monad and Tempo upgrade configs skip genesis activations', () => {
  const src = 'const MONAD_MAINNET_CHAIN_CONFIG: MonadChainConfig = MonadChainConfig {\n    v_0_7_0_activation: Round::MIN,\n    v_0_11_0_activation: Round(33_493_399), // Approx 2025-11-04T14:00:00.000Z\n    execution_v_one_activation: 0,\n    execution_v_four_activation: 1762266600, // c\n};';
  assert.deepEqual(parseMonadMainnet(src).map((r) => [r.name, r.round, r.ts, r.comment]), [
    ['Consensus v0.11.0', '33493399', undefined, 'Approx 2025-11-04T14:00:00.000Z'], ['Execution v four', undefined, '1762266600', 'c']]);
  assert.deepEqual(parseTempoForks({ config: { chainId: 4217, osakaTime: 0, t0Time: 0, t1Time: 1770908400, t1aTime: 1770908400 } }).map((f) => f.name), ['T1', 'T1A']);
});

test('build: empty and failing adapters become explicit per-chain results', async () => {
  const empty = await runAdapter({ chain: 'X', sources: [], fetch: async () => ({ proposals: [], reason: 'No canonical source found: none' }) }, 'x.js');
  assert.equal(empty.status, 'empty');
  assert.equal(empty.reason, 'No canonical source found: none');
  assert.equal(empty.count, 0);
  assert.ok(empty.fetched_at);
  const err = await runAdapter({ chain: 'Y', sources: [], fetch: async () => { throw new Error('boom'); } }, 'y.js');
  assert.equal(err.status, 'error');
  assert.match(err.reason, /boom/);
});

test('built data.json rows all match the common shape', async (t) => {
  let data;
  try { data = JSON.parse(await readFile(new URL('../site/data.json', import.meta.url))); } catch { return t.skip('run npm run build first'); }
  for (const c of data.chains) {
    assert.equal(c.count, c.proposals.length);
    assert.ok(c.fetched_at && c.sources.length);
    c.proposals.forEach(assertRow);
  }
});

test('upgrades view: next/latest by stated date, targeting proposals, undated in-progress only', () => {
  const now = Date.parse('2026-11-22T00:00:00Z');
  const R = (o) => ({ chain: 'X', title: null, network: null, url: 'https://x', dates: [], status: null, target_upgrade: null, type: 'TIP', ...o });
  const act = (v) => [{ label: 'mainnet activation (UTC)', value: v }];
  const proposals = [
    R({ id: 'T13', type: 'network upgrade', status: 'activated', target_upgrade: 'protocol version T13', dates: act('2026-11-03T15:00:00Z') }),
    R({ id: 'T12', type: 'network upgrade', status: 'activated', target_upgrade: 'protocol version T12', dates: act('2026-10-13T14:00:00Z') }),
    R({ id: 'T14', type: 'network upgrade', status: 'scheduled', target_upgrade: 'protocol version T14', dates: act('2026-12-08T15:00:00Z') }),
    R({ id: 'T15', type: 'network upgrade', status: 'no mainnet time set', target_upgrade: 'protocol version T15' }),
    R({ id: 'Old', type: 'network upgrade (meta EIP)', status: 'Final', target_upgrade: 'Old' }),
    R({ id: 'TIP-1', target_upgrade: 'protocol version T14' }),
    R({ id: 'TIP-2', target_upgrade: 'protocol version T13' }),
    R({ id: 'EIP-9', target_upgrade: 'Old; protocol version T15 (Considered for Inclusion)' }),
  ];
  const [c] = upgradesByChain([{ chain: 'X', proposals }], now);
  assert.equal(c.latest.row.id, 'T13');
  assert.equal(c.latest.date, '2026-11-03T15:00:00Z');
  assert.deepEqual(c.latest.proposals.map((p) => p.id), ['TIP-2']);
  assert.equal(c.next.row.id, 'T14');
  assert.deepEqual(c.next.proposals.map((p) => p.id), ['TIP-1']);
  assert.deepEqual(c.undated.map((u) => [u.row.id, u.proposals.map((p) => p.id)]), [['T15', ['EIP-9']]]);
  const [empty] = upgradesByChain([{ chain: 'Y', proposals: [R({ id: 'A' })] }], now);
  assert.deepEqual([empty.next, empty.latest, empty.undated], [undefined, undefined, []]);
});

test('stated dates parse and sort newest-first with undated rows last', () => {
  assert.equal(statedTime('Thursday, August 20, 2026 at 17:00 UTC'), Date.parse('2026-08-20T00:00:00Z'));
  assert.equal(statedTime('Approx 2026-07-23T14:30:00.000Z'), Date.parse('2026-07-23T14:30:00Z'));
  assert.equal(statedTime('9,069,000'), null);
  const r = (id, ...vals) => ({ id, dates: vals.map((value) => ({ label: 'd', value })) });
  assert.deepEqual(sortNewestFirst([r('none'), r('old', '2017-01-01'), r('new', '2015-01-01', '2026-01-01'), r('mid', 'May 7, 2025')]).map((x) => x.id), ['new', 'mid', 'old', 'none']);
});
