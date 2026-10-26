// Forge gift-code format, identical to forge_codegen.py:
// payload = presetId(12 bits) · expiryDay(16 bits, days since 2026-01-01 UTC, 0 = never) · serial(24 bits)
// code    = FRG- + Crockford base32 of (payload << 48 | first 48 bits of HMAC-SHA256(secret, payload as 7 bytes))
(function (root) {
  const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const EPOCH = Date.UTC(2026, 0, 1);
  const subtle = (root.crypto || globalThis.crypto).subtle;

  async function importKey(secretHex) {
    if (!/^[0-9a-fA-F]{64}$/.test(secretHex || '')) throw new Error('This key file is not valid. It should hold a 64-character secretHex.');
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) bytes[i] = parseInt(secretHex.substr(i * 2, 2), 16);
    const key = await subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    bytes.fill(0);
    return key;
  }

  function payloadBytes(payload) {
    const b = new Uint8Array(7);
    for (let i = 6; i >= 0; i--) { b[i] = Number(payload & 0xffn); payload >>= 8n; }
    return b;
  }

  async function mac48(key, payload) {
    const sig = new Uint8Array(await subtle.sign('HMAC', key, payloadBytes(payload)));
    let m = 0n;
    for (let i = 0; i < 6; i++) m = (m << 8n) | BigInt(sig[i]);
    return m;
  }

  async function encode(key, preset, expiry, serial) {
    if (!(preset > 0 && preset < 4096 && expiry >= 0 && expiry < 65536 && serial >= 0 && serial < 16777216)) throw new Error('Preset, expiry or serial is outside its range.');
    const payload = (BigInt(preset) << 40n) | (BigInt(expiry) << 24n) | BigInt(serial);
    const value = (payload << 48n) | await mac48(key, payload);
    let text = '';
    for (let shift = 95n; shift >= 0n; shift -= 5n) text += ALPHABET[Number((value >> shift) & 31n)];
    return 'FRG-' + [0, 5, 10, 15].map(i => text.slice(i, i + 5)).join('-');
  }

  function parse(code) {
    let s = String(code || '').toUpperCase().replace(/[\s-]/g, '');
    if (s.startsWith('FRG')) s = s.slice(3);
    s = s.replace(/O/g, '0').replace(/[IL]/g, '1');
    if (s.length !== 20) throw new Error('A code has 20 characters after FRG-.');
    let value = 0n;
    for (const ch of s) {
      const v = ALPHABET.indexOf(ch);
      if (v < 0) throw new Error(`“${ch}” can't appear in a code.`);
      value = (value << 5n) | BigInt(v);
    }
    const payload = value >> 48n, mac = value & ((1n << 48n) - 1n);
    return { payload, mac, preset: Number(payload >> 40n), expiry: Number((payload >> 24n) & 0xffffn), serial: Number(payload & 0xffffffn) };
  }

  async function verify(key, code) {
    const p = parse(code);
    p.valid = (await mac48(key, p.payload)) === p.mac;
    return p;
  }

  const dayToDate = d => new Date(EPOCH + d * 86400000).toISOString().slice(0, 10);
  const dateToDay = iso => Math.round((Date.parse(iso + 'T00:00:00Z') - EPOCH) / 86400000);

  const api = { importKey, encode, parse, verify, dayToDate, dateToDay };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ForgeCode = api;
})(typeof window !== 'undefined' ? window : globalThis);
