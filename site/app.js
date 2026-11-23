// Renders data.json: upgrades summary, per-chain source status cards and a filterable table.
import { sortNewestFirst, upgradesByChain } from './derive.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const none = '<span class="none">—</span>';

fetch('data.json').then((r) => r.json()).then((data) => {
  $('generated').textContent = `Built ${new Date(data.generated_at).toISOString().slice(0, 16).replace('T', ' ')} UTC.`;
  const rows = sortNewestFirst(data.chains.flatMap((c) => c.proposals));

  const filterLink = (chain, q, text) => `<a href="?chain=${encodeURIComponent(chain)}&q=${encodeURIComponent(q)}">${text}</a>`;
  const up = (chain, u) => u ? `<div class="up"><a href="${esc(u.row.url)}" target="_blank" rel="noopener">${u.row.network ? `${esc(u.row.network)} ` : ''}${esc(u.row.target_upgrade)}</a>
    ${u.date ? `<div class="muted">${esc(u.date)}</div>` : `<span class="muted">${esc(u.row.status)}</span>`}
    ${u.proposals.length ? `<div class="muted">${filterLink(chain, u.row.target_upgrade, `${u.proposals.length} proposal${u.proposals.length > 1 ? 's' : ''} targeting it`)}</div>` : ''}</div>` : none;
  $('ups').innerHTML = upgradesByChain(data.chains, Date.parse(data.generated_at)).map((c) => `<tr data-chain="${esc(c.chain)}">
    <td>${esc(c.chain)}</td><td>${up(c.chain, c.latest)}</td><td>${up(c.chain, c.next)}</td>
    <td>${c.undated.length ? c.undated.map((u) => up(c.chain, u)).join('') : none}</td></tr>`).join('');

  $('chains').innerHTML = data.chains.map((c) => `
    <section class="chain" data-chain="${esc(c.chain)}" data-count="${c.count}" data-status="${c.status}">
      <h3><span>${esc(c.chain)}</span><span><span class="count">${c.count}</span> <span class="badge s-${c.status}">${c.status === 'ok' ? 'source ok' : c.status === 'empty' ? 'no data' : 'error'}</span></span></h3>
      ${c.reason ? `<p class="s-${c.status}">${esc(c.reason)}</p>` : ''}
      <ul>${c.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('')}</ul>
      ${c.notes.map((n) => `<p class="muted">${esc(n)}</p>`).join('')}
      <p class="muted">Fetched ${esc(c.fetched_at.slice(0, 16).replace('T', ' '))} UTC · ${esc(c.adapter)}</p>
    </section>`).join('');

  for (const c of data.chains) $('f-chain').insertAdjacentHTML('beforeend', `<option>${esc(c.chain)}</option>`);
  const statuses = [...new Set(rows.map((r) => r.status || '(not stated)'))].sort((a, b) => a.localeCompare(b));
  for (const s of statuses) $('f-status').insertAdjacentHTML('beforeend', `<option>${esc(s)}</option>`);

  const params = new URLSearchParams(location.search);
  $('f-chain').value = params.get('chain') || '';
  $('f-status').value = params.get('status') || '';
  $('f-kind').value = params.get('kind') || '';
  $('f-q').value = params.get('q') || '';

  function render() {
    const chain = $('f-chain').value, status = $('f-status').value, kind = $('f-kind').value, q = $('f-q').value.trim().toLowerCase();
    const shown = rows.filter((r) => (!chain || r.chain === chain)
      && (!status || (r.status || '(not stated)') === status)
      && (!kind || r.kind === kind)
      && (!q || [r.id, r.title, r.target_upgrade, r.type, r.status, r.network].join(' ').toLowerCase().includes(q)));
    $('shown').textContent = `Showing ${shown.length} of ${rows.length}`;
    $('shown').dataset.shown = shown.length;
    $('rows').innerHTML = shown.map((r) => `<tr>
      <td>${esc(r.chain)}${r.network ? `<div class="muted">${esc(r.network)}</div>` : ''}</td>
      <td class="id"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.id)}</a></td>
      <td>${r.title ? esc(r.title) : none}</td>
      <td>${r.status ? esc(r.status) : none}</td>
      <td>${r.target_upgrade ? esc(r.target_upgrade) : none}</td>
      <td class="dates">${r.dates.length ? r.dates.map((d) => `${esc(d.label)}: ${esc(d.value)}`).join('<br>') : none}</td>
      <td class="type">${esc(r.kind)}${r.type ? `<div>${esc(r.type)}</div>` : ''}</td></tr>`).join('');
  }
  for (const id of ['f-chain', 'f-status', 'f-kind']) $(id).addEventListener('change', render);
  $('f-q').addEventListener('input', render);
  render();
}).catch((e) => { document.querySelector('main').insertAdjacentHTML('afterbegin', `<p class="s-error">Could not load data.json: ${esc(e.message)}</p>`); });
