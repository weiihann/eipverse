// Chain diff compare: which columns are on screen, and whether a row reads the same across them. Pure functions so the
// page and the tests share them. The selection lives in the URL as ?view=diff&c=ethereum,bsc,base (or c=all).

export const DEFAULT_COLS = ['ethereum', 'bsc', 'base'];
export const MIN_COLS = 2, MAX_COLS = 4;

// `param` is the raw `c` value; `ids` is every diff column id in page order. Returns the ids to show, in page order.
// Unknown ids and duplicates drop out, more than MAX_COLS keeps the first MAX_COLS, fewer than MIN_COLS falls back to
// the default. "all" shows every column (the full matrix).
export function parseCols(param, ids) {
  const fallback = DEFAULT_COLS.filter((id) => ids.includes(id));
  const raw = String(param || '').trim().toLowerCase();
  if (raw === 'all') return ids.slice();
  const want = new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
  const picked = ids.filter((id) => want.has(id)).slice(0, MAX_COLS);
  return picked.length >= MIN_COLS ? picked : fallback;
}

// The URL value for a selection: '' for the default (keeps the URL clean), 'all' for every column, else the ids.
export function serializeCols(cols, ids) {
  if (cols.length === ids.length && ids.length > MAX_COLS) return 'all';
  const def = DEFAULT_COLS.filter((id) => ids.includes(id));
  return cols.length === def.length && cols.every((c, i) => c === def[i]) ? '' : cols.join(',');
}

// Toggle one chain in a compare selection, keeping MIN_COLS..MAX_COLS. From the full matrix, picking a chain starts a
// fresh compare against Ethereum.
export function toggleCol(cols, id, ids) {
  if (cols.length > MAX_COLS) return parseCols(`ethereum,${id}`, ids);
  if (cols.includes(id)) return cols.length > MIN_COLS ? cols.filter((x) => x !== id) : cols;
  return cols.length < MAX_COLS ? ids.filter((x) => cols.includes(x) || x === id) : cols;
}

// 'same' when every shown chain states the same thing, 'diff' when two stated values differ, 'gap' when nothing
// differs among the stated values but at least one chain is unverified. A "=" (same as Ethereum) cell and Ethereum's
// own baseline count as Ethereum's value; other values compare as text, case- and space-insensitive.
export function rowState(facts) {
  const keys = new Set();
  let blank = false;
  for (const f of facts) {
    if (!f) { blank = true; continue; }
    keys.add(f.mark === 'base' || f.mark === '=' ? 'eth' : `v:${String(f.value).toLowerCase().replace(/\s+/g, ' ').trim()}`);
  }
  if (keys.size > 1) return 'diff';
  return blank ? 'gap' : 'same';
}
