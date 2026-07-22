'use strict';
const axios = require('axios').default;
const CryptoJS = require('crypto-js');

const H_GET  = { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://allmanga.to' };
const H_POST = { ...H_GET, 'Content-Type': 'application/json' };
const HASH   = 'd405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec';
const KEY    = CryptoJS.SHA256('Xot36i3lK3:v1').toString(CryptoJS.enc.Hex);
const BASE   = 'allanime.day';

const HEX_MAP = {
  '79':'A','7a':'B','7b':'C','7c':'D','7d':'E','7e':'F','7f':'G','70':'H','71':'I','72':'J','73':'K','74':'L','75':'M','76':'N','77':'O',
  '68':'P','69':'Q','6a':'R','6b':'S','6c':'T','6d':'U','6e':'V','6f':'W','60':'X','61':'Y','62':'Z',
  '59':'a','5a':'b','5b':'c','5c':'d','5d':'e','5e':'f','5f':'g','50':'h','51':'i','52':'j','53':'k','54':'l','55':'m','56':'n','57':'o',
  '48':'p','49':'q','4a':'r','4b':'s','4c':'t','4d':'u','4e':'v','4f':'w','40':'x','41':'y','42':'z',
  '08':'0','09':'1','0a':'2','0b':'3','0c':'4','0d':'5','0e':'6','0f':'7','00':'8','01':'9',
  '15':'-','16':'.','67':'_','46':'~','02':':','17':'/','07':'?','1b':'#','63':'[','65':']','78':'@',
  '19':'!','1c':'$','1e':'&','10':'(','11':')','12':'*','13':'+','14':',','03':';','05':'=','1d':'%',
};
function decodeUrl(enc) {
  if (!enc || enc.length < 10 || enc.length % 2 !== 0) return null;
  let out = '', bad = false;
  for (let i = 0; i < enc.length; i += 2) {
    const h = enc.substr(i, 2).toLowerCase();
    HEX_MAP[h] ? (out += HEX_MAP[h]) : (bad = true, out += '[' + h + ']');
  }
  if (out.includes('/clock')) out = out.replace('/clock', '/clock.json');
  if (bad || !out.includes('/') || out.endsWith('//')) return null;
  return out;
}

function wa2b(wa) { const b = []; for (let i = 0; i < wa.sigBytes; i++) b.push((wa.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff); return b; }
function b2wa(b) { const w = []; for (let i = 0; i < b.length; i++) w[i >>> 2] = (w[i >>> 2] || 0) | ((b[i] & 0xff) << (24 - (i % 4) * 8)); return CryptoJS.lib.WordArray.create(w, b.length); }
function incCtr(cb) { for (let i = cb.length - 1; i >= 0; i--) { cb[i] = (cb[i] + 1) & 0xff; if (cb[i] !== 0) break; } }
function decrypt(blob) {
  try {
    const norm = blob.replace(/-/g, '+').replace(/_/g, '/');
    const padded = norm + '='.repeat((4 - (norm.length % 4)) % 4);
    const hex = CryptoJS.enc.Base64.parse(padded).toString(CryptoJS.enc.Hex);
    if (hex.length < 58) return null;
    const iv = hex.slice(2, 26), cipher = hex.slice(26, hex.length - 32);
    const key = CryptoJS.enc.Hex.parse(KEY), ctr = wa2b(CryptoJS.enc.Hex.parse(iv + '00000002'));
    const cb = wa2b(CryptoJS.enc.Hex.parse(cipher)), pb = [];
    for (let off = 0; off < cb.length; off += 16) {
      const block = cb.slice(off, off + 16);
      const ks = wa2b(CryptoJS.AES.encrypt(b2wa(ctr), key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }).ciphertext);
      pb.push(...block.map((x, i) => x ^ ks[i])); incCtr(ctr);
    }
    const wa = b2wa(pb);
    try { const s = CryptoJS.enc.Utf8.stringify(wa); if (s) return JSON.parse(s); } catch {}
    return null;
  } catch { return null; }
}

async function getSources(showId, ep) {
  const r = await axios.get('https://api.allanime.day/api', {
    headers: H_GET, timeout: 10000,
    params: {
      variables: JSON.stringify({ showId, translationType: 'sub', episodeString: String(ep) }),
      extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: HASH } }),
    }
  });
  const findBlob = o => {
    if (!o || typeof o !== 'object') return null;
    if (typeof o.tobeparsed === 'string' && o.tobeparsed.length > 0) return o.tobeparsed;
    for (const v of Object.values(o)) { const f = findBlob(v); if (f) return f; }
    return null;
  };
  const blob = findBlob(r.data?.data);
  if (!blob) return [];
  const dec = decrypt(blob);
  return Array.isArray(dec) ? dec : (dec?.sourceUrls || dec?.episode?.sourceUrls || []);
}

async function probeUrl(url) {
  try {
    const res = await axios.get(url, { headers: H_GET, timeout: 7000, validateStatus: () => true });
    const ct = res.headers['content-type'] || '';
    if (res.status !== 200) return 'HTTP ' + res.status;

    if (ct.includes('json') || typeof res.data === 'object') {
      const vids = res.data?.links?.[0]?.rawUrls?.vids || [];
      if (vids.length) {
        const cdn = vids[0].url.includes('akamaized') ? 'Bilibili-CDN' : vids[0].url.includes('bstar') ? 'bstar' : 'CDN';
        const qualities = [...new Set(vids.map(v => v.height + 'p'))].join('/');
        // Verificar si la primera URL es accesible
        const head = await axios.head(vids[0].url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000, validateStatus: () => true });
        return 'clock.json → ' + vids.length + ' vids [' + qualities + '] (' + cdn + ') HEAD=' + head.status;
      }
      const link = res.data?.links?.[0]?.link || '';
      return 'clock.json → link:' + link.substring(0, 50);
    }

    if (ct.includes('html') || typeof res.data === 'string') {
      const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      // ok.ru
      if (url.includes('ok.ru')) {
        const match = html.match(/data-options="([^"]+)"/);
        if (match) {
          const meta = JSON.parse(JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')).flashvars.metadata);
          const names = (meta.videos || []).map(v => v.name).join('/');
          const hls = meta.hlsManifestUrl ? '+HLS' : '';
          return 'ok.ru → ' + (meta.videos || []).length + ' calidades [' + names + hls + ']';
        }
      }
      // YouTube
      if (url.includes('youtube') || url.includes('youtu.be') || url.includes('fast4speed')) {
        return 'YouTube embed → URL directa';
      }
      return 'HTML iframe (' + html.length + ' bytes, sin extractor)';
    }

    return 'HTTP 200 ' + ct;
  } catch (e) {
    return 'ERROR: ' + e.message.substring(0, 40);
  }
}

async function probeShow(showId, name, ep) {
  console.log('\n' + name + ' [ep' + ep + ']:');
  const sources = await getSources(showId, ep);
  if (!sources.length) { console.log('  sin providers'); return; }

  const sorted = sources.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  for (const s of sorted) {
    const raw = s.sourceUrl || '';
    const isEnc = raw.startsWith('--');
    const isDirect = raw.startsWith('http');
    const resolved = isEnc ? decodeUrl(raw.slice(2)) : (isDirect ? raw : null);
    const fullUrl = resolved ? (resolved.startsWith('http') ? resolved : 'https://' + BASE + resolved) : null;
    const verdict = fullUrl ? await probeUrl(fullUrl) : 'sin URL';
    console.log('  ' + s.sourceName.padEnd(12) + ' p:' + String(s.priority || 0).padEnd(5) + ' → ' + verdict);
    await new Promise(r => setTimeout(r, 200));
  }
}

const cases = [
  { id: 'srGrP23qJnjsHrRYD', name: 'Slime S4', ep: '6' },
  { id: '2P7kFgthrEfRRkcdm', name: 'Witch Hat Atelier', ep: '1' },
  { id: 'gqjrmq3sP9jbfAf7s', name: 'Naruto (road of)', ep: '1' },
];

// Buscar One Piece real
async function main() {
  const r = await axios.post('https://api.allanime.day/api', {
    variables: { search: { query: 'one piece', isManga: false }, limit: 3, page: 1, translationType: 'sub', countryOrigin: 'JP' },
    query: 'query($search:SearchInput,$limit:Int,$page:Int,$translationType:VaildTranslationTypeEnumType,$countryOrigin:VaildCountryOriginEnumType){shows(search:$search,limit:$limit,page:$page,translationType:$translationType,countryOrigin:$countryOrigin){edges{_id name}}}'
  }, { headers: H_POST });
  const op = r.data?.data?.shows?.edges?.[0];
  if (op) cases.push({ id: op._id, name: op.name, ep: '1' });

  const r2 = await axios.post('https://api.allanime.day/api', {
    variables: { search: { query: 'dragon ball daima', isManga: false }, limit: 2, page: 1, translationType: 'sub', countryOrigin: 'JP' },
    query: 'query($search:SearchInput,$limit:Int,$page:Int,$translationType:VaildTranslationTypeEnumType,$countryOrigin:VaildCountryOriginEnumType){shows(search:$search,limit:$limit,page:$page,translationType:$translationType,countryOrigin:$countryOrigin){edges{_id name}}}'
  }, { headers: H_POST });
  const db = r2.data?.data?.shows?.edges?.[0];
  if (db) cases.push({ id: db._id, name: db.name, ep: '1' });

  for (const c of cases) {
    await probeShow(c.id, c.name, c.ep);
  }
}

main().catch(e => console.error(e.message));
