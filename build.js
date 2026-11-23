// Runs every adapter in ./adapters and writes site/data.json. Adding a chain = adding one adapter file.
// Adapter contract: default export { chain, sources: [{label,url}], fetch(): Promise<{proposals, notes?, reason?}> }
import { readdir, writeFile } from 'node:fs/promises';
import { classify, SUBS } from './lib/tags.js';
import { loadDiffs, validateDiffs } from './lib/diffs.js';

export async function runAdapter(adapter, file) {
  const base = { chain: adapter.chain, adapter: `adapters/${file}`, sources: adapter.sources || [], fetched_at: new Date().toISOString() };
  try {
    const { proposals = [], notes = [], reason } = await adapter.fetch();
    for (const p of proposals) Object.assign(p, classify(p));
    if (!proposals.length) return { ...base, status: 'empty', reason: reason || 'Canonical source returned no proposals.', notes, count: 0, proposals: [] };
    return { ...base, status: 'ok', reason: null, notes, count: proposals.length, proposals };
  } catch (e) {
    return { ...base, status: 'error', reason: `Fetch failed: ${e.message}`, notes: [], count: 0, proposals: [] };
  }
}

// Chain diff tab: hand-curated facts, validated (every fact sourced and dated) before it is written.
async function writeDiffs() {
  const diffs = await loadDiffs();
  const errs = validateDiffs(diffs);
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  await writeFile(new URL('./site/diffs.json', import.meta.url), JSON.stringify(diffs));
  console.log(`wrote site/diffs.json (${diffs.chains.length} chains, ${diffs.chains.reduce((n, c) => n + Object.keys(c.facts).length, 0)} facts)`);
}

async function main() {
  if (process.argv.includes('--diffs-only')) return writeDiffs();
  const files = (await readdir(new URL('./adapters/', import.meta.url))).filter((f) => f.endsWith('.js')).sort();
  const chains = await Promise.all(files.map(async (f) => {
    const t = Date.now();
    const r = await runAdapter((await import(`./adapters/${f}`)).default, f);
    console.log(`${r.chain.padEnd(22)} ${r.status.padEnd(6)} ${String(r.count).padStart(5)} rows  ${Date.now() - t}ms ${r.reason || ''}`);
    return r;
  }));
  const taxonomy = Object.fromEntries(Object.entries(SUBS).map(([t, subs]) => [t, subs.map(([id, label]) => [id, label])]));
  const data = { generated_at: new Date().toISOString(), taxonomy, chains };
  await writeFile(new URL('./site/data.json', import.meta.url), JSON.stringify(data));
  await writeDiffs();
  console.log(`wrote site/data.json (${chains.reduce((n, c) => n + c.count, 0)} rows)`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
