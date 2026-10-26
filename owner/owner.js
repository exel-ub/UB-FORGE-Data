(() => {
  const F = window.ForgeCode;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const canDir = 'showDirectoryPicker' in window;

  const state = { key: null, dir: null, history: null, presets: [], byId: new Map(), kind: 'cubes', chosen: null, last: '' };

  // ---------- presets ----------
  const kindOf = p => { const r = p.rewards; return r.length === 1 && r[0].type === 5 ? 'char' : r.length === 1 && r[0].type === 3 ? 'cubes' : 'other'; };
  function setPresets(list) {
    state.presets = list; state.byId = new Map(list.map(p => [p.presetId, p]));
    renderRewards();
  }
  function renderRewards() {
    const term = $('#find').value.trim().toLowerCase();
    let rows = state.presets.filter(p => kindOf(p) === state.kind &&
      (!term || `${p.label} ${p.rewards[0].id} ${p.presetId}`.toLowerCase().includes(term)));
    rows.sort((a, b) => state.kind === 'cubes' ? a.rewards[0].amount - b.rewards[0].amount : a.label.localeCompare(b.label));
    $('#rewards').innerHTML = rows.length ? rows.map(p => `<label><input type="radio" name="reward" value="${p.presetId}" ${state.chosen === p.presetId ? 'checked' : ''}>
      <span>${esc(p.label)}</span><span class="id">${state.kind === 'char' ? p.rewards[0].id : 'Preset ' + p.presetId}</span></label>`).join('')
      : '<p class="muted" style="padding:12px;margin:0">No rewards match that search.</p>';
  }
  $('#rewards').addEventListener('change', e => { state.chosen = +e.target.value; describe(); });
  $('#find').addEventListener('input', renderRewards);
  document.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => {
    state.kind = b.dataset.kind;
    document.querySelectorAll('[data-kind]').forEach(x => x.setAttribute('aria-pressed', x === b));
    renderRewards();
  }));
  function describe() {
    const p = state.byId.get(state.chosen);
    $('#chosen').textContent = p ? p.label : 'Choose a reward';
    $('#chosenInfo').textContent = p ? `Preset ${p.presetId}${kindOf(p) === 'char' ? ` · Character ${p.rewards[0].id}` : ''}. Each code gives this once per save, in the Gift Box.` : 'Each code gives its reward once per save, in the Gift Box.';
    ready();
  }

  // ---------- status ----------
  function ready() {
    const ok = state.key && state.history && state.chosen;
    $('#go').disabled = !ok;
    $('#kDot').classList.toggle('off', !state.key);
    $('#kText').textContent = state.key ? 'Key loaded' : 'Key not loaded';
    $('#hDot').classList.toggle('off', !state.history);
    $('#hText').textContent = state.history ? `History: ${state.history.length} code${state.history.length === 1 ? '' : 's'}` : 'History not loaded';
    $('#mode').textContent = state.dir ? `Saving to folder “${state.dir.name}”` : state.history ? 'Download the updated history after generating' : '';
    $('#forget').hidden = !state.key;
    if (!state.key || !state.history) msg(state.key ? 'Load your history file before generating, so serials never repeat.' : '', '');
  }
  function msg(text, kind) { const m = $('#msg'); m.textContent = text; m.className = 'msg ' + (kind || ''); }

  // ---------- reading files ----------
  async function readJSON(file) { return JSON.parse(await file.text()); }
  function checkHistory(d) {
    if (!d || d.schema !== 1 || !Array.isArray(d.issued)) throw new Error('This history file can\'t be read. Restore its backup before generating codes.');
    return d.issued;
  }
  async function loadKey(obj) {
    state.key = await F.importKey(obj && obj.secretHex);
  }

  async function useDir(dir) {
    const fh = async name => { try { return await dir.getFileHandle(name); } catch { return null; } };
    const kf = await fh('signing-key.json');
    if (!kf) throw new Error('signing-key.json isn\'t in that folder. Open the Code Generator folder itself.');
    await loadKey(await readJSON(await kf.getFile()));
    const pf = await fh('presets.json');
    if (pf) { try { setPresets((await readJSON(await pf.getFile())).presets); } catch { /* keep bundled */ } }
    const hf = await fh('issued-codes.json');
    state.history = hf ? checkHistory(await readJSON(await hf.getFile())) : [];
    state.dir = dir;
    $('#alt').hidden = true;
    $('#dirNote').textContent = '';
    renderHistory(); ready();
    msg('Folder opened. Choose a reward and generate.', 'good');
  }

  // Remember the folder (a pointer only, never the key) so it can be reopened with one click.
  const db = () => new Promise((res, rej) => { const r = indexedDB.open('forge-owner', 1); r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function saveHandle(h) { try { const d = await db(); d.transaction('h', 'readwrite').objectStore('h').put(h, 'dir'); } catch {} }
  async function getHandle() { try { const d = await db(); return await new Promise(res => { const q = d.transaction('h').objectStore('h').get('dir'); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); } catch { return null; } }

  $('#openDir').addEventListener('click', async () => {
    try {
      const dir = await window.showDirectoryPicker({ id: 'forge-codegen', mode: 'readwrite' });
      await useDir(dir); saveHandle(dir);
    } catch (e) { if (e.name !== 'AbortError') msg(e.message, 'bad'); }
  });
  $('#reopen').addEventListener('click', async () => {
    const h = await getHandle(); if (!h) return;
    try {
      if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('Permission to the folder wasn\'t given.');
      await useDir(h);
    } catch (e) { msg(e.message, 'bad'); }
  });

  if (!canDir) {
    $('#openDir').hidden = true;
    $('#connect h2').textContent = 'Load your key and history';
    $('#altIntro').innerHTML = 'Choose the two files from your Code Generator folder. After generating, download the updated history and replace <b>issued-codes.json</b> in that folder.';
  } else {
    getHandle().then(h => { if (h) { $('#reopen').hidden = false; $('#dirNote').textContent = `Last used: ${h.name}`; } });
  }

  $('#keyFile').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { await loadKey(await readJSON(f)); msg('Key loaded.', 'good'); } catch (err) { state.key = null; msg(err.message || 'That isn\'t a key file.', 'bad'); }
    e.target.value = ''; ready();
  });
  $('#histFile').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { state.history = checkHistory(await readJSON(f)); $('#noHist').checked = false; msg('History loaded.', 'good'); } catch (err) { state.history = null; msg(err.message, 'bad'); }
    renderHistory(); ready();
  });
  $('#noHist').addEventListener('change', e => {
    if (e.target.checked) state.history = []; else if (!$('#histFile').files.length) state.history = null;
    renderHistory(); ready();
  });

  $('#forget').addEventListener('click', () => {
    state.key = null; state.dir = null; state.history = null;
    $('#alt').hidden = false; $('#plate').hidden = true; $('#vres').hidden = true;
    renderHistory(); ready(); msg('Key forgotten. Open your folder again to keep going.', '');
  });

  // ---------- issuing ----------
  $('#never').addEventListener('change', e => { $('#expiry').disabled = e.target.checked; });
  const today = () => new Date().toISOString().slice(0, 10);
  const plus30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  $('#expiry').value = plus30; $('#expiry').min = today();

  async function writeHistory(rows) {
    const text = JSON.stringify({ schema: 1, issued: rows }, null, 2) + '\n';
    if (state.dir) {
      const h = await state.dir.getFileHandle('issued-codes.json', { create: true });
      const w = await h.createWritable();
      await w.write(text); await w.close();
    }
    return text;
  }

  $('#go').addEventListener('click', async () => {
    const go = $('#go'); go.disabled = true;
    try {
      const p = state.byId.get(state.chosen);
      const count = Number($('#count').value);
      if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('Generate between 1 and 100 codes at a time.');
      let expiry = 'never', day = 0;
      if (!$('#never').checked) {
        expiry = $('#expiry').value;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) throw new Error('Choose an expiry date.');
        if (expiry < today()) throw new Error('That expiry date has already passed (UTC).');
        day = F.dateToDay(expiry);
        if (!(day > 0 && day < 65536)) throw new Error('That expiry date is outside the supported range.');
      }
      // Re-read the folder's history right before issuing, in case the desktop tool added codes.
      if (state.dir) {
        const h = await state.dir.getFileHandle('issued-codes.json').catch(() => null);
        state.history = h ? checkHistory(JSON.parse(await (await h.getFile()).text())) : [];
      }
      const used = state.history.filter(r => +r.presetId === p.presetId).map(r => +r.serial);
      const first = Math.max(999, ...used) + 1;
      if (first + count > 16777216) throw new Error('No unused serials remain for this reward.');
      const now = new Date().toISOString().replace('Z', '+00:00');
      const rows = [];
      for (let s = first; s < first + count; s++)
        rows.push({ presetId: p.presetId, serial: s, label: p.label, expiry, issuedAt: now, code: await F.encode(state.key, p.presetId, day, s) });
      const all = state.history.concat(rows);
      const text = await writeHistory(all); // saved before codes are shown, like the desktop tool
      state.history = all;
      state.last = rows.map(r => r.code).join('\n');
      $('#codes').textContent = state.last;
      $('#plate').hidden = false; $('#copied').textContent = '';
      const dl = $('#dl');
      if (!state.dir) {
        dl.hidden = false;
        dl.onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = 'issued-codes.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
        msg(`Made ${rows.length} code${rows.length > 1 ? 's' : ''} for ${p.label}. Download the updated history and replace issued-codes.json in your folder before generating again on the desktop.`, 'good');
      } else {
        dl.hidden = true;
        msg(`Saved ${rows.length} code${rows.length > 1 ? 's' : ''} for ${p.label} to your folder's history. Expiry: ${expiry}.`, 'good');
      }
      renderHistory();
    } catch (e) { msg(e.message, 'bad'); }
    ready();
  });

  async function copy(text, note) {
    try { await navigator.clipboard.writeText(text); note.textContent = 'Copied'; }
    catch { note.textContent = 'Select the codes and copy them manually'; }
  }
  $('#copy').addEventListener('click', () => copy(state.last, $('#copied')));

  // ---------- checking ----------
  async function check() {
    const out = $('#vres'); out.hidden = false;
    const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
    try {
      const raw = $('#vcode').value;
      const p = F.parse(raw);
      const preset = state.byId.get(p.preset);
      let sig = '<span class="muted">Load your key to confirm it\'s genuine</span>';
      if (state.key) sig = (await F.verify(state.key, raw)).valid ? '<span style="color:var(--ok)">Genuine</span>' : '<span style="color:var(--bad)">Not genuine: this code wasn\'t made with your key</span>';
      const expired = p.expiry && F.dayToDate(p.expiry) < today();
      const issued = state.history && state.history.find(r => +r.presetId === p.preset && +r.serial === p.serial);
      out.innerHTML = row('Signature', sig) + row('Reward', preset ? esc(preset.label) : `Unknown preset ${p.preset}`) +
        row('Expires', p.expiry ? `${F.dayToDate(p.expiry)} (UTC)${expired ? ' <span style="color:var(--bad)">· expired</span>' : ''}` : 'Never') +
        row('Serial', p.serial) + (state.history ? row('In your history', issued ? `Yes, issued ${esc(issued.issuedAt.slice(0, 10))}` : 'No') : '');
    } catch (e) { out.innerHTML = row('Problem', esc(e.message)); }
  }
  $('#vgo').addEventListener('click', check);
  $('#vcode').addEventListener('keydown', e => { if (e.key === 'Enter') check(); });

  // ---------- history ----------
  function renderHistory() {
    const body = $('#hbody');
    if (!state.history) { body.innerHTML = '<tr><td colspan="5" class="muted">Open your folder to see codes you\'ve issued.</td></tr>'; $('#hcount').textContent = ''; return; }
    const term = $('#hfind').value.trim().toLowerCase();
    const rows = state.history.slice().reverse().filter(r => {
      const label = r.label || (state.byId.get(+r.presetId) || {}).label || 'Unknown reward';
      return !term || `${label} ${r.code}`.toLowerCase().includes(term);
    });
    $('#hcount').textContent = `${rows.length} of ${state.history.length}`;
    body.innerHTML = rows.length ? rows.map(r => `<tr><td><input type="checkbox" value="${esc(r.code)}" aria-label="Select ${esc(r.code)}"></td>
      <td class="reward">${esc(r.label || (state.byId.get(+r.presetId) || {}).label || 'Unknown reward')}</td><td class="code">${esc(r.code)}</td>
      <td>${esc(r.expiry)}</td><td>${esc((r.issuedAt || '').slice(0, 16).replace('T', ' '))}</td></tr>`).join('')
      : `<tr><td colspan="5" class="muted">${state.history.length ? 'No codes match that search.' : 'No codes issued yet.'}</td></tr>`;
    $('#hall').checked = false; $('#hcopy').disabled = true;
  }
  $('#hfind').addEventListener('input', renderHistory);
  $('#hbody').addEventListener('change', () => { $('#hcopy').disabled = !$('#hbody input:checked'); });
  $('#hall').addEventListener('change', e => { document.querySelectorAll('#hbody input').forEach(c => c.checked = e.target.checked); $('#hcopy').disabled = !e.target.checked; });
  $('#hcopy').addEventListener('click', () => copy([...document.querySelectorAll('#hbody input:checked')].map(c => c.value).join('\n'), $('#hcount')));

  // ---------- start ----------
  fetch('presets.json').then(r => r.json()).then(d => {
    setPresets(d.presets);
    const two = d.presets.find(p => p.presetId === 2); if (two) { state.chosen = 2; renderRewards(); describe(); }
  }).catch(() => msg('The reward list didn\'t load. Refresh the page.', 'bad'));
  ready();
})();
