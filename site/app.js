// eipverse page: one data.json, four views, all state in the URL.
import { sortNewestFirst, upgradesByChain, statusBucket, statedTime, targetsUpgrade, isUpgrade, sourceLabel, sourceList } from './derive.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtN = (n) => n.toLocaleString('en-US');
const icon = {
  ext: '<svg viewBox="0 0 24 24"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
};

const CHAINS = {
  'Ethereum': { short: 'Ethereum', c: '#627EEA' },
  'BNB Chain': { short: 'BNB', c: '#F0B90B' },
  'Tempo': { short: 'Tempo', c: '#38BDF8' },
  'Monad': { short: 'Monad', c: '#A855F7' },
  'Arbitrum': { short: 'Arbitrum', c: '#28A0F0' },
  'Optimism / OP Stack': { short: 'OP', c: '#FF0420' },
  'Base': { short: 'Base', c: '#0052FF' },
};
const ORDER = Object.keys(CHAINS);
// Official marks vendored in site/logos/ (sources in site/logos/README.md). Tempo ships a light and a dark favicon.
const LOGO = { 'Ethereum': 'ethereum', 'BNB Chain': 'bnb', 'Monad': 'monad', 'Arbitrum': 'arbitrum', 'Optimism / OP Stack': 'optimism', 'Base': 'base' };
function logo(chain, cls = '') {
  if (chain === 'Tempo') return `<img class="logo for-dark ${cls}" src="logos/tempo-dark.svg" alt="" aria-hidden="true"><img class="logo for-light ${cls}" src="logos/tempo-light.svg" alt="" aria-hidden="true">`;
  return LOGO[chain] ? `<img class="logo ${chain === 'Ethereum' ? 'bk ' : ''}${cls}" src="logos/${LOGO[chain]}.svg" alt="" aria-hidden="true">` : `<span class="dot" style="--c:${cc(chain)}"></span>`;
}
const cc = (chain) => CHAINS[chain]?.c || '#888';
const cs = (chain) => CHAINS[chain]?.short || chain;

const TAGS = {
  'execution': ['Execution', '#7dd3fc'], 'state': ['State', '#a3e635'], 'fee-market': ['Fee market', '#fbbf24'],
  'consensus': ['Consensus', '#f472b6'], 'networking': ['Networking', '#2dd4bf'], 'blobs-da': ['Blobs & DA', '#818cf8'],
  'account-abstraction': ['Account abstraction', '#fb923c'], 'crypto-precompiles': ['Crypto & precompiles', '#c084fc'],
  'interop-crosschain': ['Interop & L2', '#22d3ee'], 'governance-meta': ['Governance', '#94a3b8'], 'app-standard': ['App standard', '#e879f9'],
};
const tagPill = (t, sub = '') => `<span class="tag" style="--t:${TAGS[t][1]}" title="${esc(TAGS[t][0])}${sub ? ` › ${esc(sub)}` : ''} (derived)"><span class="tdot"></span>${esc(TAGS[t][0])}${sub ? `<span class="tsub"> · ${esc(sub)}</span>` : ''}</span>`;

const statusClass = (s = '') =>
  /stagnant|withdrawn|cancel|closed|skipped|deprecated|sepolia/i.test(s) ? 'st-dead'
    : /final|activated|enabled|^mainnet|executed|living/i.test(s) ? 'st-ok'
      : /scheduled|no .*time|last call/i.test(s) ? 'st-wait' : s ? 'st-live' : 'st-dead';
const statusPill = (s) => `<span class="status ${statusClass(s || '')}" title="Status as stated by the source">${s ? esc(s) : '<span class="none">not stated</span>'}</span>`;

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const human = (t, year = true) => { const d = new Date(t); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}${year ? `, ${d.getUTCFullYear()}` : ''}`; };
function countdown(t, now = Date.now()) {
  const ms = t - now;
  if (ms <= 0) return 'now';
  const h = ms / 36e5;
  return h < 24 ? `in ${Math.ceil(h)}h` : `in ${Math.ceil(h / 24)}d`;
}
function newestDate(r) {
  let best = null;
  for (const d of r.dates) { const t = statedTime(d.value); if (t != null && (!best || t > best.t)) best = { t, d }; }
  return best;
}
const forkName = (s) => String(s || '').replace(/^protocol version /, '');
const shortTarget = (s) => forkName(s.split('; ')[0]).replace(/ \((Scheduled|Considered|Proposed|Declined)[^)]*\)$/i, '');

// ---------- state <-> URL ----------
const DEFAULTS = { view: 'proposals', scope: 'active', kind: 'protocol', chain: '', tag: '', sub: '', status: '', fork: '', q: '', id: '' };
const state = { ...DEFAULTS };
function readUrl() {
  const p = new URLSearchParams(location.search);
  for (const k of Object.keys(DEFAULTS)) state[k] = p.has(k) ? p.get(k) : DEFAULTS[k];
  if (!['proposals', 'layers', 'upgrades', 'sources'].includes(state.view)) state.view = 'proposals';
}
function writeUrl() {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) if (v !== DEFAULTS[k]) p.set(k, v);
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}
function set(patch) { Object.assign(state, patch); writeUrl(); render(); }

// ---------- data ----------
let DATA, ALL = [], UPS = [], NOW = Date.now(), BUILT = 0, TAX = {};
const subLabel = (t, id) => (id === 'other' ? 'Other' : (TAX[t] || []).find(([k]) => k === id)?.[1] || id);
const byId = new Map();
let shownList = [], limit = 300;

const NS = '(not stated)';
function matches(r, ...skips) {
  const skip = new Set(skips);
  if (!skip.has('scope') && state.scope === 'active' && r._bucket !== 'active') return false;
  if (!skip.has('kind') && state.kind && r.kind !== state.kind) return false;
  if (!skip.has('chain') && state.chain && r.chain !== state.chain) return false;
  if (!skip.has('tag') && state.tag && !(state.tag === 'untagged' ? !r.tags.length : r.tags.includes(state.tag))) return false;
  if (!skip.has('sub') && !skip.has('tag') && state.tag && state.sub && (r.subs[state.tag]?.sub || 'other') !== state.sub) return false;
  if (!skip.has('status') && state.status && (r.status || NS) !== state.status) return false;
  if (!skip.has('fork') && state.fork && !(targetsUpgrade(r, state.fork) || (isUpgrade(r) && r.target_upgrade === state.fork))) return false;
  if (!skip.has('q') && state.q) { for (const w of state.q.toLowerCase().split(/\s+/)) if (w && !r._text.includes(w)) return false; }
  return true;
}
const filtered = (...skip) => ALL.filter((r) => matches(r, ...skip));

// ---------- header, signals ----------
function renderTheme() {
  const dark = document.documentElement.dataset.theme !== 'light';
  $('theme').innerHTML = dark ? icon.sun : icon.moon;
}
$('theme').onclick = () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('eipverse-theme', next); } catch {}
  renderTheme();
};
for (const b of $('tabs').querySelectorAll('button')) b.onclick = () => set({ view: b.dataset.view });

function renderSignals() {
  const nouns = (ps) => { const pre = [...new Set(ps.map((p) => p.id.split(/[-:]/)[0]))]; return pre.length === 1 && /^[A-Z]+$/.test(pre[0]) ? `${pre[0]}s` : 'proposals'; };
  const up = [], prog = [];
  for (const c of UPS) {
    if (c.next) up.push({ c: c.chain, u: c.next, t: statedTime(c.next.date) });
    for (const u of c.undated) if (u.proposals.length) prog.push({ c: c.chain, u });
  }
  up.sort((a, b) => a.t - b.t);
  prog.sort((a, b) => b.u.proposals.length - a.u.proposals.length);
  const btn = (c, u, line1, line2) => `<button class="sig" style="--c:${cc(c)}" data-chain="${esc(c)}" data-fork="${esc(u.row.target_upgrade)}" aria-pressed="${state.fork === u.row.target_upgrade}">
    ${logo(c, 'sig-logo')}<b>${esc(cs(c))} ${esc(forkName(u.row.target_upgrade))}</b><small>${line2}</small></button>`;
  $('signals').innerHTML = [
    up.length && '<span class="sig-label">Upcoming</span>',
    ...up.map(({ c, u, t }) => btn(c, u, '', `${human(t, false)} · <span class="when">${countdown(t, NOW)}</span>${u.proposals.length ? ` · ${u.proposals.length} ${nouns(u.proposals)}` : ''}`)),
    prog.length && '<span class="sig-sep"></span><span class="sig-label">In progress</span>',
    ...prog.map(({ c, u }) => btn(c, u, '', `${u.proposals.length} ${nouns(u.proposals)} · no date set`)),
  ].filter(Boolean).join('');
  for (const b of $('signals').querySelectorAll('.sig')) b.onclick = () => {
    const on = state.fork === b.dataset.fork;
    set(on ? { fork: '', chain: '' } : { view: 'proposals', fork: b.dataset.fork, chain: b.dataset.chain, scope: 'all', kind: '', tag: '', sub: '', status: '', q: '' });
  };
}

// ---------- filter bar ----------
const q = $('q');
let qTimer;
q.addEventListener('input', () => { clearTimeout(qTimer); qTimer = setTimeout(() => set({ q: q.value.trim() }), 80); });
for (const id of ['scope', 'kind']) for (const b of $(id).querySelectorAll('button')) b.onclick = () => set({ [id]: b.dataset.v });
$('status').onchange = (e) => set({ status: e.target.value });

function renderFilters() {
  if (document.activeElement !== q) q.value = state.q;
  for (const id of ['scope', 'kind']) for (const b of $(id).querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === state[id]));

  const forChains = filtered('chain');
  const nChain = (c) => forChains.filter((r) => r.chain === c).length;
  $('chains').innerHTML = `<button class="chip" data-chain="" aria-pressed="${!state.chain}">All chains <span class="n">${fmtN(forChains.length)}</span></button>`
    + ORDER.map((c) => { const n = nChain(c); return `<button class="chip${n ? '' : ' zero'}" style="--c:${cc(c)}" data-chain="${esc(c)}" aria-pressed="${state.chain === c}">${logo(c)}${esc(cs(c))} <span class="n">${fmtN(n)}</span></button>`; }).join('');
  for (const b of $('chains').querySelectorAll('.chip')) b.onclick = () => set({ chain: state.chain === b.dataset.chain ? '' : b.dataset.chain });

  const forTags = filtered('tag');
  const nTag = (t) => forTags.filter((r) => (t === 'untagged' ? !r.tags.length : r.tags.includes(t))).length;
  $('tags').innerHTML = Object.keys(TAGS).map((t) => { const n = nTag(t); return `<button class="chip${n ? '' : ' zero'}" style="--c:${TAGS[t][1]}" data-tag="${t}" aria-pressed="${state.tag === t}"><span class="tdot" style="--t:${TAGS[t][1]}"></span>${esc(TAGS[t][0])} <span class="n">${fmtN(n)}</span></button>`; }).join('')
    + `<button class="chip" data-tag="untagged" aria-pressed="${state.tag === 'untagged'}" title="No rule matched; left untagged rather than guessed">Untagged <span class="n">${fmtN(nTag('untagged'))}</span></button>`;
  for (const b of $('tags').querySelectorAll('.chip')) b.onclick = () => {
    const t = state.tag === b.dataset.tag ? '' : b.dataset.tag;
    set({ tag: t, sub: '', ...(t === 'app-standard' && state.kind === 'protocol' ? { kind: '' } : {}) });
  };

  // second row: subcategories of the selected layer, live counts, plus "Other" (layer matched, no sub rule did)
  const subs = state.tag && TAX[state.tag];
  $('subs').hidden = !subs;
  if (subs) {
    const forSubs = filtered('sub');
    const nSub = (id) => forSubs.filter((r) => (r.subs[state.tag]?.sub || 'other') === id).length;
    $('subs').innerHTML = `<span class="subs-label">${esc(TAGS[state.tag][0])} ›</span>`
      + [...subs.map(([id]) => id), 'other'].map((id) => { const n = nSub(id); return `<button class="chip subchip${n ? '' : ' zero'}" style="--c:${TAGS[state.tag][1]}" data-sub="${id}" aria-pressed="${state.sub === id}" ${id === 'other' ? 'title="Matched the layer, but no subcategory rule matched (not guessed)"' : ''}>${esc(subLabel(state.tag, id))} <span class="n">${fmtN(n)}</span></button>`; }).join('');
    for (const b of $('subs').querySelectorAll('.chip')) b.onclick = () => set({ sub: state.sub === b.dataset.sub ? '' : b.dataset.sub });
  }

  const forStatus = filtered('status');
  const counts = new Map();
  for (const r of forStatus) counts.set(r.status || NS, (counts.get(r.status || NS) || 0) + 1);
  if (state.status && !counts.has(state.status)) counts.set(state.status, 0);
  $('status').innerHTML = `<option value="">Any status (verbatim)</option>` + [...counts].sort((a, b) => b[1] - a[1])
    .map(([s, n]) => `<option value="${esc(s)}"${s === state.status ? ' selected' : ''}>${esc(s)} · ${n}</option>`).join('');

  const shown = filtered();
  const desc = [state.scope === 'active' && 'active', state.kind === 'protocol' && 'protocol', state.kind === 'app standard' && 'app-standard'].filter(Boolean).join(' ');
  const active = [
    state.fork && ['fork', `Fork: ${forkName(state.fork)}`], state.chain && ['chain', cs(state.chain)], state.tag && ['tag', state.tag === 'untagged' ? 'Untagged' : TAGS[state.tag][0]], state.tag && state.sub && ['sub', subLabel(state.tag, state.sub)],
    state.status && ['status', `Status: ${state.status}`], state.q && ['q', `“${state.q}”`],
  ].filter(Boolean);
  const isDefault = Object.keys(DEFAULTS).every((k) => k === 'view' || k === 'id' || state[k] === DEFAULTS[k]);
  $('summary').innerHTML = `<span>Showing <b data-shown="${shown.length}">${fmtN(shown.length)}</b> ${desc ? `${desc} ` : ''}of ${fmtN(ALL.length)}</span>`
    + active.map(([k, l]) => `<button class="chip" data-clear="${k}" aria-pressed="true">${esc(l)} ${icon.x}</button>`).join('')
    + (shown.length < ALL.length ? `<button class="link" data-all>Show all ${fmtN(ALL.length)}</button>` : '')
    + (!isDefault ? `<button class="link" data-reset>Reset</button>` : '');
  for (const b of $('summary').querySelectorAll('[data-clear]')) b.onclick = () => set({ [b.dataset.clear]: '', ...(b.dataset.clear === 'tag' ? { sub: '' } : {}) });
  $('summary').querySelector('[data-all]')?.addEventListener('click', () => set({ scope: 'all', kind: '', chain: '', tag: '', sub: '', status: '', fork: '', q: '' }));
  $('summary').querySelector('[data-reset]')?.addEventListener('click', () => set({ ...DEFAULTS, view: state.view }));
  return shown;
}

// ---------- proposals ----------
function rowHtml(r) {
  const nd = newestDate(r);
  return `<button class="row${state.id === r._key ? ' sel' : ''}" role="listitem" data-key="${esc(r._key)}" style="--c:${cc(r.chain)}">
    <span class="rid" title="${esc(r.chain)}${r.network ? ` · ${esc(r.network)}` : ''}">${logo(r.chain)}${esc(r.id)}</span>
    <span class="rmain"><div class="rtitle">${r.title ? esc(r.title) : '<span class="none">untitled in source</span>'}</div>${r.abstract ? `<div class="rabs">${esc(r.abstract)}</div>` : ''}</span>
    <span class="rtags">${r.tags.map((t, i) => tagPill(t, (state.tag ? t === state.tag : i === 0) && r.subs[t] ? subLabel(t, r.subs[t].sub) : '')).join('')}</span>
    <span class="rfork">${r.target_upgrade ? `<span class="fork" title="${esc(r.target_upgrade)}">${esc(shortTarget(r.target_upgrade))}</span>` : ''}</span>
    <span class="rstatus">${statusPill(r.status)}</span>
    <span class="rdate"><span ${nd ? `title="${esc(nd.d.label)}: ${esc(nd.d.value)}"` : ''}>${nd ? human(nd.t) : '<span class="none">—</span>'}</span><span class="rsrc">${esc(sourceLabel(r.url))}</span></span>
  </button>`;
}
function renderProposals(shown) {
  shownList = shown;
  $('list').innerHTML = shown.length ? shown.slice(0, limit).map(rowHtml).join('')
    : `<div class="empty">Nothing matches these filters. <button class="link" id="empty-all">Show all ${fmtN(ALL.length)}</button></div>`;
  $('empty-all')?.addEventListener('click', () => set({ scope: 'all', kind: '', chain: '', tag: '', sub: '', status: '', fork: '', q: '' }));
  const rest = shown.length - limit;
  $('more').hidden = rest <= 0;
  $('more').textContent = `Show ${fmtN(Math.min(rest, 300))} more (${fmtN(rest)} left)`;
}
$('more').onclick = () => { limit += 300; renderProposals(shownList); };
$('list').addEventListener('click', (e) => { const b = e.target.closest('.row'); if (b) set({ id: b.dataset.key }); });

// ---------- layers ----------
const expanded = new Set();
function renderLayers() {
  const base = filtered('chain', 'tag');
  const layers = [...Object.keys(TAGS), 'untagged'];
  const has = (r, t) => (t === 'untagged' ? !r.tags.length : r.tags.includes(t));
  const inSub = (r, t, id) => has(r, t) && (r.subs[t]?.sub || 'other') === id;
  const counts = (pred) => ORDER.map((c) => base.filter((r) => r.chain === c && pred(r)).length);
  const grid = layers.map((t) => counts((r) => has(r, t)));
  const max = Math.max(1, ...grid.flat());
  const cells = (ns, t, sub = '') => ns.map((n, j) => `<td><button class="${n ? '' : 'z'}" style="--c:${cc(ORDER[j])};--a:${n ? Math.round(8 + 52 * Math.sqrt(n / max)) : 0}" data-tag="${t}" data-sub="${sub}" data-chain="${esc(ORDER[j])}" title="${n} ${esc(cs(ORDER[j]))} · ${esc(sub ? subLabel(t, sub) : t)}">${n || '·'}</button></td>`).join('');
  const sum = (ns) => `<td class="tot">${fmtN(ns.reduce((a, b) => a + b, 0))}</td>`;
  const caret = (t) => TAX[t] ? `<button class="caret" data-expand="${t}" aria-expanded="${expanded.has(t)}" aria-label="${expanded.has(t) ? 'Collapse' : 'Expand'} subcategories" title="Subcategories">${expanded.has(t) ? icon.down : icon.right}</button>` : '<span class="caret-sp"></span>';
  $('matrix').innerHTML = `<thead><tr><th>Layer</th>${ORDER.map((c) => `<th><span class="th-c">${logo(c)}${esc(cs(c))}</span></th>`).join('')}<th class="tot">Total</th></tr></thead><tbody>`
    + layers.map((t, i) => {
      const head = `<tr class="${state.tag === t && !state.sub ? 'on' : ''}"><th class="lay"><div class="lay-in">${caret(t)}<button class="lay-b" data-tag="${t}">${t === 'untagged' ? '<span class="tdot" style="--t:var(--i4)"></span>Untagged' : `<span class="tdot" style="--t:${TAGS[t][1]}"></span>${esc(TAGS[t][0])}`}</button></div></th>`
        + cells(grid[i], t) + `<td class="tot">${fmtN(base.filter((r) => has(r, t)).length)}</td></tr>`;
      if (!expanded.has(t) || !TAX[t]) return head;
      return head + [...TAX[t].map(([id]) => id), 'other'].map((id) => { const ns = counts((r) => inSub(r, t, id));
        return `<tr class="subrow${state.tag === t && state.sub === id ? ' on' : ''}"><th class="lay"><button class="lay-b sub-b" data-tag="${t}" data-sub="${id}"${id === 'other' ? ' title="Layer matched, no subcategory rule did"' : ''}>${esc(subLabel(t, id))}</button></th>${cells(ns, t, id)}${sum(ns)}</tr>`; }).join('');
    }).join('') + '</tbody>';
  for (const b of $('matrix').querySelectorAll('[data-expand]')) b.onclick = () => { const t = b.dataset.expand; expanded.has(t) ? expanded.delete(t) : expanded.add(t); renderLayers(); };
  for (const b of $('matrix').querySelectorAll('button[data-tag]')) b.onclick = () => {
    const t = b.dataset.tag;
    if (TAX[t] && !b.dataset.sub) expanded.add(t);
    set({ tag: t, sub: b.dataset.sub || '', ...(t === 'app-standard' && state.kind === 'protocol' ? { kind: '' } : {}) });
    const col = b.dataset.chain && document.querySelector(`.col[data-chain="${CSS.escape(b.dataset.chain)}"]`);
    (col || $('side')).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  if (!state.tag) { $('side').innerHTML = `<div class="side-h"><h3>Pick a layer</h3><p>Click a row or cell to see that layer's proposals side by side, one column per chain. Use the arrow to open a layer's subcategories. Counts follow scope, kind, status and search above.</p></div>`; shownList = []; return; }
  const rows = base.filter((r) => (state.sub ? inSub(r, state.tag, state.sub) : has(r, state.tag)));
  shownList = ORDER.flatMap((c) => rows.filter((r) => r.chain === c));
  const name = (state.tag === 'untagged' ? 'Untagged' : TAGS[state.tag][0]) + (state.sub ? ` › ${subLabel(state.tag, state.sub)}` : '');
  const subOf = (r) => (state.tag !== 'untagged' && !state.sub && r.subs[state.tag] ? `<span class="tag tag-sm" style="--t:${TAGS[state.tag][1]}">${esc(subLabel(state.tag, r.subs[state.tag].sub))}</span>` : '');
  $('side').innerHTML = `<div class="side-h"><h3>${esc(name)} across chains</h3><p>${fmtN(rows.length)} proposals · newest stated date first · tags and subcategories are derived from each proposal's own title and abstract</p></div>
    <div class="cols">${ORDER.map((c) => { const rs = rows.filter((r) => r.chain === c); return `<section class="col" data-chain="${esc(c)}" style="--c:${cc(c)}">
      <div class="col-h">${logo(c)}${esc(cs(c))}<span class="n">${rs.length}</span></div>
      <div class="col-b">${rs.length ? rs.map((r) => `<button class="card" data-key="${esc(r._key)}"><span class="rid">${esc(r.id)}</span><span class="t">${esc(r.title || r.id)}</span>
        <span class="m">${statusPill(r.status)}${subOf(r)}${r.target_upgrade ? `<span class="fork" title="${esc(r.target_upgrade)}">${esc(shortTarget(r.target_upgrade))}</span>` : ''}</span></button>`).join('') : '<div class="col-empty">None in this scope</div>'}</div></section>`; }).join('')}</div>`;
  for (const b of $('side').querySelectorAll('.card')) b.onclick = () => set({ id: b.dataset.key });
}

// ---------- upgrades ----------
function renderUpgrades() {
  const link = (c, u) => u.proposals.length ? `<button class="link" data-chain="${esc(c)}" data-fork="${esc(u.row.target_upgrade)}">${u.proposals.length} proposal${u.proposals.length > 1 ? 's' : ''} targeting it</button>` : '';
  const item = (c, k, u, extra = '') => `<div class="ui"><span class="k">${k}</span><span class="v">${u
    ? `<a class="name" href="${esc(u.row.url)}" target="_blank" rel="noopener">${esc(forkName(u.row.target_upgrade))}${u.row.network ? ` <span class="d">${esc(u.row.network)}</span>` : ''}</a>
       <span class="d">${u.date ? `<span title="${esc(u.date)}">${human(statedTime(u.date))}</span>${extra}` : esc(u.row.status)}</span>${link(c, u)}`
    : '<span class="none">none stated</span>'}</span></div>`;
  $('ugrid').innerHTML = ORDER.map((name) => UPS.find((c) => c.chain === name)).filter(Boolean).map((c) => `<section class="uc" style="--c:${cc(c.chain)}">
    <div class="uc-h">${logo(c.chain)}${esc(c.chain)}<span class="n">${fmtN(ALL.filter((r) => r.chain === c.chain).length)} rows</span></div>
    <div class="ub">${item(c.chain, 'Latest', c.latest)}${item(c.chain, 'Next', c.next, c.next ? ` · <span class="cd">${countdown(statedTime(c.next.date), NOW)}</span>` : '')}
    ${c.undated.length ? c.undated.map((u, i) => item(c.chain, i ? '' : 'In progress', u)).join('') : item(c.chain, 'In progress', null)}</div></section>`).join('');
  for (const b of $('ugrid').querySelectorAll('[data-fork]')) b.onclick = () => set({ view: 'proposals', fork: b.dataset.fork, chain: b.dataset.chain, scope: 'all', kind: '', tag: '', sub: '', status: '', q: '' });
}

// ---------- sources ----------
function renderSources() {
  $('sgrid').innerHTML = `<div class="stable">` + ORDER.map((n) => DATA.chains.find((c) => c.chain === n)).filter(Boolean).map((c) => `<div class="srow" data-chain="${esc(c.chain)}" data-count="${c.count}" data-status="${c.status}">
    <span class="s-chain">${logo(c.chain)}${esc(c.chain)}</span>
    <span class="s-links">${sourceList(c.sources).map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener" title="${esc(x.label)}">${esc(x.short)}</a>`).join('<span class="sep">·</span>')}</span>
    <span class="s-n num">${fmtN(c.count)}</span>
    <span class="badge b-${c.status}"${c.reason ? ` title="${esc(c.reason)}"` : ''}>${c.status === 'ok' ? 'ok' : c.status === 'empty' ? 'no data' : 'error'}</span>
    <span class="s-t num" title="fetched ${esc(c.fetched_at)} · ${esc(c.adapter)}">${esc(c.fetched_at.slice(5, 16).replace('T', ' '))} UTC</span>
    ${c.notes.length || c.reason ? `<details class="s-notes"><summary>notes</summary>${[c.reason, ...c.notes].filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join('')}</details>` : '<span></span>'}
  </div>`).join('') + `</div><p class="s-foot">Each label links to the canonical file or API the build reads. Hover a label for the full description.</p>`;
}

// ---------- drawer ----------
function renderDrawer() {
  const r = state.id && byId.get(state.id);
  const d = $('drawer');
  document.querySelectorAll('.row.sel').forEach((x) => x.classList.toggle('sel', x.dataset.key === state.id));
  if (!r) { d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); $('scrim').hidden = true; return; }
  const i = shownList.indexOf(r);
  const tagsHtml = r.tags.length ? r.tags.map((t) => `<div class="why-row">${tagPill(t)}<span class="terms">matched: ${r.why[t].map(esc).join(', ')}</span></div>`
      + `<div class="why-row why-sub"><span class="arrow">›</span>${r.subs[t] ? `<span class="tag" style="--t:${TAGS[t][1]}">${esc(subLabel(t, r.subs[t].sub))}</span><span class="terms">matched: ${r.subs[t].why.map(esc).join(', ')}</span>` : '<span class="terms none">no subcategory matched (not guessed)</span>'}</div>`).join('')
    : '<span class="none">No rule matched, so no tag (not guessed).</span>';
  d.innerHTML = `<div class="dh" style="--c:${cc(r.chain)}"><span class="rid">${logo(r.chain)}${esc(r.id)}</span><span class="sp"></span>
    ${i >= 0 ? `<span class="pos">${i + 1} / ${fmtN(shownList.length)}</span>` : ''}
    <button class="icon-btn" data-step="-1" aria-label="Previous (k)" title="Previous (k / ↑)">${icon.up}</button>
    <button class="icon-btn" data-step="1" aria-label="Next (j)" title="Next (j / ↓)">${icon.down}</button>
    <button class="icon-btn" data-close aria-label="Close (Esc)" title="Close (Esc)">${icon.x}</button></div>
    <div class="db">
      <h2>${r.title ? esc(r.title) : '<span class="none">untitled in source</span>'}</h2>
      ${r.abstract ? `<p class="abs">${esc(r.abstract)}</p>` : '<p class="abs none">The source has no short description for this one.</p>'}
      <dl class="kv">
        <dt>Chain</dt><dd class="chain-dd">${logo(r.chain)} ${esc(r.chain)}${r.network ? ` · ${esc(r.network)}` : ''}</dd>
        <dt>Status</dt><dd>${statusPill(r.status)} <span class="hint">· ${r._bucket === 'active' ? 'counted as active' : 'counted as historical'}</span></dd>
        <dt>Target upgrade</dt><dd>${r.target_upgrade ? esc(r.target_upgrade) : '<span class="none">not stated</span>'}</dd>
        <dt>Kind / type</dt><dd>${esc(r.kind)}${r.type ? ` · ${esc(r.type)}` : ''}</dd>
        ${r.dates.length ? r.dates.map((x) => `<dt>${esc(x.label)}</dt><dd class="mono" style="font-size:12px">${esc(x.value)}</dd>`).join('') : '<dt>Dates</dt><dd class="none">none stated</dd>'}
      </dl>
      <div><div class="label">Layer › subcategory · derived from the proposal's own text</div><div class="why">${tagsHtml}</div></div>
      <a class="cta" href="${esc(r.url)}" target="_blank" rel="noopener">Open canonical source ${icon.ext}</a>
      <div><div class="label">Sources</div><ul class="srcs">
        <li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(sourceLabel(r.url))} ${icon.ext}</a><span class="src-k">this ${isUpgrade(r) ? 'upgrade' : 'proposal'}</span></li>
        ${sourceList(DATA.chains.find((c) => c.chain === r.chain)?.sources).filter((x) => x.url !== r.url && x.short !== sourceLabel(r.url)).map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener" title="${esc(x.label)}">${esc(x.short)} ${icon.ext}</a><span class="src-k">${esc(cs(r.chain))} index</span></li>`).join('')}
      </ul></div>
      <div class="hint">Esc closes · j / k or ↑ / ↓ step through the current list</div>
    </div>`;
  d.classList.add('open'); d.setAttribute('aria-hidden', 'false'); $('scrim').hidden = false;
  d.querySelector('[data-close]').onclick = () => set({ id: '' });
  for (const b of d.querySelectorAll('[data-step]')) b.onclick = () => step(+b.dataset.step);
}
function step(n) {
  if (!shownList.length) return;
  const i = shownList.findIndex((r) => r._key === state.id);
  const next = shownList[Math.max(0, Math.min(shownList.length - 1, i < 0 ? 0 : i + n))];
  if (state.view === 'proposals') { const idx = shownList.indexOf(next); if (idx >= limit) { limit = idx + 1; renderProposals(shownList); } }
  set({ id: next._key });
  document.querySelector(`[data-key="${CSS.escape(next._key)}"]`)?.scrollIntoView({ block: 'nearest' });
}
$('scrim').onclick = () => set({ id: '' });
document.addEventListener('keydown', (e) => {
  const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '');
  if (e.key === '/' && !typing) { e.preventDefault(); q.focus(); q.select(); return; }
  if (e.key === 'Escape') {
    if (state.id) return set({ id: '' });
    if (document.activeElement === q) { q.value = ''; q.blur(); return set({ q: '' }); }
  }
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (['j', 'ArrowDown'].includes(e.key) && (state.id || e.key === 'j')) { e.preventDefault(); step(1); }
  if (['k', 'ArrowUp'].includes(e.key) && (state.id || e.key === 'k')) { e.preventDefault(); step(-1); }
});

// ---------- render ----------
let lastView;
function render() {
  for (const b of $('tabs').querySelectorAll('button')) { if (b.dataset.view === state.view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
  for (const v of ['proposals', 'layers', 'upgrades', 'sources']) $(`v-${v}`).hidden = state.view !== v;
  const filt = ['proposals', 'layers'].includes(state.view);
  $('filters').hidden = !filt;
  if (state.view !== lastView) { limit = 300; lastView = state.view; }
  renderSignals();
  const shown = filt ? renderFilters() : [];
  if (state.view === 'proposals') renderProposals(shown);
  if (state.view === 'layers') renderLayers();
  if (state.view === 'upgrades') { renderUpgrades(); shownList = []; }
  if (state.view === 'sources') { renderSources(); shownList = []; }
  renderDrawer();
}

renderTheme();
fetch('data.json').then((r) => r.json()).then((data) => {
  DATA = data;
  TAX = data.taxonomy || {};
  BUILT = Date.parse(data.generated_at);
  NOW = Date.now();
  ALL = sortNewestFirst(data.chains.flatMap((c) => c.proposals)).map((r) => ({
    ...r, _key: `${r.chain}|${r.id}`, _bucket: statusBucket(r, BUILT),
    _text: [r.id, r.title, r.abstract, r.target_upgrade, r.status, r.network, r.type, ...r.tags, ...r.tags.map((t) => TAGS[t][0])].join(' ').toLowerCase(),
  }));
  for (const r of ALL) byId.set(r._key, r);
  UPS = upgradesByChain(data.chains, NOW);
  $('count-pill').textContent = `${fmtN(ALL.length)} proposals · ${data.chains.length} chains`;
  $('count-pill').title = `Built ${data.generated_at}`;
  readUrl();
  if (state.tag && TAX[state.tag]) expanded.add(state.tag);
  render();
}).catch((e) => { $('main').insertAdjacentHTML('afterbegin', `<p class="empty b-error">Could not load data.json: ${esc(e.message)}</p>`); });
