(() => {
  const $ = s => document.querySelector(s);
  const DAY = 86400000;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STORE = 'ubforge-calendar';
  const todayISO = () => { const n = new Date(Date.now() - 6 * 3600000); return n.toISOString().slice(0, 10); };
  const saved = (() => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } })();
  const state = {
    pace: saved.pace || 'default',
    start: saved.start || todayISO(),
    q: '',
    show: Object.assign({ weapon: true, pickup: true, events: true, wou: true, holiday: true, daily: false }, saved.show || {})
  };
  const persist = () => { try { localStorage.setItem(STORE, JSON.stringify({ pace: state.pace, start: state.start, show: state.show })); } catch {} };
  let D = null;
  const rotCache = {};

  // ----- time -----
  const startMs = () => { const [y, m, d] = state.start.split('-').map(Number); return Date.UTC(y, m - 1, d, 6); };
  const L = () => D.paces[state.pace].weekDays;
  const OW = () => D.originalWeekStart;
  function weekRange(w) {
    if (L()) return [(w - 1) * L(), w * L()];
    const s = OW()[w], n = OW()[w + 1];
    return [s, n != null ? n : s + 28];
  }
  function weekOfDay(d) {
    if (L()) return Math.min(D.weeks, Math.floor(d / L()) + 1);
    let w = 1; for (let i = 1; i <= D.weeks; i++) if (OW()[i] <= d) w = i; return w;
  }
  const runEnd = () => weekRange(D.weeks)[1];
  const fmt = (d, year) => new Date(startMs() + d * DAY).toLocaleDateString(undefined, Object.assign({ month: 'short', day: 'numeric', timeZone: 'UTC' }, year ? { year: 'numeric' } : {}));
  const span = (a, b) => (b - 1 <= a ? fmt(a) : `${fmt(a)} – ${fmt(b - 1)}`);
  const nowDay = () => Math.floor((Date.now() - startMs()) / DAY);

  // ----- what runs when -----
  function eventDays(e) {
    const d = e.days[state.pace];
    if (state.pace !== 'original' && e.rampWeek) { const s = (e.rampWeek - e.week) * L(); return { week: e.rampWeek, a: d[0] + s, b: d[1] + s }; }
    return { week: e.week, a: d[0], b: d[1] };
  }
  function rotation(key) {
    const id = state.pace + ':' + key;
    if (rotCache[id]) return rotCache[id];
    const list = D.rotations[key], out = []; let i = -1;
    for (let d = 0; d < runEnd(); d++) {
      const wk = weekOfDay(d);
      for (let t = 1; t <= list.length; t++) { const j = (i + t) % list.length; if (list[j].unlockWeek <= wk) { i = j; break; } }
      out.push(i >= 0 ? list[i] : null);
    }
    return (rotCache[id] = out);
  }
  function holidayWindows() {
    const s0 = new Date(startMs()).getUTCFullYear(), out = [];
    const end = runEnd();
    for (let y = s0 - 1; y <= s0 + 4; y++) for (const h of D.holidays) {
      const a = Date.UTC(y, h.start.month - 1, h.start.day, 6);
      const ey = (h.end.month < h.start.month) ? y + 1 : y;
      const b = Date.UTC(ey, h.end.month - 1, h.end.day + 1, 6);
      const da = Math.round((a - startMs()) / DAY), db = Math.round((b - startMs()) / DAY);
      if (db <= 0 || da >= end) continue;
      out.push({ h, a: da, b: db, week: weekOfDay(Math.max(0, da)) });
    }
    return out;
  }
  const wouCycles = () => { const out = [], n = D.wou.vols.length; for (let c = 0; 14 * c < runEnd(); c++) out.push({ c, v: D.wou.vols[c % n], loop: Math.floor(c / n) + 1, a: 14 * c, b: 14 * c + 14, week: weekOfDay(14 * c) }); return out; };

  // ----- rendering -----
  const img = a => a ? `<div class="pic"><img src="art/${a}.webp" alt="" loading="lazy" decoding="async"></div>` : '<div class="pic none">No picture</div>';
  const card = (o) => `<article class="card" data-text="${esc(o.text.toLowerCase())}">${img(o.art)}<div class="b"><h3>${esc(o.title)}</h3><div class="when">${esc(o.when)}</div>${o.feat ? `<div class="feat">${esc(o.feat)}</div>` : ''}<div class="tags">${o.tags.join('')}</div></div></article>`;
  const tag = (t, c) => `<span class="tag ${c || ''}">${esc(t)}</span>`;

  function render() {
    const byWeek = {}; for (let w = 1; w <= D.weeks; w++) byWeek[w] = { scouts: [], events: [], hol: [] };
    for (const b of D.banners) {
      if (b.kind === 'point_exchange') continue;
      if (b.kind === 'weapon' && !state.show.weapon) continue;
      if (b.role === 'pickup' && !state.show.pickup) continue;
      const [a, z] = b.days[state.pace];
      const tags = [b.kind === 'weapon' ? tag('Weapon', 'w') : b.role === 'pickup' ? tag('Pick-up', 'p') : tag('Scout')];
      byWeek[b.week].scouts.push({ a, html: card({ art: b.art, title: b.title, when: span(a, z), feat: b.featured.length ? b.featured.join(' · ') : '', tags, text: b.title + ' ' + b.featured.join(' ') }) });
    }
    if (state.show.events) for (const e of D.events) {
      const t = eventDays(e);
      const tags = [tag(e.label)];
      if (e.type.startsWith('lane:')) tags.push(tag('New volume', 'n'));
      if (e.persists) tags.push(tag('Story stays open'));
      byWeek[t.week].events.push({ a: t.a, html: card({ art: e.art, title: e.name, when: span(t.a, t.b), tags, text: e.name + ' ' + e.label }) });
    }
    if (state.show.wou) for (const c of wouCycles()) {
      const tags = [tag('War of Underworld'), tag('Vol. ' + c.v.vol)];
      if (c.loop > 1) tags.push(tag('Rerun'));
      if (c.v.ranking) tags.push(tag(c.loop > 1 ? 'Ranking, no rank rewards' : 'Ranking', 'r'));
      const feat = c.v.worldBoss ? `World boss ${c.v.worldBoss} from ${fmt(c.a + c.v.worldBossDay)}` : '';
      byWeek[c.week].events.push({ a: c.a, html: card({ art: c.v.art, title: c.v.name, when: span(c.a, c.b), feat, tags, text: c.v.name + ' war of underworld wou ' + (c.v.worldBoss || '') }) });
    }
    if (state.show.holiday) for (const w of holidayWindows()) {
      const h = w.h;
      const items = h.banners.filter(b => state.show.weapon || b.kind !== 'weapon').map(b => card({ art: b.art, title: b.title, when: span(w.a, w.b), tags: [tag('Holiday', 'h'), b.kind === 'weapon' ? tag('Weapon', 'w') : tag('Scout')], text: b.title + ' ' + h.name }));
      if (state.show.events) for (const e of h.events) items.push(card({ art: e.art, title: e.name, when: span(w.a, w.b), tags: [tag('Holiday', 'h'), e.ranking ? tag('Ranking', 'r') : tag('Event')], text: e.name + ' ' + h.name }));
      const extra = h.seasonPasses.map(p => `Season Pass: ${p.name}`).join(' · ');
      byWeek[w.week].hol.push({ a: w.a, html: `<div class="hol" data-hol><h3>${esc(h.name)}: ${esc(span(w.a, w.b))}</h3><p>Real-date holiday, on every save.${extra ? ' ' + esc(extra) + '.' : ''}</p><div class="grid">${items.join('')}</div></div>` });
    }
    const today = nowDay(), curWeek = today >= 0 && today < runEnd() ? weekOfDay(today) : null;
    const pick = state.show.daily ? rotation('dailyPickUp') : null, free = state.show.daily ? rotation('dailyFree') : null;
    let html = '';
    for (let w = 1; w <= D.weeks; w++) {
      const [a, z] = weekRange(w), x = byWeek[w];
      const sort = l => l.sort((p, q) => p.a - q.a).map(i => i.html).join('');
      let daily = '';
      if (pick) {
        let rows = '';
        for (let d = a; d < z && d < pick.length; d++) {
          const p = pick[d], f = free[d], cls = d === today ? ' today' : '';
          rows += `<div class="d${cls}">${esc(fmt(d))}</div><div class="s" data-text="${esc(((p && p.title) || '').toLowerCase())}">${p && p.art ? `<img src="art/${p.art}.webp" alt="" loading="lazy">` : ''}<span>${esc(p ? p.title : 'None yet')}</span></div><div class="s free">${f && f.art ? `<img src="art/${f.art}.webp" alt="" loading="lazy">` : ''}<span>${esc(f ? f.title : 'None yet')}</span></div>`;
        }
        daily = `<details class="daily"><summary>Daily scouts</summary><div class="dl"><div class="h">Day</div><div class="h">Daily Pick-Up</div><div class="h free">Daily Free</div>${rows}</div></details>`;
      }
      html += `<section class="week${w === curWeek ? ' current' : ''}" id="w${w}"><div class="wh"><h2>Week ${w}</h2><span class="dates">${esc(fmt(a, true))} – ${esc(fmt(z - 1, true))}</span><span class="day">Day ${a}–${z - 1}</span>${w === curWeek ? '<span class="badge">This week</span>' : ''}</div>` +
        sort(x.hol) +
        (x.scouts.length ? `<div class="sub">Scouts</div><div class="grid">${sort(x.scouts)}</div>` : '') +
        (x.events.length ? `<div class="sub">Events</div><div class="grid">${sort(x.events)}</div>` : '') + daily + '</section>';
    }
    $('#weeks').innerHTML = html;
    applySearch();
    const lab = D.paces[state.pace].label;
    $('#now').innerHTML = today < 0 ? `Your save starts on <b>${esc(fmt(0, true))}</b>.` : curWeek ? `Today is <b>day ${today}</b>, in <b>week ${curWeek}</b> on ${esc(lab)} pace.` : `Today is past the end of the ${esc(lab)} schedule.`;
    $('#today').disabled = !curWeek;
  }

  function applySearch() {
    const q = state.q.trim().toLowerCase();
    let any = false;
    document.querySelectorAll('.week').forEach(sec => {
      let shown = 0;
      sec.querySelectorAll('[data-text]').forEach(el => { const ok = !q || el.dataset.text.includes(q); el.hidden = !ok; if (ok) shown++; });
      sec.querySelectorAll('.grid').forEach(g => { const sub = g.previousElementSibling; const has = [...g.children].some(c => !c.hidden); g.hidden = !has; if (sub && sub.classList.contains('sub')) sub.hidden = !has; });
      sec.querySelectorAll('[data-hol]').forEach(h => { h.hidden = ![...h.querySelectorAll('.card')].some(c => !c.hidden); });
      sec.hidden = q && !shown; if (!sec.hidden) any = true;
      if (q) sec.querySelectorAll('details.daily').forEach(dt => { dt.open = [...dt.querySelectorAll('.s[data-text]')].some(s => !s.hidden && s.dataset.text); });
    });
    $('#empty').hidden = any;
  }

  // ----- controls -----
  document.querySelectorAll('[data-pace]').forEach(b => b.addEventListener('click', () => {
    state.pace = b.dataset.pace; persist();
    document.querySelectorAll('[data-pace]').forEach(x => x.setAttribute('aria-pressed', x === b));
    render();
  }));
  document.querySelectorAll('[data-show]').forEach(c => c.addEventListener('change', () => { state.show[c.dataset.show] = c.checked; persist(); render(); }));
  $('#start').addEventListener('change', e => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) { state.start = e.target.value; persist(); render(); } });
  let t; $('#q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; applySearch(); }, 120); });
  $('#today').addEventListener('click', () => { const d = nowDay(); if (d >= 0 && d < runEnd()) document.getElementById('w' + weekOfDay(d)).scrollIntoView({ behavior: 'smooth', block: 'start' }); });

  $('#start').value = state.start;
  document.querySelectorAll('[data-pace]').forEach(x => x.setAttribute('aria-pressed', x.dataset.pace === state.pace));
  document.querySelectorAll('[data-show]').forEach(c => { c.checked = !!state.show[c.dataset.show]; });
  fetch('calendar-data.json').then(r => r.json()).then(d => {
    D = d; render();
    const day = nowDay();
    if (day > 0 && day < runEnd()) { const el = document.getElementById('w' + weekOfDay(day)); if (el) el.scrollIntoView({ block: 'start' }); }
  }).catch(() => { $('#weeks').innerHTML = '<p class="empty">The calendar didn\'t load. Refresh the page.</p>'; });
})();
