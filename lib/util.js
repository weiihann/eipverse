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

/** Build one proposal row in the common shape.
 *  kind: 'protocol' (protocol proposals and network upgrades) or 'app standard' (ERCs, BAPs, MRCs). */
export function row({ chain, id, title, status = null, target_upgrade = null, dates = [], url, type = 'proposal', kind = 'protocol', network = null }) {
  return { chain, id: String(id), title: title?.trim() || null, status: status || null, target_upgrade: target_upgrade || null, dates: dates.filter((d) => d && d.value), url, type, kind, network };
}
