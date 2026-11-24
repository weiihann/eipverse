// eipverse page: one data.json, four views, all state in the URL.
import { CHAINS as CHAIN_LIST } from './chains.js';
import { parseCols, serializeCols, toggleCol, rowState, MIN_COLS, MAX_COLS } from './compare.js';
import { sortNewestFirst, upgradesByChain, statusBucket, statedTime, targetsUpgrade, isUpgrade, sourceLabel, sourceList, presentChains } from './derive.js';

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

// Chain order, colours and logos live in chains.js (one list; official marks in site/logos/, sources in site/logos/README.md).
const CHAINS = Object.fromEntries(CHAIN_LIST.map((c) => [c.name, c]));
const ORDER = CHAIN_LIST.map((c) => c.name);
function logo(chain, cls = '') {
  const c = CHAINS[chain];
  if (!c?.logo) return `<span class="dot" style="--c:${cc(chain)}"></span>`;
  if (c.themed) return `<img class="logo for-dark ${cls}" src="logos/${c.logo}-dark.svg" alt="" aria-hidden="true"><img class="logo for-light ${cls}" src="logos/${c.logo}-light.svg" alt="" aria-hidden="true">`;
  return `<img class="logo ${c.backed ? 'bk ' : ''}${cls}" src="logos/${c.logo}.svg" alt="" aria-hidden="true">`;
}
const cc = (chain) => CHAINS[chain]?.c || '#888';
const cs = (chain) => CHAINS[chain]?.short || chain;

const TAGS = {
  'execution': ['Execution', '#7dd3fc'], 'state': ['State', '#a3e635'], 'fee-market': ['Fee market', '#fbbf24'],
  'consensus': ['Consensus', '#f472b6'], 'networking': ['Networking', '#2dd4bf'], 'blobs-da': ['Blobs & DA', '#818cf8'],
  'account-abstraction': ['Account abstraction', '#fb923c'], 'crypto-precompiles': ['Crypto & precompiles', '#c084fc'],
  'interop-crosschain': ['Interop & L2', '#22d3ee'], 'governance-meta': ['Governance & upgrades', '#94a3b8'],
  'native-assets': ['Native assets & DEX', '#34d399'], 'app-standard': ['App standard', '#e879f9'],
};
const tagPill = (t, sub = '', how = 'derived') => `<span class="tag" style="--t:${TAGS[t][1]}" title="${esc(TAGS[t][0])}${sub ? ` › ${esc(sub)}` : ''} (${how})"><span class="tdot"></span><span class="tname">${esc(TAGS[t][0])}</span>${sub ? `<span class="tsub">· ${esc(sub)}</span>` : ''}</span>`;

const statusClass = (s = '') =>
  /stagnant|stale|withdrawn|superseded|abandoned|cancel|closed|skipped|deprecated|sepolia/i.test(s) ? 'st-dead'
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
const VIEWS = ['proposals', 'layers', 'diff', 'upgrades', 'sources'];
const DEFAULTS = { view: 'proposals', scope: 'active', kind: 'protocol', chain: '', tag: '', sub: '', status: '', fork: '', q: '', id: '', dg: '', dq: '', cell: '', c: '' };
const state = { ...DEFAULTS };
function readUrl() {
  const p = new URLSearchParams(location.search);
  for (const k of Object.keys(DEFAULTS)) state[k] = p.has(k) ? p.get(k) : DEFAULTS[k];
  if (!VIEWS.includes(state.view)) state.view = 'proposals';
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
const chainSel = () => (state.chain ? state.chain.split(',').filter((c) => CHAINS[c]) : []);
function matches(r, ...skips) {
  const skip = new Set(skips);
  if (!skip.has('scope') && state.scope === 'active' && r._bucket !== 'active') return false;
  if (!skip.has('kind') && state.kind && r.kind !== state.kind) return false;
  if (!skip.has('chain') && state.chain && !chainSel().includes(r.chain)) return false;
  if (!skip.has('tag') && state.tag && !(state.tag === 'untagged' ? !r.tags.length : r.tags.includes(state.tag))) return false;
  if (!skip.has('sub') && !skip.has('tag') && state.tag && state.sub && (r.subs[state.tag]?.sub || 'other') !== state.sub) return false;
  if (!skip.has('status') && state.status && (r.status || NS) !== state.status) return false;
  if (!skip.has('fork') && state.fork && !(targetsUpgrade(r, state.fork) || (isUpgrade(r) && r.target_upgrade === state.fork))) return false;
  if (!skip.has('q') && state.q) { for (const w of state.q.toLowerCase().split(/\s+/)) if (w && !r._text.includes(w)) return false; }
  return true;
}
const filtered = (...skip) => ALL.filter((r) => matches(r, ...skip));

// ---------- header ----------
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

// ---------- filter bar ----------
// Search first, then one row of compact controls. Chain, Layer and Status open a popover (a bottom sheet on phones);
// Kind is a small segmented switch. Everything set shows once as a removable pill under the row.
const q = $('q');
let qTimer;
q.addEventListener('input', () => { clearTimeout(qTimer); qTimer = setTimeout(() => set({ q: q.value.trim() }), 80); });
for (const b of $('kind').querySelectorAll('button')) b.onclick = () => set({ kind: b.dataset.v });

const caretSvg = '<svg class="cv" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>';
const check = '<svg class="ck" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>';
const layerName = (t) => (t === 'untagged' ? 'Untagged' : TAGS[t][0]);
const pop = document.createElement('div');
pop.className = 'pop'; pop.id = 'pop'; pop.hidden = true; pop.setAttribute('role', 'dialog');
document.body.append(pop);
let openPop = '', popAnchor = null;
const popRenderers = {};
function showPop(name, anchor) {
  if (openPop === name) return closePop();
  openPop = name; popAnchor = anchor;
  document.querySelectorAll('[data-pop]').forEach((b) => b.setAttribute('aria-expanded', String(b === anchor)));
  renderPop();
  pop.querySelector('button, input')?.focus({ preventScroll: true });
}
function closePop() {
  if (!openPop) return;
  openPop = ''; pop.hidden = true; $('popscrim')?.remove();
  document.querySelectorAll('[data-pop][aria-expanded="true"]').forEach((b) => { b.setAttribute('aria-expanded', 'false'); });
  popAnchor?.focus({ preventScroll: true }); popAnchor = null;
}
function renderPop() {
  if (!openPop) return;
  pop.innerHTML = popRenderers[openPop]();
  pop.hidden = false;
  pop.setAttribute('aria-label', openPop);
  const sheet = matchMedia('(max-width: 760px)').matches;
  pop.classList.toggle('sheet', sheet);
  if (sheet) { if (!$('popscrim')) { const sc = document.createElement('div'); sc.id = 'popscrim'; sc.className = 'pop-scrim'; sc.onclick = closePop; document.body.append(sc); } pop.style.left = pop.style.top = ''; }
  else {
    const r = popAnchor.getBoundingClientRect();
    pop.style.top = `${r.bottom + 6}px`;
    pop.style.left = `${Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8))}px`;
  }
  pop.querySelector('[data-done]')?.addEventListener('click', closePop);
  for (const b of pop.querySelectorAll('[data-act]')) b.onclick = () => POP_ACT[openPop](b.dataset);
}
document.addEventListener('mousedown', (e) => { if (openPop && !pop.contains(e.target) && !e.target.closest('[data-pop]') && e.target.id !== 'popscrim') closePop(); });
addEventListener('resize', () => { if (openPop) renderPop(); });
addEventListener('scroll', () => { if (openPop && !pop.classList.contains('sheet')) renderPop(); }, { passive: true });
for (const b of document.querySelectorAll('[data-pop]')) b.onclick = () => showPop(b.dataset.pop, b);

const popHead = (title, clear) => `<div class="pop-h"><b>${title}</b>${clear ? `<button class="link" data-act="clear">Clear</button>` : ''}<button class="link pop-done" data-done>Done</button></div>`;
const opt = (attrs, on, body, n, cls = '') => `<button class="opt${on ? ' on' : ''}${n === 0 ? ' zero' : ''}${cls ? ` ${cls}` : ''}" ${attrs} role="menuitemcheckbox" aria-checked="${on}">${check}${body}${n == null ? '' : `<span class="n">${fmtN(n)}</span>`}</button>`;
popRenderers.chain = () => {
  const base = filtered('chain'), sel = chainSel();
  return popHead('Chains', sel.length) + `<div class="pop-b">`
    + ORDER.map((c) => opt(`data-act="toggle" data-v="${esc(c)}"`, sel.includes(c), `${logo(c)}<span class="ol">${esc(c)}</span>`, base.filter((r) => r.chain === c).length)).join('') + '</div>';
};
popRenderers.layer = () => {
  const base = filtered('tag');
  const has = (r, t) => (t === 'untagged' ? !r.tags.length : r.tags.includes(t));
  const rows = [...Object.keys(TAGS), 'untagged'].map((t) => {
    const inT = base.filter((r) => has(r, t));
    const open = state.tag === t && TAX[t];
    const subs = open ? [...TAX[t].map(([id]) => id), 'other'].map((id) => opt(`data-act="sub" data-v="${id}"`, state.sub === id, `<span class="ol">${esc(subLabel(t, id))}</span>`, inT.filter((r) => (r.subs[t]?.sub || 'other') === id).length, 'sub')).join('') : '';
    return opt(`data-act="tag" data-v="${t}"`, state.tag === t && !state.sub, `${t === 'untagged' ? '<span class="tdot" style="--t:var(--i4)"></span>' : `<span class="tdot" style="--t:${TAGS[t][1]}"></span>`}<span class="ol">${esc(layerName(t))}</span>${TAX[t] ? `<span class="has-sub">${state.tag === t ? '▾' : '›'}</span>` : ''}`, inT.length) + subs;
  }).join('');
  return popHead('Layer › subcategory', state.tag) + `<div class="pop-b">${rows}</div><div class="pop-f">Tags are derived from each proposal's own text; a few are curated by hand. Untagged means no rule matched.</div>`;
};
popRenderers.status = () => {
  const forScope = filtered('scope', 'status');
  const nActive = forScope.filter((r) => r._bucket === 'active').length;
  const forStatus = filtered('status');
  const counts = new Map();
  for (const r of forStatus) counts.set(r.status || NS, (counts.get(r.status || NS) || 0) + 1);
  if (state.status && !counts.has(state.status)) counts.set(state.status, 0);
  return popHead('Status', state.status || state.scope !== 'active') + `<div class="pop-b"><div class="pop-l">Scope</div>`
    + opt('data-act="scope" data-v="active"', state.scope === 'active', '<span class="ol">Active &amp; upcoming</span>', nActive)
    + opt('data-act="scope" data-v="all"', state.scope === 'all', '<span class="ol">All, including historical</span>', forScope.length)
    + `<div class="pop-l">As stated by the source</div>`
    + opt('data-act="status" data-v=""', !state.status, '<span class="ol">Any status</span>', forStatus.length)
    + [...counts].sort((a, b) => b[1] - a[1]).map(([st, n]) => opt(`data-act="status" data-v="${esc(st)}"`, state.status === st, `<span class="ol">${esc(st)}</span>`, n)).join('') + '</div>';
};
popRenderers.dg = () => popHead('Dimensions', state.dg) + `<div class="pop-b">`
  + opt('data-act="dg" data-v=""', !state.dg, '<span class="ol">All dimensions</span>', DIFF.dimensions.length)
  + DIFF.groups.map(([g, label]) => opt(`data-act="dg" data-v="${g}"`, state.dg === g, `<span class="ol">${esc(label)}</span>`, DIFF.dimensions.filter(([, x]) => x === g).length)).join('') + '</div>';
const POP_ACT = {
  dg: ({ act, v }) => { set({ dg: act === 'clear' ? '' : v }); closePop(); },
  chain: ({ act, v }) => {
    if (act === 'clear') return set({ chain: '' });
    const sel = chainSel();
    set({ chain: (sel.includes(v) ? sel.filter((c) => c !== v) : ORDER.filter((c) => c === v || sel.includes(c))).join(',') });
  },
  layer: ({ act, v }) => {
    if (act === 'clear') return set({ tag: '', sub: '' });
    if (act === 'sub') { set({ sub: state.sub === v ? '' : v }); return closePop(); }
    const t = state.tag === v && !state.sub ? '' : v;
    set({ tag: t, sub: '', ...(t === 'app-standard' && state.kind === 'protocol' ? { kind: '' } : {}) });
    if (!TAX[t]) closePop();
  },
  status: ({ act, v }) => {
    if (act === 'clear') return set({ scope: 'active', status: '' });
    if (act === 'scope') return set({ scope: v });
    set({ status: v }); closePop();
  },
};

function ctlLabel(name) {
  const sel = chainSel();
  if (name === 'chain') return sel.length === 0 ? ['Chain', 'All'] : sel.length === 1 ? ['Chain', `${logo(sel[0])}${esc(cs(sel[0]))}`] : ['Chain', `${sel.slice(0, 3).map((c) => logo(c)).join('')}${sel.length}`];
  if (name === 'layer') return ['Layer', state.tag ? `${esc(layerName(state.tag))}${state.sub ? ` › ${esc(subLabel(state.tag, state.sub))}` : ''}` : 'All'];
  return ['Status', state.status ? esc(state.status) : state.scope === 'active' ? 'Active &amp; upcoming' : 'All'];
}

function renderFilters() {
  if (document.activeElement !== q) q.value = state.q;
  for (const b of $('kind').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === state.kind));
  for (const b of document.querySelectorAll('#ctls [data-pop]')) {
    const [k, v] = ctlLabel(b.dataset.pop);
    const set_ = v !== 'All' && !(b.dataset.pop === 'status' && !state.status && state.scope === 'active');
    b.classList.toggle('set', set_);
    b.innerHTML = `<span class="k">${k}</span><span class="v">${v}</span>${caretSvg}`;
  }
  renderPop();

  const shown = filtered();
  const active = [
    state.fork && ['fork', `Fork: ${esc(forkName(state.fork))}`],
    ...chainSel().map((c) => ['chain', `${logo(c)}${esc(cs(c))}`, c]),
    state.tag && ['tag', esc(layerName(state.tag))], state.tag && state.sub && ['sub', esc(subLabel(state.tag, state.sub))],
    state.status && ['status', esc(state.status)], state.scope === 'all' && ['scope', 'Incl. historical'], state.q && ['q', `“${esc(state.q)}”`],
  ].filter(Boolean);
  const isDefault = Object.keys(DEFAULTS).every((k) => ['view', 'id', 'dg', 'dq', 'cell'].includes(k) || state[k] === DEFAULTS[k]);
  const kindWord = state.kind === 'protocol' ? 'protocol proposals' : state.kind === 'app standard' ? 'app standards' : 'proposals';
  $('summary').innerHTML = `<span class="count"><b data-shown="${shown.length}">${fmtN(shown.length)}</b> ${kindWord}${state.scope === 'active' && !state.status ? ', active &amp; upcoming' : ''}<span class="of"> of ${fmtN(ALL.length)}</span></span>`
    + active.map(([k, l, v]) => `<button class="fpill" data-clear="${k}"${v ? ` data-v="${esc(v)}"` : ''} aria-label="Remove filter">${l}${icon.x}</button>`).join('')
    + (!isDefault ? `<button class="link" data-reset>Reset</button>` : '');
  for (const b of $('summary').querySelectorAll('[data-clear]')) b.onclick = () => {
    const k = b.dataset.clear;
    if (k === 'chain') return set({ chain: chainSel().filter((c) => c !== b.dataset.v).join(',') });
    set({ [k]: k === 'scope' ? 'active' : '', ...(k === 'tag' ? { sub: '' } : {}) });
  };
  $('summary').querySelector('[data-reset]')?.addEventListener('click', () => set({ ...DEFAULTS, view: state.view }));
  return shown;
}

// ---------- shared forks ----------
// A fork that ships another chain's proposals (Gnosis/Polygon on Ethereum) points at those rows.
const sharedPill = (r) => `<span class="shared" title="Inherits ${esc(r.shared_with)} proposals; the drawer links them">${logo(r.shared_with)}shared with ${esc(cs(r.shared_with))}</span>`;
// Ethereum hardfork meta EIPs are named for the combined fork; bor's config uses the execution-layer name.
const EL_ALIAS = { Shanghai: 'Shapella', Cancun: 'Dencun', Prague: 'Pectra', Osaka: 'Fusaka', Amsterdam: 'Glamsterdam' };
function resolveRef(ref) {
  if (ref.id) return byId.get(`${ref.chain}|${ref.id}`) || null;
  const names = [ref.upgrade, EL_ALIAS[ref.upgrade]].filter(Boolean);
  return ALL.find((x) => x.chain === ref.chain && isUpgrade(x) && names.includes(x.target_upgrade)) || null;
}
function refsHtml(r) {
  if (!r.refs?.length) return '';
  const items = r.refs.map((ref) => {
    const hit = resolveRef(ref);
    const label = ref.id || `${ref.upgrade} upgrade`;
    return `<li>${hit ? `<button class="link ref" data-goto="${esc(hit._key)}">${logo(ref.chain)}${esc(hit.id)}</button><span class="ref-t">${esc(hit.title || '')}</span>`
      : `<span class="ref">${logo(ref.chain)}${esc(label)}</span><span class="ref-t none">no ${esc(cs(ref.chain))} row for this here</span>`}${ref.note ? `<span class="ref-n">${esc(ref.note)}</span>` : ''}</li>`;
  }).join('');
  return `<div><div class="label">Shared with ${esc(r.shared_with || r.refs[0].chain)} · ${r.refs.length} linked ${r.refs.length === 1 ? 'row' : 'rows'}, not copied</div><ul class="refs">${items}</ul></div>`;
}

// ---------- proposals ----------
function rowHtml(r) {
  const nd = newestDate(r);
  return `<button class="row${state.id === r._key ? ' sel' : ''}" role="listitem" data-key="${esc(r._key)}" style="--c:${cc(r.chain)}">
    <span class="rid" title="${esc(r.id)} · ${esc(r.chain)}${r.network ? ` · ${esc(r.network)}` : ''}">${logo(r.chain)}<span class="rid-t">${esc(r.id)}</span></span>
    <span class="rmain"><div class="rtitle">${r.title ? esc(r.title) : '<span class="none">untitled in source</span>'}${r.shared_with ? sharedPill(r) : ''}</div>${r.abstract ? `<div class="rabs">${esc(r.abstract)}</div>` : ''}</span>
    <span class="rtags">${r.tags.map((t, i) => tagPill(t, (state.tag ? t === state.tag : i === 0) && r.subs[t] ? subLabel(t, r.subs[t].sub) : '', r.curated ? 'curated' : 'derived')).join('')}</span>
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
  const cols = presentChains(ORDER, rows);
  shownList = cols.flatMap((c) => rows.filter((r) => r.chain === c));
  const name = (state.tag === 'untagged' ? 'Untagged' : TAGS[state.tag][0]) + (state.sub ? ` › ${subLabel(state.tag, state.sub)}` : '');
  const subOf = (r) => (state.tag !== 'untagged' && !state.sub && r.subs[state.tag] ? `<span class="tag tag-sm" style="--t:${TAGS[state.tag][1]}">${esc(subLabel(state.tag, r.subs[state.tag].sub))}</span>` : '');
  if (!cols.length) {
    $('side').innerHTML = `<div class="side-h"><h3>${esc(name)} across chains</h3></div><div class="empty">None in this scope</div>`;
    return;
  }
  $('side').innerHTML = `<div class="side-h"><h3>${esc(name)} across chains</h3></div>
    <div class="cols">${cols.map((c) => { const rs = rows.filter((r) => r.chain === c); return `<section class="col" data-chain="${esc(c)}" style="--c:${cc(c)}">
      <div class="col-h">${logo(c)}${esc(cs(c))}<span class="n">${rs.length}</span></div>
      <div class="col-b">${rs.map((r) => `<button class="card" data-key="${esc(r._key)}"><span class="rid" title="${esc(r.id)}"><span class="rid-t">${esc(r.id)}</span></span><span class="t">${esc(r.title || r.id)}</span>
        <span class="m">${statusPill(r.status)}${subOf(r)}${r.target_upgrade ? `<span class="fork" title="${esc(r.target_upgrade)}">${esc(shortTarget(r.target_upgrade))}</span>` : ''}</span></button>`).join('')}</div></section>`; }).join('')}</div>`;
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
    <div class="uc-h">${logo(c.chain)}${esc(c.chain)}</div>
    <div class="ub">${item(c.chain, 'Latest', c.latest)}${item(c.chain, 'Next', c.next, c.next ? ` · <span class="cd">${countdown(statedTime(c.next.date), NOW)}</span>` : '')}
    ${c.undated.length ? c.undated.map((u, i) => item(c.chain, i ? '' : 'In progress', u)).join('') : item(c.chain, 'In progress', null)}</div></section>`).join('');
  for (const b of $('ugrid').querySelectorAll('[data-fork]')) b.onclick = () => set({ view: 'proposals', fork: b.dataset.fork, chain: b.dataset.chain, scope: 'all', kind: '', tag: '', sub: '', status: '', q: '' });
}

// ---------- sources ----------
function renderSources() {
  // One line per chain. A warning appears only when an adapter failed or returned nothing; filter rules live in adapters/ and the README.
  $('sgrid').innerHTML = `<div class="stable">` + ORDER.map((n) => DATA.chains.find((c) => c.chain === n)).filter(Boolean).map((c) => `<div class="srow${c.status === 'ok' ? '' : ' warn'}" data-chain="${esc(c.chain)}" data-count="${c.count}" data-status="${c.status}">
    <span class="s-chain">${logo(c.chain)}${esc(c.chain)}</span>
    <span class="s-links">${sourceList(c.sources).map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener" title="${esc(x.label)}">${esc(x.short)}</a>`).join('<span class="sep">·</span>')}</span>
    <span class="s-n num">${fmtN(c.count)} rows</span>
    <span class="s-t num" title="fetched ${esc(c.fetched_at)}">${esc(c.fetched_at.slice(5, 16).replace('T', ' '))} UTC</span>
    ${c.status === 'ok' ? '' : `<span class="s-warn" role="status">${c.status === 'empty' ? 'No data from this source on the last build' : 'Source failed on the last build'}${c.reason ? `: ${esc(c.reason)}` : ''}</span>`}
  </div>`).join('') + `</div><p class="s-foot">Each label links to the file or API the build reads. Rebuilt daily.</p>`;
}

// ---------- chain diff ----------
// Hand-curated per-chain facts (data/diffs/*.json -> diffs.json), loaded when the tab first opens. Ethereum is the
// baseline; every other cell is a delta mark with a sourced, dated note, or an explicit "unverified" blank.
let DIFF = null, diffLoading = false, diffErr = '', shownCells = [];
const MARK = { base: ['Ethereum baseline', 'base', '◆'], '+': ['adds to Ethereum', 'add', '+'], '-': ['missing vs Ethereum', 'miss', '−'], '~': ['changed vs Ethereum', 'chg', '~'], '=': ['same as Ethereum', 'same', '='] };
const markPill = (m) => `<span class="mk mk-${MARK[m][1]}" title="${MARK[m][0]}">${MARK[m][2]}</span>`;
const diffCol = (id) => DIFF.chains.find((c) => c.id === id);
const loadDiff = () => {
  if (DIFF || diffLoading) return;
  diffLoading = true;
  fetch('diffs.json').then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((d) => { DIFF = d; }).catch((e) => { diffErr = e.message; }).finally(() => { diffLoading = false; if (state.view === 'diff') render(); });
};
const dq = $('dq');
let dqTimer;
dq.addEventListener('input', () => { clearTimeout(dqTimer); dqTimer = setTimeout(() => set({ dq: dq.value.trim() }), 80); });

const diffIds = () => DIFF.chains.map((c) => c.id);
const shownCols = () => { const ids = parseCols(state.c, diffIds()); return DIFF.chains.filter((c) => ids.includes(c.id)); };
function diffRows(cols) {
  const words = state.dq.toLowerCase().split(/\s+/).filter(Boolean);
  return DIFF.dimensions.filter(([id, g, label]) => {
    if (state.dg && g !== state.dg) return false;
    if (!words.length) return true;
    const text = [id, label, ...cols.flatMap((c) => (c.facts[id] ? [c.label, c.facts[id].value, c.facts[id].note] : []))].join(' ').toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

function renderDiff() {
  if (!DIFF) {
    loadDiff();
    $('difft').innerHTML = `<tbody><tr><td class="d-load">${diffErr ? `<span class="b-error">Could not load diffs.json: ${esc(diffErr)}</span>` : 'Loading chain diff…'}</td></tr></tbody>`;
    return;
  }
  const cols = shownCols(), all = cols.length > MAX_COLS, ids = diffIds();
  const chip = (c) => {
    const on = !all && cols.includes(c), dis = !all && !on && cols.length >= MAX_COLS;
    return `<button class="cchip" data-col="${esc(c.id)}" aria-pressed="${on}"${dis ? ' disabled title="Up to 4 chains: remove one first"' : ''} style="--c:${cc(c.chain)}">${logo(c.chain)}<span>${esc(c.label)}</span></button>`;
  };
  $('diff-head').innerHTML = `<div class="side-h"><h3>How each chain differs</h3></div>
    <div class="cmp-pick" role="group" aria-label="Chains to compare">${DIFF.chains.map(chip).join('')}<button class="cchip cchip-all" data-col="all" aria-pressed="${all}">All chains</button></div>
    <p class="cmp-hint">${all ? `All ${ids.length} chains. Pick a chain to start a side-by-side compare.` : `Comparing ${cols.length} chains · pick ${MIN_COLS} to ${MAX_COLS}. Rows where they differ are marked with a bar; rows that read the same are dimmed.`}</p>
    <div class="legend">${['base', '+', '-', '~', '='].map((m) => `<span>${markPill(m)}${MARK[m][0]}</span>`).join('')}<span><span class="mk mk-none">·</span>unverified</span><span><span class="obs">obs</span>read from a live RPC</span></div>`;
  for (const b of $('diff-head').querySelectorAll('[data-col]')) b.onclick = () => {
    const next = b.dataset.col === 'all' ? ids : toggleCol(cols.map((c) => c.id), b.dataset.col, ids);
    set({ c: serializeCols(next, ids), cell: '' });
  };

  if (document.activeElement !== dq) dq.value = state.dq;
  const rows = diffRows(cols);
  const dgB = document.querySelector('[data-pop="dg"]');
  dgB.classList.toggle('set', !!state.dg);
  dgB.innerHTML = `<span class="k">Dimensions</span><span class="v">${state.dg ? esc(DIFF.groups.find(([g]) => g === state.dg)[1]) : 'All'}</span>${caretSvg}`;
  renderPop();

  shownCells = [];
  const n = cols.length;
  let lastG = '';
  const body = rows.map(([id, g, label]) => {
    const gl = esc(DIFF.groups.find(([x]) => x === g)[1]);
    const head = g !== lastG ? `<tr class="d-grp"><th>${gl}</th><td colspan="${n}"></td></tr><tr class="d-grp d-grp-m"><th colspan="${n}">${gl}</th></tr>` : '';
    lastG = g;
    const rs = rowState(cols.map((c) => c.facts[id]));
    const tag = rs === 'same' ? '<span class="r-tag">same</span>' : '';
    return head + `<tr class="d-lab r-${rs}"><th colspan="${n}">${esc(label)}${tag}</th></tr><tr class="r-${rs}"><th class="d-dim" title="${esc(id)}">${esc(label)}${tag}</th>${cols.map((c) => {
      const f = c.facts[id];
      const key = `${c.id}|${id}`;
      if (!f) return `<td class="t-blank"><button class="d-cell blank" data-cell="${esc(key)}" title="${esc(c.label)}: unverified, no spec, code or RPC read states this yet"><span class="mk mk-none">·</span><span class="d-v">unverified</span></button></td>`;
      shownCells.push(key);
      return `<td class="t-${MARK[f.mark][1]}"><button class="d-cell m-${MARK[f.mark][1]}${state.cell === key ? ' sel' : ''}" data-cell="${esc(key)}" title="${esc(c.label)} · ${esc(label)}: ${esc(MARK[f.mark][0])}">${markPill(f.mark)}<span class="d-v">${esc(f.value)}</span>${f.kind === 'observed' ? '<span class="obs">obs</span>' : ''}</button></td>`;
    }).join('')}</tr>`;
  }).join('');
  $('difft').className = `diff${all ? '' : ` cmp cmp-${n}`}`;
  $('difft').innerHTML = `<thead><tr><th class="d-corner">Dimension</th>${cols.map((c) => `<th style="--c:${cc(c.chain)}"><span class="d-ch">${logo(c.chain)}<span><b>${esc(c.label)}</b><small>${esc(c.role)}</small></span></span></th>`).join('')}</tr></thead>
    <tbody>${body || `<tr><td class="d-load" colspan="${cols.length + 1}">No dimension matches these filters.</td></tr>`}</tbody>`;
  for (const b of $('difft').querySelectorAll('[data-cell]')) b.onclick = () => set({ cell: b.dataset.cell });
  $('diff-foot').textContent = `Showing ${rows.length} of ${DIFF.dimensions.length} dimensions across ${n} chains. Marks always read against Ethereum; "differs" and "same" compare the chains on screen. Every non-blank cell links to the spec, code (pinned to a commit) or docs page it came from, plus an as-of date; "obs" cells were read from a public RPC at the block named in the source. Click any cell for the full note.`;
}

function srcList(sources) {
  return `<ul class="srcs">${sources.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)} ${icon.ext}</a></li>`).join('')}</ul>`;
}
function renderDiffDrawer() {
  const d = $('drawer');
  if (!DIFF) return;
  const close = () => { d.querySelector('[data-close]').onclick = () => set({ cell: '' }); for (const b of d.querySelectorAll('[data-step]')) b.onclick = () => stepCell(+b.dataset.step); };
  const open = () => { d.classList.add('open'); d.setAttribute('aria-hidden', 'false'); $('scrim').hidden = false; };
  const bar = (title, pos = '') => `<div class="dh"><span class="rid">${title}</span><span class="sp"></span>${pos}
    ${pos ? `<button class="icon-btn" data-step="-1" aria-label="Previous (k)" title="Previous (k / ↑)">${icon.up}</button><button class="icon-btn" data-step="1" aria-label="Next (j)" title="Next (j / ↓)">${icon.down}</button>` : ''}
    <button class="icon-btn" data-close aria-label="Close (Esc)" title="Close (Esc)">${icon.x}</button></div>`;
  const [cid, dim] = state.cell.split('|');
  const c = diffCol(cid), meta = DIFF.dimensions.find(([id]) => id === dim);
  if (!c || !meta) return set({ cell: '' });
  const f = c.facts[dim], eth = diffCol('ethereum').facts[dim];
  const i = shownCells.indexOf(state.cell);
  d.innerHTML = bar(`${logo(c.chain)}<span class="rid-t">${esc(c.label)} · ${esc(meta[2])}</span>`, i >= 0 ? `<span class="pos">${i + 1} / ${shownCells.length}</span>` : '') + `<div class="db">
    <div class="label">${esc(DIFF.groups.find(([g]) => g === meta[1])[1])} › ${esc(meta[2])}</div>
    ${f ? `<h2>${markPill(f.mark)} ${esc(f.value)}</h2>
      <p class="abs">${esc(f.note)}</p>
      <dl class="kv">
        <dt>Chain</dt><dd class="chain-dd">${logo(c.chain)} ${esc(c.label)} · ${esc(c.role)}</dd>
        <dt>vs Ethereum</dt><dd>${esc(MARK[f.mark][0])}</dd>
        ${cid !== 'ethereum' && eth ? `<dt>Ethereum</dt><dd><button class="link" data-goto-cell="ethereum|${esc(dim)}">${esc(eth.value)}</button></dd>` : ''}
        <dt>Evidence</dt><dd>${f.kind === 'observed' ? 'observed on a live public RPC (see source for endpoint and block)' : f.kind === 'code' ? 'client code, pinned to a commit' : f.kind === 'spec' ? 'specification' : 'documentation / specification'}</dd>
        <dt>As of</dt><dd class="mono" style="font-size:12px">${esc(f.as_of)}</dd>
      </dl>
      ${f.items ? `<div><div class="label">${f.items.length} listed</div><ul class="items">${f.items.map((it) => `<li><div class="it-h"><b>${esc(it.name)}</b>${it.status ? `<span class="it-s">${esc(it.status)}</span>` : ''}</div>${it.note ? `<p>${esc(it.note)}</p>` : ''}<div class="it-src">${it.sources.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)} ${icon.ext}</a>`).join('')}</div></li>`).join('')}</ul></div>` : ''}
      <div><div class="label">Sources</div>${srcList(f.sources)}</div>`
    : `<h2><span class="none">Unverified</span></h2><p class="abs">No spec, client code, docs page or RPC read found that states this for ${esc(c.label)}, so the cell is left blank.</p>
      ${eth ? `<dl class="kv"><dt>Ethereum</dt><dd><button class="link" data-goto-cell="ethereum|${esc(dim)}">${esc(eth.value)}</button></dd></dl>` : ''}`}
    <div class="hint">Esc closes · j / k or ↑ / ↓ step through filled cells</div></div>`;
  for (const b of d.querySelectorAll('[data-goto-cell]')) b.onclick = () => set({ cell: b.dataset.gotoCell });
  open(); close();
}
function stepCell(n) {
  if (!shownCells.length) return;
  const i = shownCells.indexOf(state.cell);
  const next = shownCells[Math.max(0, Math.min(shownCells.length - 1, i < 0 ? 0 : i + n))];
  set({ cell: next });
  document.querySelector(`[data-cell="${CSS.escape(next)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// ---------- drawer ----------
function renderDrawer() {
  const r = state.id && byId.get(state.id);
  const d = $('drawer');
  document.querySelectorAll('.row.sel').forEach((x) => x.classList.toggle('sel', x.dataset.key === state.id));
  if (!r) { d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); $('scrim').hidden = true; return; }
  const i = shownList.indexOf(r);
  const terms = (w) => (w[0] === 'curated' ? '<span class="cur">curated</span>' : `matched: ${w.map(esc).join(', ')}`);
  const tagsHtml = r.tags.length ? (r.curated ? `<div class="why-row curated-note"><span class="cur">curated</span><span class="terms">${esc(r.curated)}</span></div>` : '')
      + r.tags.map((t) => `<div class="why-row">${tagPill(t, '', r.curated ? 'curated' : 'derived')}<span class="terms">${terms(r.why[t])}</span></div>`
      + `<div class="why-row why-sub"><span class="arrow">›</span>${r.subs[t] ? `<span class="tag" style="--t:${TAGS[t][1]}">${esc(subLabel(t, r.subs[t].sub))}</span><span class="terms">${terms(r.subs[t].why)}</span>` : '<span class="terms none">no subcategory matched</span>'}</div>`).join('')
    : '<span class="none">No rule matched, so no tag.</span>';
  d.innerHTML = `<div class="dh" style="--c:${cc(r.chain)}"><span class="rid" title="${esc(r.id)}">${logo(r.chain)}<span class="rid-t">${esc(r.id)}</span></span><span class="sp"></span>
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
      ${refsHtml(r)}
      <div><div class="label">Layer › subcategory · ${r.curated ? 'curated by hand, with the reason' : "derived from the proposal's own text"}</div><div class="why">${tagsHtml}</div></div>
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
  for (const b of d.querySelectorAll('[data-goto]')) b.onclick = () => set({ id: b.dataset.goto });
}
function step(n) {
  if (state.cell) return stepCell(n);
  if (!shownList.length) return;
  const i = shownList.findIndex((r) => r._key === state.id);
  const next = shownList[Math.max(0, Math.min(shownList.length - 1, i < 0 ? 0 : i + n))];
  if (state.view === 'proposals') { const idx = shownList.indexOf(next); if (idx >= limit) { limit = idx + 1; renderProposals(shownList); } }
  set({ id: next._key });
  document.querySelector(`[data-key="${CSS.escape(next._key)}"]`)?.scrollIntoView({ block: 'nearest' });
}
$('scrim').onclick = () => set({ id: '', cell: '' });
document.addEventListener('keydown', (e) => {
  const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '');
  if (e.key === '/' && !typing) { e.preventDefault(); const box = state.view === 'diff' ? dq : q; box.focus(); box.select(); return; }
  if (e.key === 'Escape') {
    if (openPop) return closePop();
    if (state.id || state.cell) return set({ id: '', cell: '' });
    if (document.activeElement === q) { q.value = ''; q.blur(); return set({ q: '' }); }
    if (document.activeElement === dq) { dq.value = ''; dq.blur(); return set({ dq: '' }); }
  }
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (['j', 'ArrowDown'].includes(e.key) && (state.id || state.cell || e.key === 'j')) { e.preventDefault(); step(1); }
  if (['k', 'ArrowUp'].includes(e.key) && (state.id || state.cell || e.key === 'k')) { e.preventDefault(); step(-1); }
});

// ---------- render ----------
let lastView;
function render() {
  for (const b of $('tabs').querySelectorAll('button')) { if (b.dataset.view === state.view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
  for (const v of VIEWS) $(`v-${v}`).hidden = state.view !== v;
  const filt = ['proposals', 'layers'].includes(state.view);
  $('filters').hidden = !filt;
  if (state.view !== lastView) { limit = 300; lastView = state.view; }
  if (openPop && !(filt || (state.view === 'diff' && openPop === 'dg'))) closePop();
  const shown = filt ? renderFilters() : [];
  if (state.view === 'proposals') renderProposals(shown);
  if (state.view === 'layers') renderLayers();
  if (state.view === 'upgrades') { renderUpgrades(); shownList = []; }
  if (state.view === 'sources') { renderSources(); shownList = []; }
  if (state.view === 'diff') { renderDiff(); shownList = []; }
  if (state.cell && state.view === 'diff') renderDiffDrawer(); else renderDrawer();
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
  readUrl();
  if (state.tag && TAX[state.tag]) expanded.add(state.tag);
  render();
}).catch((e) => { $('main').insertAdjacentHTML('afterbegin', `<p class="empty b-error">Could not load data.json: ${esc(e.message)}</p>`); });
