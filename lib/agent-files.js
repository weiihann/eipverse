// Build-time files for agents: site/llms.txt and one JSON file per chain at site/api/<adapter-id>.json.
import { mkdir, writeFile } from 'node:fs/promises';
import { CHAINS } from '../site/chains.js';

export const ORIGIN = 'https://eipverse.com';

export function adapterId(chain) {
  const m = String(chain.adapter || '').match(/^adapters\/([a-z0-9-]+)\.js$/);
  if (!m) throw new Error(`cannot derive api id from adapter path: ${chain.adapter}`);
  return m[1];
}

export function orderedChains(data) {
  const byName = new Map((data.chains || []).map((c) => [c.chain, c]));
  const out = [];
  for (const c of CHAINS) {
    const row = byName.get(c.name);
    if (row) out.push(row);
  }
  const seen = new Set(out.map((c) => c.chain));
  for (const c of data.chains || []) if (!seen.has(c.chain)) out.push(c);
  return out;
}

function mdLink(label, url) {
  return `[${String(label).replace(/[\[\]]/g, '')}](${url})`;
}

export function renderLlmsTxt(data) {
  const chains = orderedChains(data);
  const total = chains.reduce((n, c) => n + (c.count || 0), 0);
  const when = data.generated_at || 'not recorded';
  const examples = chains.slice(0, 2).map((c) => mdLink(adapterId(c), `${ORIGIN}/api/${adapterId(c)}.json`)).join(', ');
  const chainLines = chains.map((c) => {
    const id = adapterId(c);
    const src = (c.sources || []).map((s) => mdLink(s.label, s.url)).join(', ');
    return `- ${mdLink(c.chain, `${ORIGIN}/api/${id}.json`)}: ${c.count} proposals, status ${c.status}${src ? `. Sources: ${src}` : ''}.`;
  }).join('\n');

  return `# eipverse

> Improvement proposals across EVM chains, side by side, tagged by protocol layer and read from each chain's canonical sources. The interactive site is a static page that loads JSON in the browser; agents should fetch the data endpoints below rather than scraping the rendered tables.

This file is generated at build time from the same data the site ships. The last build was ${when}. Data is rebuilt daily from the canonical sources (and on every push to the repository). Endpoints are served with \`Access-Control-Allow-Origin: *\`.

## Views

The HTML app is at ${mdLink('eipverse.com', `${ORIGIN}/`)}. Views are selected with \`?view=\`:

- ${mdLink('Proposals', `${ORIGIN}/?view=proposals`)}: one row per proposal, filterable by chain, layer, status, and kind.
- ${mdLink('Changes', `${ORIGIN}/?view=changes`)}: what changed between daily builds: new proposals, status changes, upgrade target and date changes, grouped by week (Monday–Sunday, UTC).
- ${mdLink('By layer', `${ORIGIN}/?view=layers`)}: a layer × chain matrix.
- ${mdLink('Chain diff', `${ORIGIN}/?view=diff`)}: how each chain differs from Ethereum on protocol dimensions such as fees, the EVM, and precompiles.
- ${mdLink('Upgrades', `${ORIGIN}/?view=upgrades`)}: network upgrades grouped by chain.
- ${mdLink('Sources', `${ORIGIN}/?view=sources`)}: the canonical sources each adapter reads.

These views need JavaScript. Use the JSON endpoints for the underlying data.

## Data

- ${mdLink('data.json', `${ORIGIN}/data.json`)}: all ${chains.length} chains and ${total} proposals. An object with \`generated_at\`, \`taxonomy\`, and \`chains\`.
- ${mdLink('changes.json', `${ORIGIN}/changes.json`)}: the change log, newest first, at most 1000 entries from the last 90 days. An object with \`generated_at\`, \`tracking_started\`, and \`entries\`.
- ${mdLink('feed.xml', `${ORIGIN}/feed.xml`)}: the same log as an RSS 2.0 feed (latest 100).
- ${mdLink('diffs.json', `${ORIGIN}/diffs.json`)}: the chain-diff dataset. An object with \`groups\`, \`dimensions\`, \`columns\`, \`marks\`, and \`chains\`.
- Per-chain proposal files at \`/api/<id>.json\`, where \`<id>\` is the adapter filename stem${examples ? ` (for example ${examples})` : ''}. Each file is one element of \`data.json\`'s \`chains\` array.

\`taxonomy\` maps a layer id to \`[id, label]\` subcategory pairs. Each \`chains[]\` entry has \`chain\`, \`adapter\`, \`sources\` (\`[{label, url}]\`), \`fetched_at\`, \`status\` (\`ok\`, \`empty\`, or \`error\`), \`reason\`, \`notes\`, \`count\`, and \`proposals\`. Each proposal has \`chain\`, \`id\`, \`title\`, \`status\`, \`target_upgrade\`, \`dates\` (\`[{label, value}]\`), \`url\`, \`type\`, \`kind\` (\`protocol\` or \`app standard\`), \`network\`, \`abstract\`, \`shared_with\`, \`refs\`, \`tags\`, \`why\`, \`subs\`, and \`curated\` (a reason string when tags were set by hand, otherwise \`null\`).

Each \`changes.json\` entry has \`at\` (UTC time the build detected it), \`chain\`, \`id\`, \`title\`, \`kind\`, \`change\` (\`new\`, \`status\`, \`target\`, or \`date\`), \`field\` (the date label, only for \`date\`), \`from\` (\`null\` when not stated before), \`to\`, \`url\` (canonical source), and \`basis\`. \`basis\` is \`detected\` when two builds differed, or \`created\` for a proposal first seen when tracking started, where \`at\` is the created date its source states. Chains whose source failed in either build are skipped, and removals are not reported.

Each \`diffs.json\` \`chains[]\` entry has \`id\`, \`chain\`, \`label\`, \`logo\`, \`role\`, \`as_of\`, and \`facts\` keyed by dimension id. Each fact has \`mark\`, \`value\`, \`as_of\`, \`kind\`, \`sources\` (\`[{label, url}]\`), and optional \`items\`.

## Chains

${chainLines}

## Optional

- ${mdLink('GitHub repository', 'https://github.com/weiihann/eipverse')}
- ${mdLink('robots.txt', `${ORIGIN}/robots.txt`)}
- ${mdLink('sitemap.xml', `${ORIGIN}/sitemap.xml`)}
`;
}

export async function writeAgentFiles(data, dir = new URL('../site/', import.meta.url)) {
  const apiDir = new URL('api/', dir);
  await mkdir(apiDir, { recursive: true });
  await writeFile(new URL('llms.txt', dir), renderLlmsTxt(data));
  let n = 0;
  for (const c of data.chains || []) {
    await writeFile(new URL(`${adapterId(c)}.json`, apiDir), JSON.stringify(c));
    n++;
  }
  return n;
}
