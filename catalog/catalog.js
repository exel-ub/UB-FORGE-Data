(() => {
  const PAGE = 60;
  const $ = s => document.querySelector(s);
  const out = $('#out'), count = $('#count'), more = $('#more'), dlg = $('#dlg');
  const q = $('#q'), region = $('#region'), pics = $('#pics'), qa = $('#qa');
  let data, view = 'products', list = [], shown = 0;
  const regionName = { US: 'US', EU: 'EU', AP: 'Asia' };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fill = s => esc(s).replace(/\{\d\}/g, '<span class="ph" title="Filled in by the game at runtime">?</span>');
  const norm = s => String(s ?? '').toLowerCase();

  function filtered() {
    const term = norm(q.value.trim());
    if (view === 'images') return data.images.filter(i => !term || norm(i.ref).includes(term));
    if (view === 'season') return data.season.filter(s => !term || [s.n, s.jn, s.sku, s.id, s.seasonName].some(v => norm(v).includes(term)));
    return data.products.filter(p =>
      (qa.checked || !p.qa) &&
      (!pics.checked || p.img) &&
      (!region.value || (region.value === '-' ? !p.r : p.r === region.value)) &&
      (!term || [p.n, p.d, p.jn, p.jd, p.sku, p.id].some(v => norm(v).includes(term))));
  }

  function card(p, i) {
    const pic = p.img
      ? `<div class="pic ${p.shape === 'icon' ? 'icon' : ''}"><img loading="lazy" src="images/${p.img}" alt=""></div>`
      : `<div class="pic"><span class="none">${p.missing ? 'Picture not recovered' : 'No picture'}</span></div>`;
    const tags = [`<span>#${p.id}</span>`];
    if (p.r) tags.push(`<span class="tag">${regionName[p.r]}</span>`);
    if (p.qa) tags.push('<span class="tag qa">Test version</span>');
    if (view === 'season') tags.push(`<span class="tag">${esc(p.seasonName)}</span>`);
    return `<button class="item" data-i="${i}">${pic}<div class="body"><h3>${esc(p.n || p.jn)}</h3>${p.d ? `<div class="desc">${fill(p.d)}</div>` : ''}<div class="meta">${tags.join('')}</div></div></button>`;
  }

  function render(reset) {
    if (reset) { list = filtered(); shown = 0; out.innerHTML = ''; }
    const next = list.slice(shown, shown + PAGE);
    if (view === 'images') {
      if (reset) out.innerHTML = '<div class="gallery"></div>';
      out.firstChild.insertAdjacentHTML('beforeend', next.map(i =>
        `<a href="images/${i.img}" target="_blank" rel="noopener"><img loading="lazy" src="images/${i.img}" alt="${esc(i.ref)}"><span>${esc(i.ref.replace(/^files\//, ''))} · ${i.w}×${i.h}</span></a>`).join(''));
    } else {
      if (reset) out.innerHTML = '<div class="grid"></div>';
      out.firstChild.insertAdjacentHTML('beforeend', next.map((p, k) => card(p, shown + k)).join(''));
    }
    shown += next.length;
    const noun = view === 'images' ? 'pictures' : view === 'season' ? 'Season Pass products' : 'products';
    count.textContent = list.length ? `Showing ${shown} of ${list.length} ${noun}` : '';
    if (!list.length) out.innerHTML = `<p class="empty">Nothing matches “${esc(q.value)}”. Try a shorter search${view === 'products' ? ' or include test versions' : ''}.</p>`;
    more.hidden = shown >= list.length;
  }

  function open(p) {
    const rows = [
      ['ID', p.id], ['SKU', p.sku],
      ...(p.r !== undefined ? [['Region', p.r ? regionName[p.r] : 'Japan / unmarked']] : []),
      ...(p.seasonName ? [['Season', `Season ${p.season}: ${p.seasonName}`]] : []),
      ...(p.qa ? [['Version', 'Test version (not shown to players)']] : []),
      ['Japanese name', p.jn], ...(p.jd ? [['Japanese text', p.jd]] : []),
    ];
    dlg.innerHTML = `${p.img ? `<div class="dimg"><img src="images/${p.img}" alt=""></div>` : ''}
      <div class="dbody"><h2>${esc(p.n || p.jn)}</h2>${p.d ? `<p class="ja">${fill(p.d)}</p>` : ''}
      <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${fill(v)}</dd>`).join('')}</dl>
      <p style="margin:18px 0 0;display:flex;gap:10px;flex-wrap:wrap">${p.img ? `<a class="btn" href="images/${p.img}" target="_blank" rel="noopener">Open full picture</a>` : ''}<button class="btn" data-close>Close</button></p></div>`;
    dlg.showModal();
  }

  out.addEventListener('click', e => {
    const b = e.target.closest('.item'); if (!b) return;
    open(list[+b.dataset.i]);
  });
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
  more.addEventListener('click', () => render(false));
  let t; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => render(true), 120); });
  [region, pics, qa].forEach(el => el.addEventListener('change', () => render(true)));
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
    view = b.dataset.view;
    document.querySelectorAll('[data-view]').forEach(x => x.setAttribute('aria-pressed', x === b));
    $('#filters').hidden = view !== 'products';
    $('#filters').style.display = view === 'products' ? 'contents' : 'none';
    render(true);
  }));

  fetch('catalog-data.json').then(r => r.json()).then(d => {
    data = d;
    d.products.sort((a, b) => a.id - b.id);
    $('#n-products').textContent = d.products.length.toLocaleString();
    $('#n-season').textContent = d.season.length;
    $('#n-images').textContent = d.images.length;
    render(true);
  }).catch(() => { count.textContent = 'The catalog file didn’t load. Refresh the page to try again.'; });
})();
