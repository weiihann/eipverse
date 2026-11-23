// Hyperliquid (HyperEVM): HIPs (Hyperliquid Improvement Proposals) from the official docs, which are the only place
// HIPs are published. The docs are GitBook pages; the index page lists every HIP and each page has a Markdown form
// (`<page>.md`). HIP pages state no status and no dates, so HIP rows carry neither.
// No network-upgrade source exists: hl-node ships as signed binaries (hyperliquid-dex/node) with no published
// upgrade schedule or chain config, so Hyperliquid has no network-upgrade rows.
import { fetchText, pool, row, firstParagraph } from '../lib/util.js';

const CHAIN = 'Hyperliquid';
const DOCS = 'https://hyperliquid.gitbook.io/hyperliquid-docs';
const INDEX = `${DOCS}/hyperliquid-improvement-proposals-hips`;

/** Index page Markdown: `- [HIP-3: Builder-deployed perpetuals](https://.../hip-3-builder-deployed-perpetuals.md)` lines. */
export function parseHipIndex(md) {
  const out = [];
  for (const m of String(md || '').matchAll(/\[HIP-(\d+):\s*([^\]]+)\]\((https:\/\/[^)\s]+?)(?:\.md)?\)/g)) {
    if (!out.some((h) => h.n === m[1])) out.push({ n: m[1], title: m[2].trim(), url: m[3] });
  }
  return out;
}

/** One HIP page: first prose paragraph after the `# HIP-n` heading (the GitBook preamble quote is skipped). */
export function hipRow(h, md) {
  const body = String(md || '').replace(/&#x20;/g, ' ').replace(/^>.*$/gm, '').replace(/\{%[^%]*%\}/g, '');
  return row({ chain: CHAIN, id: `HIP-${h.n}`, title: h.title, abstract: firstParagraph(body.replace(/^#\s.*$/m, '')), url: h.url, type: 'HIP' });
}

export default {
  chain: CHAIN,
  sources: [{ label: 'Hyperliquid docs: Hyperliquid Improvement Proposals (HIPs) index and HIP pages', url: INDEX }],
  async fetch() {
    const hips = parseHipIndex(await fetchText(`${INDEX}.md`));
    const rows = await pool(hips, 4, async (h) => hipRow(h, await fetchText(`${h.url}.md`)));
    return {
      proposals: rows,
      notes: [
        'HIP pages in the official docs state no status and no dates, so HIP rows have neither.',
        'No network-upgrade source: hl-node ships as signed binaries (github.com/hyperliquid-dex/node) with no published upgrade schedule, so there are no Hyperliquid upgrade rows.',
      ],
      reason: hips.length ? undefined : 'The HIP index page listed no HIP-<n> pages.',
    };
  },
};
