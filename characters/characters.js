(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const EL = { 'Fire': 'fire', 'Water': 'water', 'Wind': 'wind', 'Earth': 'earth', 'Light': 'light', 'Dark': 'dark', 'Non-elemental': 'none' };
  const ORDER = ['Fire', 'Water', 'Wind', 'Earth', 'Light', 'Dark', 'Non-elemental'];
  const col = e => `--c:var(--el-${EL[e] || 'none'})`;
  const state = { q: '', els: new Set(), weapon: '', source: '', rarity: '', sort: 'week' };
  let C = [];

  const when = c => c.debutWeek ? `From week ${c.debutWeek}` : c.source;
  function card(c) {
    return `<button class="ch" data-id="${c.id}" style="${col(c.element)}"><div class="pic"><img src="art/${c.icon}.webp" alt="" loading="lazy" decoding="async"><span class="rar">★${c.rarity}</span></div>
      <div class="b"><span class="t">${esc(c.title)}</span><span class="n">${esc(c.short)}</span><span class="m"><span class="el">${esc(c.element)}</span><span>${esc(c.weapon)}</span><span>${esc(when(c))}</span></span></div></button>`;
  }
  function render() {
    const q = state.q.trim().toLowerCase();
    let list = C.filter(c => (!q || `${c.name} ${c.title} ${c.short}`.toLowerCase().includes(q)) &&
      (!state.els.size || state.els.has(c.element)) && (!state.weapon || c.weapon === state.weapon) &&
      (!state.source || c.source === state.source) && (!state.rarity || String(c.rarity) === state.rarity));
    if (state.sort === 'name') list = list.slice().sort((a, b) => a.short.localeCompare(b.short) || a.title.localeCompare(b.title));
    if (state.sort === 'element') list = list.slice().sort((a, b) => ORDER.indexOf(a.element) - ORDER.indexOf(b.element) || (a.debutWeek || 999) - (b.debutWeek || 999));
    $('#grid').innerHTML = list.map(card).join('');
    $('#count').textContent = `${list.length} of ${C.length} characters`;
    $('#empty').hidden = !!list.length;
  }
  function open(id) {
    const c = C.find(x => x.id === id); if (!c) return;
    const scouts = c.featured.length ? `<h3>Featured scouts</h3><ul>${c.featured.map(f => `<li><a href="../calendar/#w${f.week}">Week ${f.week}</a>: ${esc(f.title)}</li>`).join('')}</ul>` :
      `<h3>How to get</h3><p class="desc">${esc(c.source === 'Season Pass' ? 'A Season Pass reward.' : c.source === 'Event or gift' ? 'From an event reward or a gift, not from scouts.' : c.source === 'Special scout' ? 'Only from special scouts outside the regular schedule.' : c.debutWeek ? `In the scout pool from week ${c.debutWeek}.` : 'From scouts.')}</p>`;
    $('#dv').innerHTML = `<button class="close" id="x" aria-label="Close">Close</button><img src="art/${c.art}.webp" alt="${esc(c.name)}">
      <div class="in"><h2>${esc(c.short)}</h2><p class="sub">${esc(c.title)}</p>
      <div class="facts" style="${col(c.element)}"><span>★${c.rarity}</span><span class="el">${esc(c.element)}</span><span>${esc(c.weapon)}</span><span>${esc(c.source)}${c.debutWeek ? ' · from week ' + c.debutWeek : ''}</span></div>
      ${c.desc ? `<p class="desc">${esc(c.desc)}</p>` : ''}${scouts}</div>`;
    $('#x').onclick = () => $('#dlg').close();
    $('#dlg').showModal();
  }
  $('#grid').addEventListener('click', e => { const b = e.target.closest('.ch'); if (b) open(+b.dataset.id); });
  $('#dlg').addEventListener('click', e => { if (e.target === $('#dlg')) $('#dlg').close(); });
  let t; $('#q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; render(); }, 100); });
  for (const k of ['weapon', 'source', 'rarity', 'sort']) $('#' + k).addEventListener('change', e => { state[k] = e.target.value; render(); });

  fetch('characters-data.json').then(r => r.json()).then(d => {
    C = d.characters;
    $('#els').innerHTML = ORDER.map(e => `<button style="${col(e)}" data-el="${esc(e)}" aria-pressed="false"><i></i>${esc(e)}</button>`).join('');
    $('#els').addEventListener('click', e => { const b = e.target.closest('[data-el]'); if (!b) return; const v = b.dataset.el; state.els.has(v) ? state.els.delete(v) : state.els.add(v); b.setAttribute('aria-pressed', state.els.has(v)); render(); });
    const opts = (k, sel) => [...new Set(C.map(c => c[k]))].sort().forEach(v => sel.insertAdjacentHTML('beforeend', `<option>${esc(v)}</option>`));
    opts('weapon', $('#weapon')); opts('source', $('#source'));
    render();
  }).catch(() => { $('#grid').innerHTML = '<p class="empty">The list didn\'t load. Refresh the page.</p>'; });
})();
