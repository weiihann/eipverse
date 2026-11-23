// Shared helpers for adapters: HTTP with retry, GitHub listing, frontmatter parsing.
const UA = { 'user-agent': 'eipverse/0.1' };

export async function fetchText(url, { headers = {}, method = 'GET', body } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { method, body, headers: { ...UA, ...headers }, signal: AbortSignal.timeout(30000) });
      if (res.status === 404) throw Object.assign(new Error(`404 ${url}`), { permanent: true });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${url}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      if (e.permanent) break;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function fetchJson(url, opts) {
  return JSON.parse(await fetchText(url, opts));
}

function ghHeaders() {
  const h = { accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) h.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

/** List files in a GitHub directory (one API call). Returns [{name, path, type}]. */
export async function ghList(repo, path, ref) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${ref}`;
  return fetchJson(url, { headers: ghHeaders() });
}

export const raw = (repo, ref, path) => `https://raw.githubusercontent.com/${repo}/${ref}/${path}`;
export const blob = (repo, ref, path) => `https://github.com/${repo}/blob/${ref}/${path}`;
export const tree = (repo, ref, path) => `https://github.com/${repo}/tree/${ref}/${path}`;

/** Parse a leading `---` YAML-ish frontmatter block of `key: value` lines. */
export function parseFrontmatter(text) {
  const m = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) out[kv[1].toLowerCase()] = kv[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

/** Run async fn over items with bounded concurrency, preserving order. */
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

/** Unix seconds -> ISO date-time (UTC). */
export const isoFromUnix = (s) => new Date(Number(s) * 1000).toISOString().replace('.000Z', 'Z');

/** Status for a fork whose source states an activation timestamp (factual comparison with now). */
export function forkStatus(ts, now = Date.now()) {
  if (ts == null) return 'no mainnet time set';
  return Number(ts) * 1000 <= now ? 'activated' : 'scheduled';
}

/** Plain-text excerpt: markdown/HTML stripped, whitespace collapsed, cut at a word boundary. */
export function clip(text, max = 260) {
  if (!text) return null;
  const t = String(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]+/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' })[e])
    .replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : cut.length).replace(/[\s,;:.\-–]+$/, '')}…`;
}

/** First paragraph under a markdown heading named like one of `names` (e.g. "## 1. Summary", "# Abstract"). */
export function sectionText(md, names = ['abstract', 'summary']) {
  const lines = String(md || '').split(/\r?\n/);
  const head = new RegExp(`^\\s*(#{1,6}\\s*|\\*\\*)?(\\d+\\.\\s*)?(executive\\s+)?(${names.join('|')})\\s*(\\*\\*)?:?\\s*$`, 'i');
  const i = lines.findIndex((l) => head.test(l));
  if (i < 0) return null;
  const body = [];
  for (const l of lines.slice(i + 1)) { if (/^\s*#{1,6}\s/.test(l)) break; body.push(l); }
  return firstParagraph(body.join('\n'), 1);
}

/** First prose paragraph of a markdown body (skips headings, author/metadata lines, lists). */
const CHATTER = /^(hi|hello|hey|gm|dear)\b|\b(do(es)? not|neither) .{0,60}\b(represent|speak on behalf)/i;
export function firstParagraph(md, min = 30) {
  for (const para of String(md || '').split(/\n\s*\n/)) {
    const t = para.trim();
    if (!t || /^(#|[-*|>]|\*\*[^*]+:\*\*)/.test(t) || CHATTER.test(t) || t.length < min) continue;
    return clip(t.replace(/\s*\n\s*/g, ' '));
  }
  return null;
}

/** Build one proposal row in the common shape.
 *  kind: 'protocol' (protocol proposals and network upgrades) or 'app standard' (ERCs, BAPs, MRCs).
 *  abstract: the source's own short description or first summary paragraph, clipped; null when it has none. */
export function row({ chain, id, title, status = null, target_upgrade = null, dates = [], url, type = 'proposal', kind = 'protocol', network = null, abstract = null }) {
  return { chain, id: String(id), title: title?.trim() || null, status: status || null, target_upgrade: target_upgrade || null, dates: dates.filter((d) => d && d.value), url, type, kind, network, abstract: clip(abstract) };
}

/** Discourse "cooked" HTML -> markdown-ish text (headings and paragraphs kept) for sectionText/firstParagraph. */
export function htmlToText(html) {
  return String(html || '')
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, t) => `\n\n## ${t.replace(/<[^>]+>/g, '').trim()}\n\n`)
    .replace(/<\/(p|li|ul|ol|table|div|blockquote)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '');
}
