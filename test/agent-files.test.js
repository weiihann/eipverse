import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { adapterId, orderedChains, renderLlmsTxt, writeAgentFiles, ORIGIN } from '../lib/agent-files.js';
import { CHAINS } from '../site/chains.js';

const root = new URL('../', import.meta.url);

const fixture = {
  generated_at: '2026-11-28T00:00:00.000Z',
  taxonomy: { execution: [['opcodes', 'Opcodes']] },
  chains: [
    {
      chain: 'Tempo',
      adapter: 'adapters/tempo.js',
      sources: [{ label: 'TIPs', url: 'https://github.com/tempoxyz/tempo' }],
      fetched_at: '2026-11-28T00:00:00.000Z',
      status: 'ok',
      reason: null,
      notes: [],
      count: 3,
      proposals: [{ chain: 'Tempo', id: 'TIP-0000', title: 'TIP Process', status: 'Approved' }],
    },
    {
      chain: 'Ethereum',
      adapter: 'adapters/ethereum.js',
      sources: [{ label: 'EIPs', url: 'https://github.com/ethereum/EIPs' }],
      fetched_at: '2026-11-28T00:00:00.000Z',
      status: 'ok',
      reason: null,
      notes: [],
      count: 7,
      proposals: [{ chain: 'Ethereum', id: 'EIP-1', title: 'Purpose', status: 'Living' }],
    },
  ],
};

test('robots.txt allows all crawlers and points at the sitemap', async () => {
  const text = await readFile(new URL('site/robots.txt', root), 'utf8');
  assert.match(text, /^User-agent: \*\nAllow: \/\n/m);
  assert.match(text, /^Sitemap: https:\/\/eipverse\.com\/sitemap\.xml$/m);
  assert.doesNotMatch(text, /Disallow:/);
});

test('sitemap.xml lists the real view URLs', async () => {
  const text = await readFile(new URL('site/sitemap.xml', root), 'utf8');
  const locs = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, [
    `${ORIGIN}/`,
    `${ORIGIN}/?view=proposals`,
    `${ORIGIN}/?view=layers`,
    `${ORIGIN}/?view=diff`,
    `${ORIGIN}/?view=upgrades`,
    `${ORIGIN}/?view=sources`,
  ]);
});

test('_headers allows cross-origin reads of static assets', async () => {
  const text = await readFile(new URL('site/_headers', root), 'utf8');
  assert.match(text, /^\/\*\n\s+Access-Control-Allow-Origin: \*$/m);
});

test('index.html has a noscript summary and points at llms.txt and data.json', async () => {
  const html = await readFile(new URL('site/index.html', root), 'utf8');
  assert.match(html, /<title>eipverse · improvement proposals across EVM chains<\/title>/);
  assert.match(html, /<meta name="description" content="Improvement proposals across EVM chains, side by side, tagged by protocol layer and read from each chain's canonical sources.">/);
  const noscript = html.match(/<noscript>\s*<p>([\s\S]*?)<\/p>\s*<\/noscript>/);
  assert.ok(noscript, 'expected a noscript paragraph');
  assert.match(noscript[1], /href="data\.json"/);
  assert.match(noscript[1], /href="llms\.txt"/);
});

test('adapterId is the adapter filename stem', () => {
  assert.equal(adapterId({ adapter: 'adapters/ethereum.js' }), 'ethereum');
  assert.equal(adapterId({ adapter: 'adapters/bnb.js' }), 'bnb');
  assert.throws(() => adapterId({ adapter: 'adapters/../secret.js' }));
});

test('orderedChains follows site/chains.js and appends unknown chains', () => {
  const names = orderedChains(fixture).map((c) => c.chain);
  assert.deepEqual(names, ['Ethereum', 'Tempo']);
  const extra = orderedChains({
    chains: [...fixture.chains, { chain: 'New Chain', adapter: 'adapters/new-chain.js', count: 1, status: 'ok', sources: [] }],
  }).map((c) => c.chain);
  assert.equal(extra[0], 'Ethereum');
  assert.equal(extra.at(-1), 'New Chain');
  assert.ok(CHAINS.some((c) => c.name === 'Ethereum'));
});

test('renderLlmsTxt follows the llms.txt convention and describes the real schema', () => {
  const text = renderLlmsTxt(fixture);
  assert.match(text, /^# eipverse\n/);
  assert.match(text, /^> Improvement proposals across EVM chains/m);
  assert.match(text, /rebuilt daily from the canonical sources/);
  assert.match(text, /2026-11-28T00:00:00.000Z/);
  assert.match(text, /all 2 chains and 10 proposals/);
  for (const view of ['proposals', 'layers', 'diff', 'upgrades', 'sources']) {
    assert.match(text, new RegExp(`${ORIGIN.replace(/[./]/g, '\\$&')}/\\?view=${view}`));
  }
  for (const field of [
    'generated_at', 'taxonomy', 'chains', 'adapter', 'sources', 'fetched_at', 'status',
    'reason', 'notes', 'count', 'proposals', 'target_upgrade', 'dates', 'kind',
    'network', 'abstract', 'shared_with', 'refs', 'tags', 'why', 'subs', 'curated',
    'groups', 'dimensions', 'columns', 'marks', 'facts', 'as_of', 'items',
  ]) {
    assert.match(text, new RegExp(`\`${field}\``), field);
  }
  assert.match(text, /\[Ethereum\]\(https:\/\/eipverse\.com\/api\/ethereum\.json\): 7 proposals, status ok/);
  assert.match(text, /\[Tempo\]\(https:\/\/eipverse\.com\/api\/tempo\.json\): 3 proposals, status ok/);
  const eth = text.indexOf('[Ethereum]');
  const tempo = text.indexOf('[Tempo](https://eipverse.com/api/tempo.json): 3');
  assert.ok(eth < tempo, 'chains should appear in site/chains.js order');
});

test('writeAgentFiles writes llms.txt and parseable per-chain JSON', async () => {
  const dir = pathToFileURL(await mkdtemp(join(tmpdir(), 'eipverse-agent-')) + '/');
  const n = await writeAgentFiles(fixture, dir);
  assert.equal(n, 2);
  const llms = await readFile(new URL('llms.txt', dir), 'utf8');
  assert.equal(llms, renderLlmsTxt(fixture));
  const eth = JSON.parse(await readFile(new URL('api/ethereum.json', dir), 'utf8'));
  const tempo = JSON.parse(await readFile(new URL('api/tempo.json', dir), 'utf8'));
  assert.equal(eth.chain, 'Ethereum');
  assert.equal(eth.count, 7);
  assert.equal(eth.proposals[0].id, 'EIP-1');
  assert.equal(tempo.chain, 'Tempo');
  assert.equal(tempo.count, 3);
});

test('build outputs parse when present', async (t) => {
  try { await access(new URL('site/data.json', root)); } catch { t.skip('site/data.json not built'); return; }
  const data = JSON.parse(await readFile(new URL('site/data.json', root), 'utf8'));
  assert.ok(data.generated_at && Array.isArray(data.chains));
  const llms = await readFile(new URL('site/llms.txt', root), 'utf8');
  assert.match(llms, /^# eipverse\n/);
  assert.match(llms, new RegExp(data.generated_at.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  for (const c of data.chains) {
    const body = JSON.parse(await readFile(new URL(`site/api/${adapterId(c)}.json`, root), 'utf8'));
    assert.equal(body.chain, c.chain);
    assert.equal(body.count, c.count);
    assert.ok(Array.isArray(body.proposals));
  }
  const diffs = JSON.parse(await readFile(new URL('site/diffs.json', root), 'utf8'));
  assert.ok(Array.isArray(diffs.chains) && Array.isArray(diffs.dimensions));
});
