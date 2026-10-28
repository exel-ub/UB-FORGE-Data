(() => {
  const F = window.ForgeCode;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { key: null, presets: [], byId: new Map(), kind: 'cubes', chosen: 2, last: '' };
  const STORE = 'ubforge-codes';
  const HIDDEN = new Set([102]); // not offered in the generator; still recognised by Check a code
  const isHidden = p => HIDDEN.has(p.presetId) || (p.presetId >= 2960 && p.presetId <= 2987); // profile trackers
  const today = () => new Date().toISOString().slice(0, 10);

  const isSong = p => p.presetId >= 2300 && p.presetId < 2400;
  const songKind = p => p.presetId <= 2311 ? 'Home music' : 'Battle music';
  const between = (p, a, b) => p.presetId >= a && p.presetId <= b;
  const themeKind = p => p.rewards[0].id >= 409990000 ? 'Wallpaper' : 'Home theme';
  const kindOf = p => { const r = p.rewards; return isSong(p) ? 'song' : between(p, 2400, 2599) || between(p, 3100, 3199) ? 'mat' : between(p, 2600, 2808) ? 'outfit' : between(p, 2809, 2959) ? 'bg' : between(p, 2988, 3099) ? 'theme' : p.presetId >= 2000 && p.presetId < 2200 ? 'pack' : r.length === 1 && r[0].type === 5 ? 'char' : r.length === 1 && r[0].type === 3 ? 'cubes' : 'other'; };
  const contents = p => p.rewards.map(r => `${(window.ITEM_NAMES || {})[r.id] || 'Item ' + r.id} ×${r.amount.toLocaleString()}`).join(', ');
  function renderRewards() {
    const term = $('#find').value.trim().toLowerCase();
    const rows = state.presets.filter(p => !isHidden(p) && kindOf(p) === state.kind && (!term || `${p.label} ${p.rewards[0].id} ${p.presetId}`.toLowerCase().includes(term)))
      .sort((a, b) => state.kind === 'cubes' ? a.rewards[0].amount - b.rewards[0].amount : state.kind === 'song' || state.kind === 'mat' || state.kind === 'bg' ? a.presetId - b.presetId : a.label.localeCompare(b.label));
    $('#rewards').innerHTML = rows.length ? rows.map(p => `<label><input type="radio" name="reward" value="${p.presetId}" ${state.chosen === p.presetId ? 'checked' : ''}>
      <span>${esc(p.label)}</span>${state.kind === 'char' ? `<span class="id">${p.rewards[0].id}</span>` : state.kind === 'song' ? `<span class="id">${songKind(p)}</span>` : state.kind === 'theme' ? `<span class="id">${themeKind(p)}</span>` : ''}</label>`).join('')
      : '<p class="muted" style="padding:12px;margin:0">No rewards match that search.</p>';
  }
  function describe() {
    const p = state.byId.get(state.chosen);
    const img = p && (window.PRESET_IMAGES || {})[p.presetId];
    $('#pic').hidden = !img;
    if (img) { const el = $('#picImg'); el.onload = () => $('#pic').classList.toggle('icon', el.naturalWidth / el.naturalHeight < 1.25); el.src = img; }
    $('#chosen').textContent = p ? p.label : 'Choose a reward';
    $('#chosenInfo').textContent = p ? isSong(p) ? `${songKind(p)} for the customization menu. Unlocks this song.` : (kindOf(p) === 'char' ? `Character ${p.rewards[0].id}. If you already own it, you get its duplicate conversion instead.` : (kindOf(p) === 'pack' || between(p, 2200, 2299)) ? `Contains ${contents(p)}. Arrives in the Gift Box.` : kindOf(p) === 'outfit' ? 'Home character outfit. Unlocks it for your home screen.' : kindOf(p) === 'bg' ? 'Home background. Unlocks it for your home screen.' : kindOf(p) === 'theme' ? `${themeKind(p)} for the customization menu. Unlocks it.` : 'Arrives in the Gift Box.') : '';
    $('#go').disabled = !(p && state.key);
  }
  $('#rewards').addEventListener('change', e => { state.chosen = +e.target.value; describe(); });
  $('#find').addEventListener('input', renderRewards);
  document.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => {
    state.kind = b.dataset.kind;
    document.querySelectorAll('[data-kind]').forEach(x => x.setAttribute('aria-pressed', x === b));
    renderRewards();
  }));

  const msg = (t, k) => { const m = $('#msg'); m.textContent = t; m.className = 'msg ' + (k || ''); };
  $('#never').addEventListener('change', e => { $('#expiry').disabled = e.target.checked; });
  $('#expiry').value = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  $('#expiry').min = today();

  // Public codes use random serials in the upper half of the range, so they never collide
  // with the Forge's own numbered codes (which count up from 1000).
  function randomSerial() {
    const a = new Uint32Array(1); crypto.getRandomValues(a);
    return 8388608 + (a[0] % 8388608);
  }

  async function copy(text, note) {
    try { await navigator.clipboard.writeText(text); note.textContent = 'Copied'; }
    catch { note.textContent = 'Select the code and copy it manually'; }
    setTimeout(() => { note.textContent = ''; }, 2500);
  }

  // ----- Codes you made (this browser only) -----
  const loadMine = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
  const saveMine = rows => { try { localStorage.setItem(STORE, JSON.stringify(rows.slice(0, 200))); } catch {} };
  function row(r) {
    return `<tr><td class="code">${esc(r.code)}</td><td class="reward">${esc(r.label)}</td><td>${esc(r.expiry || 'never')}</td><td><button class="btn" data-copy="${esc(r.code)}">Copy</button></td></tr>`;
  }
  function renderMine() {
    const rows = loadMine();
    $('#mineWrap').hidden = !rows.length;
    $('#mine').innerHTML = rows.map(row).join('');
  }
  $('#clear').addEventListener('click', () => { saveMine([]); renderMine(); });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const old = b.textContent;
    navigator.clipboard.writeText(b.dataset.copy).then(() => { b.textContent = 'Copied'; }, () => { b.textContent = 'Copy failed'; });
    setTimeout(() => { b.textContent = old; }, 1800);
  });

  $('#go').addEventListener('click', async () => {
    try {
      const p = state.byId.get(state.chosen);
      const count = Number($('#count').value);
      if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error('Make between 1 and 20 codes at a time.');
      let expiry = 'never', day = 0;
      if (!$('#never').checked) {
        expiry = $('#expiry').value;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) throw new Error('Choose an expiry date.');
        if (expiry < today()) throw new Error('That expiry date has already passed (UTC).');
        day = F.dateToDay(expiry);
        if (!(day > 0 && day < 65536)) throw new Error('That expiry date is outside the supported range.');
      }
      const used = new Set(), rows = [];
      while (rows.length < count) {
        const s = randomSerial(); if (used.has(s)) continue; used.add(s);
        rows.push({ code: await F.encode(state.key, p.presetId, day, s), label: p.label, expiry });
      }
      state.last = rows.map(r => r.code).join('\n');
      $('#out').textContent = state.last; $('#plate').hidden = false;
      saveMine(rows.concat(loadMine())); renderMine();
      msg(`Made ${count} code${count > 1 ? 's' : ''} for ${p.label}.`, 'good');
    } catch (e) { msg(e.message, 'bad'); }
  });
  $('#copy').addEventListener('click', () => copy(state.last, $('#copied')));

  // ----- Check a code -----
  const words = new Map((window.RELEASED_CODES || []).filter(r => r.kind === 'word').map(r => [r.code, r]));
  async function check() {
    const out = $('#vres'); out.hidden = false;
    const line = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
    const raw = $('#vcode').value.trim();
    const word = words.get(raw.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    if (word) { out.innerHTML = line('Status', '<span style="color:var(--ok)">Valid word code</span>') + line('Reward', esc(word.label)) + line('Expires', 'Never'); return; }
    try {
      const p = await F.verify(state.key, raw);
      const preset = state.byId.get(p.preset);
      const expired = p.expiry && F.dayToDate(p.expiry) < today();
      out.innerHTML = line('Status', p.valid ? '<span style="color:var(--ok)">Valid code</span>' : '<span style="color:var(--bad)">Not a valid code. Check for a typo.</span>') +
        (p.valid ? line('Reward', preset ? esc(preset.label) : 'A reward this page doesn\'t list yet') +
        line('Expires', p.expiry ? `${F.dayToDate(p.expiry)} (UTC)${expired ? ' <span style="color:var(--bad)">· expired</span>' : ''}` : 'Never') : '');
    } catch (e) { out.innerHTML = line('Problem', esc(e.message)); }
  }
  $('#vgo').addEventListener('click', check);
  $('#vcode').addEventListener('keydown', e => { if (e.key === 'Enter') check(); });

  // ----- Start -----
  $('#released').innerHTML = (window.RELEASED_CODES || []).map(row).join('');
  renderMine();
  Promise.all([F.importKey(window.FORGE_SECRET), fetch('presets.json').then(r => r.json())]).then(([key, d]) => {
    state.key = key; state.presets = d.presets; state.byId = new Map(d.presets.map(p => [p.presetId, p]));
    renderRewards(); describe();
  }).catch(() => msg('The generator didn\'t load. Refresh the page.', 'bad'));
})();
