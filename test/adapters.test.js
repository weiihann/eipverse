import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { parseMetaEip, parseErc } from '../adapters/ethereum.js';
import { parseBepIndex, parseBepPreamble, parseBepMeta, parseGoForks } from '../adapters/bnb.js';
import { parseBaseMainnet, parseRss, isChainPost, blogRow } from '../adapters/base.js';
import { parseSpecUpgrades, parseSuperchainHardforks, forumRow } from '../adapters/optimism.js';
import { parseUpgradeTable, upgradeRow, snapshotRow, parseTableDate } from '../adapters/arbitrum.js';
import { parseTip, parseTempoForks } from '../adapters/tempo.js';
import { parseMip, parseMonadMainnet } from '../adapters/monad.js';
import { parsePip, parsePrc, parseBorForks, forkRow as polygonForkRow } from '../adapters/polygon.js';
import { parseAcp, parseAvalancheMainnet, upgradeRow as avaxUpgradeRow } from '../adapters/avalanche.js';
import { decodeProposalCreated, descTitle, linkUpgrades, onchainRow, forumRow as arbForumRow, mergeStages, titleKey } from '../adapters/arbitrum.js';
import { statusBucket, sourceLabel } from '../site/derive.js';
import { parseGnosisUpgrade, upgradeRow as gnosisUpgradeRow, gipRow, parseSpecDate } from '../adapters/gnosis.js';
import { runAdapter } from '../build.js';
import { statedTime, sortNewestFirst, upgradesByChain } from '../site/derive.js';

const ROW_KEYS = ['abstract', 'chain', 'dates', 'id', 'kind', 'network', 'refs', 'shared_with', 'status', 'target_upgrade', 'title', 'type', 'url'];
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
    for (const { tags, why, subs, curated, ...r } of c.proposals) {
      assertRow(r);
      assert.ok(curated === null || (typeof curated === 'string' && curated.length > 10), r.id);
      for (const [t, s] of Object.entries(subs)) assert.ok(tags.includes(t) && s.sub && s.why.length, r.id);
      assert.ok(tags.length <= 3 && tags.every((t) => why[t]?.length), r.id);
      assert.ok(r.abstract === null || (r.abstract.length <= 261 && !/<\/?[a-z]+>/.test(r.abstract)), r.id);
    }
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

test('Polygon: PIP frontmatter (capitalized keys), PRC table, bor block forks vs chain head', () => {
  const pip = parsePip('---\nPIP: 30\nTitle: Increase Max Code Size Limit to 32KB\nDescription: From 24KB to 32KB\nStatus: Final\nType: Core\nDate: 2023-11-29\n---\n\n## Abstract\n\nx', 'PIPs/PIP-30.md');
  assertRow(pip);
  assert.equal(pip.id, 'PIP-30'); assert.equal(pip.status, 'Final'); assert.equal(pip.type, 'PIP · Core'); assert.deepEqual(pip.dates, [{ label: 'created', value: '2023-11-29' }]);
  const prc = parsePrc('| PIP | Title | Description | Status | Type | Category | Created |\n| --- | --- | --- | --- | --- | --- | --- |\n| 34 | Polygon Staking Hub | Staking layer | Draft | Standards Track | PRC | 2024-02-23 |\n', 'PIPs/PRC/PRC-34.md');
  assert.equal(prc.id, 'PRC-34'); assert.equal(prc.status, 'Draft'); assert.equal(prc.dates[0].value, '2024-02-23');
  const go = `\t\t\tHomesteadBlock: big.NewInt(0),\n\t\t\tDAOForkBlock: nil,\n\t\t\tLondonBlock: big.NewInt(23850000),\n\t\t\tBor: &params.BorConfig{\n\t\t\t\tJaipurBlock: big.NewInt(23850000),\n\t\t\t\tHampiBlock: nil, // unscheduled\n\t\t\t\tUburuBlock: big.NewInt(96787900),\n`;
  const forks = parseBorForks(go);
  assert.deepEqual(forks.map((f) => [f.name, f.block, f.scope]), [['London', '23850000', 'eth'], ['Jaipur', '23850000', 'bor'], ['Hampi', null, 'bor'], ['Uburu', '96787900', 'bor']]);
  const head = 90_000_000;
  const rows = forks.map((f) => polygonForkRow(f, head));
  rows.forEach(assertRow);
  assert.deepEqual(rows.map((r) => r.status), ['activated (block-based)', 'activated (block-based)', 'unscheduled (per source comment)', 'scheduled (block-based)']);
  assert.ok(rows.every((r) => r.dates.length === 0), 'block-based forks get no invented dates');
  assert.equal(rows[0].shared_with, 'Ethereum'); assert.deepEqual(rows[0].refs, [{ chain: 'Ethereum', upgrade: 'London' }]);
  assert.equal(rows[1].shared_with, null);
  assert.equal(polygonForkRow(forks[1], null).status, 'block-based (chain head not checked)');
});

test('Avalanche: ACP metadata table and avalanchego mainnet times', () => {
  const acp = parseAcp('| ACP           | 77 |\n| :--- | :--- |\n| **Title**     | Reinventing Subnets |\n| **Status**    | Activated ([Discussion](https://github.com/avalanche-foundation/ACPs/discussions/78)) |\n| **Track**     | Standards |\n\n## Abstract\n\nOverhaul Subnet creation and management.\n', 'ACPs/77-reinventing-subnets/README.md');
  assertRow(acp);
  assert.equal(acp.id, 'ACP-77'); assert.equal(acp.status, 'Activated'); assert.equal(acp.title, 'Reinventing Subnets'); assert.deepEqual(acp.dates, []);
  assert.equal(parseAcp('| ACP | 13 |\n| :--- | :--- |\n| **Status** | Stale |\n', 'x').status, 'Stale');
  const go = 'Mainnet = Config{\n\t\tDurangoTime:               time.Date(2024, time.March, 6, 16, 0, 0, 0, time.UTC),\n\t\tGraniteEpochDuration:      5 * time.Minute,\n\t\tIglooTime:                 UnscheduledActivationTime,\n\t}\n\tFuji = Config{\n\t\tDurangoTime: time.Date(2024, time.February, 13, 16, 0, 0, 0, time.UTC),\n';
  const ups = parseAvalancheMainnet(go);
  assert.deepEqual(ups.map((u) => u.name), ['Durango', 'Igloo'], 'Fuji times are not read');
  const [d, i] = ups.map(avaxUpgradeRow);
  assert.equal(d.dates[0].value, '2024-03-06T16:00:00Z'); assert.equal(d.status, 'activated');
  assert.equal(i.status, 'unscheduled (per source)'); assert.deepEqual(i.dates, []);
});

test('Gnosis: spec fork pages become rows that point at Ethereum EIPs; GIPs only from "GIP-<n>" votes', () => {
  assert.equal(parseSpecDate('| Mainnet | 19040000 | Nov-12-2021 09:46:20 PM +UTC  | 0x018479d3 |'), String(Date.UTC(2021, 10, 12, 21, 46, 20) / 1000));
  assert.equal(parseSpecDate('| Mainnet | 1776168380   | Apr-14-2026, 12:06:20 +UTC |'), String(Date.UTC(2026, 3, 14, 12, 6, 20) / 1000));
  assert.equal(parseSpecDate('| Mainnet | - | - |'), null);
  const md = '# Pectra Upgrade Specification\n\n## Included EIPs\n\nThis hard fork activates all EIPs also activated on Ethereum mainnet, [hard-fork EIP](https://eips.ethereum.org/EIPS/eip-7600).\n\n| EIP | Scope |   |\n| - | - | - |\n| [EIP-2537](https://eips.ethereum.org/EIPS/eip-2537): BLS precompile | EL     | Not modified\n| [EIP-7691](https://eips.ethereum.org/EIPS/eip-7691): Blob throughput increase | Both | Constants modified\n| [EIP-4844-pectra](https://eips.ethereum.org/EIPS/eip-4844): Collect Blob Gas Fee | EL | Added\n\n## Upgrade Schedule\n\n| Network | Timestamp | Date & Time (UTC) |\n| Chiado  | 1741254220 | Mar-06-2025 09:43:40 +UTC |\n| Mainnet | 1746021820 | Apr-30-2025 14:03:40 +UTC |\n';
  const u = parseGnosisUpgrade(md);
  assert.equal(u.name, 'Pectra'); assert.equal(u.mainnet, '1746021820'); assert.equal(u.metaEip, '7600');
  const r = gnosisUpgradeRow(u, 'network-upgrades/pectra.md');
  assertRow(r);
  assert.equal(r.shared_with, 'Ethereum');
  assert.deepEqual(r.refs.map((x) => x.id), ['EIP-7600', 'EIP-2537', 'EIP-7691', 'EIP-4844']);
  assert.equal(r.refs[3].note, 'Gnosis variant EIP-4844-pectra · EL · Added');
  assert.equal(r.dates[0].value, '2025-04-30T14:03:40Z');
  assert.match(r.abstract, /EIP-7691 \(Both · Constants modified\)/); assert.doesNotMatch(r.abstract, /EIP-2537/);
  const own = gnosisUpgradeRow(parseGnosisUpgrade('# Balancer Upgrade Specification\n\n## Included changes\n\nAn irregular state change unique to Gnosis.\n\n| Mainnet | - | - |\n'), 'network-upgrades/balancer.md');
  assert.equal(own.shared_with, null); assert.equal(own.status, 'no mainnet time in spec'); assert.deepEqual(own.dates, []);
  const g = gipRow({ id: '0xabc', title: 'GIP-157: Should GnosisDAO withdraw assets?', state: 'active', start: 1794921464, end: 1795526264, body: '' });
  assert.equal(g.id, 'GIP-157'); assert.equal(g.title, 'Should GnosisDAO withdraw assets?'); assert.equal(g.status, 'Snapshot active');
  assert.equal(gipRow({ id: '0xdef', title: 'Signal Gnosis Guild to revive GIP-99?', state: 'closed', start: 1, end: 2, body: '' }), null);
});

test('Base blog RSS: Engineering posts about the chain only; date from pubDate; target only for a configured upgrade name', () => {
  const item = (title, link, cat, desc = '') => `<item><title>${title}</title><link>${link}</link><pubDate>Thu, 05 Nov 2026 00:00:00 GMT</pubDate><category>${cat}</category><description>${desc}</description></item>`;
  const xml = `<rss><channel>${[
    item('Introducing Base Denim', 'https://www.base.org/blog/denim', 'Engineering', 'The latest network upgrade, Denim, is now live on mainnet.'),
    item('Flashblocks Deep Dive: How we made Base 10x faster', 'https://www.base.org/blog/flashblocks-deep-dive', 'Engineering'),
    item('How Base Pay Delivers 1-Step Crypto Payments', 'https://www.base.org/blog/1-step-crypto-payments', 'Engineering', 'Base Pay checkout.'),
    item('What&#39;s happening on Base: week of November 20', 'https://www.base.org/blog/weekly', 'Ecosystem', 'Scaling and gas news.'),
    item('How Wintermute makes markets on Base', 'https://www.base.org/customers/wintermute', 'Customer Stories'),
  ].join('')}</channel></rss>`;
  const posts = parseRss(xml);
  assert.equal(posts.length, 5);
  assert.equal(posts[3].title, "What's happening on Base: week of November 20");
  assert.deepEqual(posts.filter(isChainPost).map((p) => p.link.split('/').pop()), ['denim', 'flashblocks-deep-dive']);
  const [denim, fb] = posts.filter(isChainPost).map((p) => blogRow(p, ['Cobalt', 'Denim']));
  assertRow(denim);
  assert.equal(denim.id, 'blog:denim'); assert.equal(denim.status, 'blog post'); assert.equal(denim.target_upgrade, 'Denim');
  assert.deepEqual(denim.dates, [{ label: 'published', value: '2026-11-05' }]);
  assert.equal(fb.target_upgrade, null);
});

test('Arbitrum: governor ProposalCreated decoding, and forum/Snapshot/on-chain stages merged by title', () => {
  const desc = '# [Constitutional] AIP: Stylus Activation Contract\n\n## Abstract\n\nDeploy a contract that activates Stylus programs.';
  const enc = (n) => n.toString(16).padStart(64, '0');
  const bytes = Buffer.from(desc, 'utf8').toString('hex');
  const data = '0x' + enc(123456789n) + enc(0) + enc(0).repeat(4) + enc(100) + enc(200) + enc(9 * 32) + enc(desc.length) + bytes.padEnd(Math.ceil(bytes.length / 64) * 64, '0');
  const p = decodeProposalCreated(data);
  assert.equal(p.id, '123456789'); assert.equal(p.description, desc);
  assert.equal(descTitle(desc), '[Constitutional] AIP: Stylus Activation Contract');
  const on = onchainRow({ ...p, governor: 'Core Governor', state: 'active', date: '2026-11-20' });
  assertRow(on);
  assert.equal(on.status, 'on-chain active (Core Governor)'); assert.match(on.abstract, /Stylus programs/);
  assert.equal(titleKey('[CONSTITUTIONAL] AIP: Stylus Activation Contract'), titleKey('[Constitutional]: Stylus activation contract'));
  const forum = arbForumRow({ id: 1, slug: 'x', title: '[Constitutional] AIP: Stylus Activation Contract', created_at: '2026-10-23T00:00:00Z', last_posted_at: '2026-11-18T00:00:00Z' });
  const other = arbForumRow({ id: 2, slug: 'y', title: 'Unrelated idea', created_at: '2026-10-01T00:00:00Z' });
  const merged = mergeStages([forum, other], [], [on]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].status, 'on-chain active (Core Governor)'); assert.equal(merged[0].id, on.id);
  assert.deepEqual(merged[0].dates.map((d) => d.label), ['posted', 'last activity', 'proposed on-chain']);
  assert.equal(merged[1].status, 'forum post');
  const elara = arbForumRow({ id: 3, slug: 'z', title: '[Constitutional] AIP: ArbOS 61 Elara', created_at: '2026-03-05T00:00:00Z' });
  linkUpgrades([elara], [{ name: 'ArbOS 61 Elara', governance: 'Approved & executed' }]);
  assert.equal(elara.target_upgrade, 'ArbOS 61 Elara'); assert.equal(elara.status, 'Approved & executed (per upgrades table)');
  assert.equal(statusBucket(elara, Date.parse('2026-11-23')), 'historical');
  assert.equal(sourceLabel(on.url), 'On-chain vote (Tally)'); assert.equal(sourceLabel(elara.url), 'Arbitrum forum');
});

test('Sei: SIP metadata tables (ISO and US dates, pairs on one row), gov proposals and upgrade rows', async () => {
  const { parseSip, sipDate, govRow, upgradeRow } = await import('../adapters/sei.js');
  assert.equal(sipDate('2025-03-21'), '2025-03-21'); assert.equal(sipDate('05/07/2025'), '2025-05-07'); assert.equal(sipDate('31/12/2025'), null); assert.equal(sipDate('soon'), null);
  const sip = parseSip('**SIP-6: Autobahn Upgrade**\n\n| SIP-Number | 6 |\n| :---- | :---- |\n| Title | Autobahn Upgrade |\n| Author | A | Type | Standard (Core) |\n| Created | 10/27/2026 |\n| Status | Draft |\n\n## **Abstract**\n\nThis SIP replaces the single proposer with multiple concurrent proposers.\n', 'sips/sip-6.md');
  assertRow(sip);
  assert.deepEqual([sip.id, sip.title, sip.status, sip.type, sip.dates[0].value], ['SIP-6', 'Autobahn Upgrade', 'Draft', 'SIP · Standard (Core)', '2026-10-27']);
  assert.match(sip.abstract, /multiple concurrent proposers/);
  const p = { proposal_id: '130', status: 'PROPOSAL_STATUS_PASSED', submit_time: '2026-11-17T22:13:50Z', voting_end_time: '2026-11-20T22:13:50Z', content: { '@type': '/cosmos.upgrade.v1beta1.SoftwareUpgradeProposal', title: 'v6.8', description: 'https://github.com/sei-protocol/sei-chain/blob/main/CHANGELOG.md#v68', plan: { name: 'v6.8', height: '245131382' } } };
  const g = govRow(p);
  assertRow(g);
  assert.deepEqual([g.id, g.status, g.abstract, g.type], ['Prop 130', 'on-chain passed', null, 'Sei governance · SoftwareUpgrade']);
  assert.equal(statusBucket(g), 'historical');
  assert.equal(statusBucket({ ...g, status: 'on-chain voting period' }), 'active');
  const next = upgradeRow(p, '0', 'v6.8'), done = upgradeRow(p, '245131382', null), odd = upgradeRow(p, '0', 'v6.9');
  assertRow(next);
  assert.deepEqual([next.id, next.status, next.type, next.target_upgrade], ['Sei:v6.8', 'scheduled', 'network upgrade', 'v6.8']);
  assert.equal(done.status, 'activated'); assert.equal(odd.status, 'passed; not applied per upgrade module');
  assert.ok(!next.dates.some((d) => /activation/i.test(d.label)), 'no activation time is invented');
});

test('Hyperliquid: HIP index links and pages; no status or dates are invented', async () => {
  const { parseHipIndex, hipRow } = await import('../adapters/hyperliquid.js');
  const idx = parseHipIndex('# HIPs\n\n- [HIP-1: Native token standard](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-1-native-token-standard.md)\n- [Frontend checks](https://x/frontend-checks.md)\n');
  assert.deepEqual(idx, [{ n: '1', title: 'Native token standard', url: 'https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-1-native-token-standard' }]);
  const r = hipRow(idx[0], '> For the complete documentation index, see llms.txt.\n\n# HIP-1: Native token standard\n\nHIP-1 is a capped supply fungible token standard.&#x20;\n');
  assertRow(r);
  assert.deepEqual([r.id, r.status, r.dates, r.abstract], ['HIP-1', null, [], 'HIP-1 is a capped supply fungible token standard.']);
});

test('one chain list: market-cap order, Ethereum first, every adapter and diff column listed once', async () => {
  const { CHAINS } = await import('../site/chains.js');
  const { COLUMNS } = await import('../lib/diffs.js');
  const names = CHAINS.map((c) => c.name);
  assert.equal(names[0], 'Ethereum');
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual(COLUMNS, CHAINS.flatMap((c) => c.diff));
  const adapters = await Promise.all((await readdir(new URL('../adapters/', import.meta.url))).filter((f) => f.endsWith('.js')).map(async (f) => (await import(`../adapters/${f}`)).default.chain));
  assert.deepEqual([...adapters].sort(), [...names].sort());
  assert.ok(!names.includes('Celo'));
  for (const c of CHAINS) assert.ok(c.short && /^#[0-9A-F]{6}$/i.test(c.c) && c.logo, c.name);
  const logos = await readdir(new URL('../site/logos/', import.meta.url));
  for (const c of CHAINS) for (const f of c.themed ? [`${c.logo}-dark.svg`, `${c.logo}-light.svg`] : [`${c.logo}.svg`]) assert.ok(logos.includes(f), f);
});
