#!/usr/bin/env node
/**
 * scripts/diagnose-api.js
 * Diagnóstico profundo de la integración con AllAnime.
 *
 * Uso:
 *   node scripts/diagnose-api.js
 *   node scripts/diagnose-api.js --showId <id> --episode <n>
 *   node scripts/diagnose-api.js --fix
 */
'use strict';

const CryptoJS = require('crypto-js');
const { gcm } = require('@noble/ciphers/aes.js');
const axios = require('axios').default;
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APICONFIG_PATH = path.join(ROOT, 'src/utils/apiConfig.js');

const DEFAULT_SHOW_ID = 'srGrP23qJnjsHrRYD'; // Tensei Slime S4
const DEFAULT_EPISODE = '6';
const API_BASE = 'https://api.allanime.day';
const ALLANIME_BASE = 'allanime.day';
const REFERER = 'https://allmanga.to';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

const HEADERS_GET = {
  'User-Agent': USER_AGENT, 'Referer': REFERER, 'Origin': REFERER,
  'Accept': 'application/json, text/plain, */*', 'Accept-Language': 'en-US,en;q=0.9',
};
const HEADERS_POST = { ...HEADERS_GET, 'Content-Type': 'application/json' };

const args = process.argv.slice(2);
const getArg = (n) => { const i = args.indexOf(`--${n}`); return i !== -1 ? args[i + 1] : null; };
const SHOW_ID = getArg('showId') || DEFAULT_SHOW_ID;
const EPISODE = getArg('episode') || DEFAULT_EPISODE;
const AUTO_FIX = args.includes('--fix');

// ─── Crypto (igual que AnimeService.js) ────────────────────────────────────
// AllAnime rota su clave repetidamente y sin aviso — se prueban todas las
// conocidas en cascada. Ver PR #1792 de pystardust/ani-cli para la más
// reciente si esto vuelve a fallar.
const ALLANIME_KEY_HEX_LATEST = 'e661283abaef7a6cecd6d74efc385a4f455e838d439af13f2754d51dab9f21e0';
const ALLANIME_KEY_HEX_PREV = 'cf4777b5778aeadc9449e12769ea545d00c43cd8ff65d482364586cde204f359';
const ALLANIME_KEY_HEX_ORIGINAL = CryptoJS.SHA256('Xot36i3lK3:v1').toString(CryptoJS.enc.Hex);
const ALLANIME_KEY_CANDIDATES = [ALLANIME_KEY_HEX_LATEST, ALLANIME_KEY_HEX_PREV, ALLANIME_KEY_HEX_ORIGINAL];
const ALLANIME_KEY_HEX = ALLANIME_KEY_HEX_LATEST; // usado solo para el token aaReq saliente
const AAREQ_EPOCH = 6884;
const AAREQ_BUILD_ID = '51';
const EPISODE_REFERER = 'https://youtu-chan.com';

function wa2b(wa) {
  const b = [];
  for (let i = 0; i < wa.sigBytes; i++) b.push((wa.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
  return b;
}
function b2wa(b) {
  const w = [];
  for (let i = 0; i < b.length; i++) w[i >>> 2] = (w[i >>> 2] || 0) | ((b[i] & 0xff) << (24 - (i % 4) * 8));
  return CryptoJS.lib.WordArray.create(w, b.length);
}
function buildAaReqToken(queryHash) {
  const ts = Math.floor(Date.now() / 300000) * 300000;
  const payload = JSON.stringify({ v: 1, ts, epoch: AAREQ_EPOCH, buildId: AAREQ_BUILD_ID, qh: queryHash });
  const ivBytes = wa2b(CryptoJS.SHA256(`${AAREQ_EPOCH}:${AAREQ_BUILD_ID}:${queryHash}:${ts}`)).slice(0, 12);
  const keyBytes = wa2b(CryptoJS.enc.Hex.parse(ALLANIME_KEY_HEX));
  const payloadBytes = wa2b(CryptoJS.enc.Utf8.parse(payload));
  const cipher = gcm(new Uint8Array(keyBytes), new Uint8Array(ivBytes));
  const ciphertextWithTag = cipher.encrypt(new Uint8Array(payloadBytes));
  const tokenBytes = new Uint8Array(1 + ivBytes.length + ciphertextWithTag.length);
  tokenBytes[0] = 1;
  tokenBytes.set(ivBytes, 1);
  tokenBytes.set(ciphertextWithTag, 1 + ivBytes.length);
  return b2wa(Array.from(tokenBytes)).toString(CryptoJS.enc.Base64);
}

function incCtr(cb) {
  for (let i = cb.length - 1; i >= 0; i--) { cb[i] = (cb[i] + 1) & 0xff; if (cb[i] !== 0) break; }
}
function decryptCtr(cipherHex, keyHex, counterHex) {
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const ctr = wa2b(CryptoJS.enc.Hex.parse(counterHex));
  const cb = wa2b(CryptoJS.enc.Hex.parse(cipherHex));
  const pb = [];
  for (let off = 0; off < cb.length; off += 16) {
    const block = cb.slice(off, off + 16);
    const ks = wa2b(CryptoJS.AES.encrypt(b2wa(ctr), key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }).ciphertext);
    pb.push(...block.map((x, i) => x ^ ks[i]));
    incCtr(ctr);
  }
  const wa = b2wa(pb);
  try { const s = CryptoJS.enc.Utf8.stringify(wa); if (s) return s; } catch {}
  return CryptoJS.enc.Latin1.stringify(wa);
}

function decryptTobeparsed(blob) {
  try {
    const norm = blob.replace(/-/g, '+').replace(/_/g, '/').trim();
    const padded = norm + '='.repeat((4 - (norm.length % 4)) % 4);
    const hex = CryptoJS.enc.Base64.parse(padded).toString(CryptoJS.enc.Hex);
    if (hex.length < 58) return null;
    const iv = hex.slice(2, 26);
    const cipher = hex.slice(26, hex.length - 32);
    if (!cipher.length || cipher.length % 2 !== 0) return null;

    // AllAnime alterna sin aviso entre la clave nueva y la vieja — probar ambas.
    for (const keyHex of ALLANIME_KEY_CANDIDATES) {
      const plain = decryptCtr(cipher, keyHex, `${iv}00000002`).replace(/\0+$/g, '');
      if (!plain) continue;
      try {
        const parsed = JSON.parse(plain);
        return parsed;
      } catch {
        // no era JSON con esta clave — probar la siguiente
      }
    }
    return null;
  } catch { return null; }
}

// ─── URL Decoder (igual que urlDecoder.js) ─────────────────────────────────
const HEX_MAP = {
  '79':'A','7a':'B','7b':'C','7c':'D','7d':'E','7e':'F','7f':'G','70':'H','71':'I','72':'J','73':'K','74':'L','75':'M','76':'N','77':'O',
  '68':'P','69':'Q','6a':'R','6b':'S','6c':'T','6d':'U','6e':'V','6f':'W','60':'X','61':'Y','62':'Z',
  '59':'a','5a':'b','5b':'c','5c':'d','5d':'e','5e':'f','5f':'g','50':'h','51':'i','52':'j','53':'k','54':'l','55':'m','56':'n','57':'o',
  '48':'p','49':'q','4a':'r','4b':'s','4c':'t','4d':'u','4e':'v','4f':'w','40':'x','41':'y','42':'z',
  '08':'0','09':'1','0a':'2','0b':'3','0c':'4','0d':'5','0e':'6','0f':'7','00':'8','01':'9',
  '15':'-','16':'.','67':'_','46':'~','02':':','17':'/','07':'?','1b':'#','63':'[','65':']','78':'@',
  '19':'!','1c':'$','1e':'&','10':'(','11':')','12':'*','13':'+','14':',','03':';','05':'=','1d':'%',
};
function decodeUrl(encoded) {
  if (!encoded || encoded.length < 10 || encoded.length % 2 !== 0) return null;
  let out = '', unmapped = false;
  for (let i = 0; i < encoded.length; i += 2) {
    const h = encoded.substr(i, 2).toLowerCase();
    HEX_MAP[h] ? (out += HEX_MAP[h]) : (unmapped = true, out += `[${h}]`);
  }
  if (out.includes('/clock')) out = out.replace('/clock', '/clock.json');
  if (unmapped || !out.includes('/') || out.endsWith('//')) return null;
  return out;
}

// ─── Provider mapping ───────────────────────────────────────────────────────
function readProviderMapping() {
  const content = fs.readFileSync(APICONFIG_PATH, 'utf8');
  const match = content.match(/export const PROVIDER_MAPPING\s*=\s*\{([\s\S]*?)\};/);
  if (!match) return {};
  const mapping = {};
  const re = /(?:["']([^"'\n]+)["']|([\w-]+))\s*:\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(match[1])) !== null) mapping[m[1] || m[2]] = m[3];
  return mapping;
}

function addProvidersToMapping(newProviders) {
  let content = fs.readFileSync(APICONFIG_PATH, 'utf8');
  const additions = newProviders.map(p => `  "${p.name}": "${p.suggestedType}",`).join('\n');
  const updated = content.replace(
    /(export const PROVIDER_MAPPING\s*=\s*\{[\s\S]*?)(\};)/,
    `$1${additions}\n$2`
  );
  fs.writeFileSync(APICONFIG_PATH, updated);
}

function suggestType(name, url) {
  if (!url) return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const u = url.toLowerCase(), n = name.toLowerCase();
  if (u.includes('tools.fast4speed') || n.includes('yt')) return 'youtube';
  if (u.includes('ok.ru')) return 'okru';
  if (u.includes('mp4upload')) return 'mp4upload';
  if (u.includes('streamwish') || n.includes('sw')) return 'streamwish';
  if (u.includes('filemoon') || u.includes('bysekoze') || n.includes('hls')) return 'fembed';
  if ((u.includes('allanime') || u.includes('clock.json')) && !u.includes('http')) return 'hls';
  if (u.includes('wixmp') || n === 'default') return 'wixmp';
  if (u.includes('sharepoint')) return 'sharepoint';
  if (n.includes('luf') || n.includes('hianime')) return 'hianime';
  return n.replace(/[^a-z0-9]/g, '');
}

function extractSourceUrls(data) {
  const payload = data?.data;
  if (!payload) return { format: 'sin_data', sources: [] };
  if (Array.isArray(payload?.episode?.sourceUrls))
    return { format: 'direct_episode_sourceUrls', sources: payload.episode.sourceUrls };
  if (Array.isArray(payload?.sourceUrls))
    return { format: 'direct_sourceUrls', sources: payload.sourceUrls };

  const findBlob = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    if (typeof obj.tobeparsed === 'string' && obj.tobeparsed.length > 0) return obj.tobeparsed;
    for (const v of Object.values(obj)) { const f = findBlob(v); if (f) return f; }
    return null;
  };

  const blob = findBlob(payload);
  if (!blob) return { format: 'desconocido', sources: [] };

  const dec = decryptTobeparsed(blob);
  if (!dec) return { format: 'tobeparsed_decrypt_failed', decryptOk: false, sources: [] };

  let sources = [];
  if (Array.isArray(dec)) sources = dec;
  else if (Array.isArray(dec?.sourceUrls)) sources = dec.sourceUrls;
  else if (Array.isArray(dec?.episode?.sourceUrls)) sources = dec.episode.sourceUrls;
  return { format: 'tobeparsed', decryptOk: true, sources };
}

// ─── Utilidades de red ──────────────────────────────────────────────────────
async function httpGet(url, opts = {}) {
  const res = await axios.get(url, {
    headers: HEADERS_GET, timeout: 10000, validateStatus: () => true, ...opts
  });
  return res;
}

async function httpHead(url, timeoutMs = 6000) {
  try {
    const res = await axios.head(url, {
      headers: HEADERS_GET, timeout: timeoutMs, validateStatus: () => true,
      maxRedirects: 5,
    });
    return { ok: res.status >= 200 && res.status < 400, status: res.status, contentType: res.headers['content-type'] || '' };
  } catch (e) {
    return { ok: false, status: null, error: e.message };
  }
}

// Extrae URLs de video de HTML de iframes (patrones comunes)
function extractVideoUrlsFromHtml(html) {
  const urls = new Set();

  // Patrones que garantizan extensión de video o path de stream
  const videoPatterns = [
    /["'](https?:\/\/[^"']*\.m3u8[^"']{0,100}?)["']/g,
    /["'](https?:\/\/[^"']*\.mp4[^"']{0,100}?)["']/g,
    /file\s*:\s*["'](https?:\/\/[^"'.][^"']*\.(?:mp4|m3u8)[^"']*)["']/g,
    // ok.ru: URLs en JSON embebido (flv_url, hls, etc.)
    /(?:flv_url|hls|url)["']?\s*:\s*["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/g,
    // mp4upload: src del player
    /player\.src\(\[?\{[^}]*src\s*:\s*["'](https?:\/\/[^"']+)["']/g,
  ];

  for (const pat of videoPatterns) {
    let m;
    pat.lastIndex = 0;
    while ((m = pat.exec(html)) !== null) {
      const u = m[1];
      // Descartar CSS, JS, imágenes, fuentes
      if (!u || u.length < 15 || u.includes(' ')) continue;
      if (/\.(css|js|woff|ttf|png|jpg|svg|ico)(\?|$)/.test(u)) continue;
      urls.add(u);
    }
  }

  // ok.ru: los streams están URL-encoded en data-options o en JSON
  const okMatch = html.match(/data-options="([^"]+)"/);
  if (okMatch) {
    try {
      const decoded = okMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"');
      const obj = JSON.parse(decoded);
      const flashvars = obj?.flashvars?.metadata;
      if (flashvars) {
        const meta = JSON.parse(flashvars);
        (meta?.videos || []).forEach(v => { if (v.url) urls.add(v.url); });
      }
    } catch {}
  }

  return [...urls];
}

// Extrae rawUrls.vids de la respuesta de clock.json (igual que VideoService)
function extractFromClockJson(data) {
  const links = [];
  try {
    const entries = Array.isArray(data?.links) ? data.links : [];
    for (const entry of entries) {
      const vids = entry?.rawUrls?.vids;
      if (Array.isArray(vids) && vids.length > 0) {
        for (const vid of vids) {
          if (!vid.url || !vid.height) continue;
          const url = vid.url.replace(/\\u002F/g, '/').replace(/\\/g, '');
          links.push({ url, quality: `${vid.height}p`, type: 'mp4', bandwidth: vid.bandwidth });
        }
        continue;
      }
      // Fallback: campo link (puede ser sk.json)
      const linkUrl = entry?.link;
      if (linkUrl) {
        const url = linkUrl.replace(/\\u002F/g, '/').replace(/\\/g, '');
        links.push({ url, quality: entry.resolutionStr || 'auto', type: 'link-field', isSkJson: url.includes('sk.json') });
      }
    }
  } catch {}
  return links;
}

// ─── Tests base ─────────────────────────────────────────────────────────────
async function testConnectivity() {
  process.stdout.write('  api.allanime.day... ');
  try {
    await axios.get(`${API_BASE}/api`, { headers: HEADERS_GET, timeout: 5000,
      params: { variables: '{}', extensions: '{"persistedQuery":{"version":1,"sha256Hash":"test"}}' }
    });
    console.log('✅');
    return true;
  } catch (e) {
    if (e.response) { console.log('✅ (alcanzable)'); return true; }
    console.log(`❌ ${e.message}`);
    return false;
  }
}

async function testCatalog() {
  process.stdout.write('  Búsqueda de catálogo (POST)... ');
  try {
    const query = `query($search:SearchInput,$limit:Int,$page:Int,$translationType:VaildTranslationTypeEnumType,$countryOrigin:VaildCountryOriginEnumType){shows(search:$search,limit:$limit,page:$page,translationType:$translationType,countryOrigin:$countryOrigin){pageInfo{total}edges{_id name englishName thumbnail availableEpisodes}}}`;
    const res = await axios.post(`${API_BASE}/api`,
      { variables: { search: { query: 'slime' }, limit: 5, page: 1, translationType: 'sub', countryOrigin: 'ALL' }, query },
      { headers: HEADERS_POST, timeout: 8000 }
    );
    const edges = res.data?.data?.shows?.edges;
    if (Array.isArray(edges) && edges.length > 0) {
      // Verificar campos esperados en el primer resultado
      const first = edges[0];
      const missingFields = ['_id', 'name', 'thumbnail', 'availableEpisodes'].filter(f => !(f in first));
      if (missingFields.length) {
        console.log(`⚠️  edges OK pero faltan campos: ${missingFields.join(', ')}`);
        return { ok: false, count: edges.length, missingFields, path: 'data.shows.edges' };
      }
      console.log(`✅ ${edges.length} resultados (campos OK)`);
      return { ok: true, count: edges.length, path: 'data.shows.edges' };
    }
    console.log('⚠️  sin edges — path puede haber cambiado');
    return { ok: false, raw: JSON.stringify(res.data).substring(0, 300) };
  } catch (e) {
    console.log(`❌ ${e.message}`);
    return { ok: false, error: e.message };
  }
}

async function testTrending() {
  process.stdout.write('  Trending (POST)... ');
  try {
    const query = `query($type:VaildPopularTypeEnumType!,$size:Int!,$dateRange:Int!,$page:Int!,$allowAdult:Boolean!,$allowUnknown:Boolean!){queryPopular(type:$type,size:$size,dateRange:$dateRange,page:$page,allowAdult:$allowAdult,allowUnknown:$allowUnknown){total recommendations{anyCard{_id name thumbnail}}}}`;
    const res = await axios.post(`${API_BASE}/api`,
      { variables: { type: 'anime', size: 5, dateRange: 7, page: 1, allowAdult: false, allowUnknown: false }, query },
      { headers: HEADERS_POST, timeout: 8000 }
    );
    const recs = res.data?.data?.queryPopular?.recommendations;
    if (Array.isArray(recs) && recs.length > 0) {
      const first = recs[0]?.anyCard;
      const missingFields = ['_id', 'name', 'thumbnail'].filter(f => !first?.[f]);
      if (missingFields.length) {
        console.log(`⚠️  recommendations OK pero anyCard faltan campos: ${missingFields.join(', ')}`);
        return { ok: false, missingFields, path: 'data.queryPopular.recommendations' };
      }
      console.log(`✅ ${recs.length} items (campos OK)`);
      return { ok: true, path: 'data.queryPopular.recommendations' };
    }
    console.log('⚠️  sin recommendations — path puede haber cambiado');
    return { ok: false, raw: JSON.stringify(res.data).substring(0, 300) };
  } catch (e) {
    console.log(`❌ ${e.message}`);
    return { ok: false, error: e.message };
  }
}

async function testEpisodeList(showId) {
  process.stdout.write(`  Lista de episodios (${showId})... `);
  try {
    const query = `query ($showId: String!) { show( _id: $showId ) { _id availableEpisodesDetail }}`;
    const res = await axios.post(`${API_BASE}/api`,
      { variables: { showId }, query },
      { headers: HEADERS_POST, timeout: 8000 }
    );
    const detail = res.data?.data?.show?.availableEpisodesDetail;
    if (detail && Array.isArray(detail.sub)) {
      console.log(`✅ ${detail.sub.length} sub, ${detail.dub?.length || 0} dub`);
      return { ok: true, subCount: detail.sub.length, path: 'data.show.availableEpisodesDetail' };
    }
    console.log('⚠️  path inesperado');
    return { ok: false, raw: JSON.stringify(res.data).substring(0, 300) };
  } catch (e) {
    console.log(`❌ ${e.message}`);
    return { ok: false, error: e.message };
  }
}

async function testAnimeDetails(showId) {
  process.stdout.write(`  Detalles del anime (${showId})... `);
  try {
    // Query idéntica a AnimeDetailsService.getAnimeDetails — usa $_id no $showId
    const query = `query($_id:String!){show(_id:$_id){_id name englishName nativeName thumbnail banner description genres tags type status rating season airedStart airedEnd episodeCount episodeDuration availableEpisodes score averageScore studios countryOfOrigin altNames}}`;
    const res = await axios.post(`${API_BASE}/api`,
      { variables: { _id: showId }, query },
      { headers: HEADERS_POST, timeout: 8000 }
    );
    const show = res.data?.data?.show;
    if (!show?._id) {
      console.log(`⚠️  sin data.show._id — status: ${res.status} raw: ${JSON.stringify(res.data).substring(0, 200)}`);
      return { ok: false, raw: JSON.stringify(res.data).substring(0, 300) };
    }
    const expectedFields = ['_id', 'name', 'thumbnail', 'description', 'genres', 'status'];
    const missingFields = expectedFields.filter(f => !(f in show));
    if (missingFields.length) {
      console.log(`⚠️  faltan campos: ${missingFields.join(', ')}`);
      return { ok: false, missingFields };
    }
    console.log(`✅ "${show.englishName || show.name}"`);
    return { ok: true, name: show.englishName || show.name };
  } catch (e) {
    console.log(`❌ ${e.message}`);
    return { ok: false, error: e.message };
  }
}

async function testEpisodeInfos(showId, episode) {
  process.stdout.write(`  Episode infos (${showId} ep ${episode})... `);
  try {
    // Igual que AnimeService.getEpisodeInfos: GET con persisted query hash
    const HASH = 'c8f3ac51f598e630a1d09d7f7fb6924cff23277f354a23e473b962a367880f7d';
    const epNum = parseFloat(episode);
    const variables = { showId, episodeNumStart: 1, episodeNumEnd: 26 };
    const res = await axios.get(`${API_BASE}/api`, {
      headers: HEADERS_GET, timeout: 8000,
      params: {
        variables: JSON.stringify(variables),
        extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: HASH } }),
      }
    });
    const infos = res.data?.data?.episodeInfos;
    if (Array.isArray(infos) && infos.length > 0) {
      const ep = infos.find(e => e.episodeIdNum === epNum) || infos[0];
      const missingFields = ['episodeIdNum', 'thumbnails', 'uploadDates'].filter(f => !(f in ep));
      if (missingFields.length) {
        console.log(`⚠️  episodeInfos OK pero faltan campos: ${missingFields.join(', ')}`);
        return { ok: false, missingFields };
      }
      console.log(`✅ ${infos.length} eps — ep${ep.episodeIdNum} sub: ${ep.uploadDates?.sub?.substring(0, 10) || 'N/A'}`);
      return { ok: true, count: infos.length };
    }
    console.log(`⚠️  sin episodeInfos — status: ${res.status} raw: ${JSON.stringify(res.data).substring(0, 200)}`);
    return { ok: false, raw: JSON.stringify(res.data).substring(0, 300) };
  } catch (e) {
    console.log(`❌ ${e.message}`);
    return { ok: false, error: e.message };
  }
}

async function testProviders(showId, episode) {
  const HASH = 'f4662f4b7510b26795dd53ef824a0bf1740fbbc5d1273fab18222ac831bca8d0';
  const mapping = readProviderMapping();
  console.log(`  Providers (${showId} ep ${episode}):`);

  try {
    const res = await axios.get(`${API_BASE}/api`, {
      headers: { ...HEADERS_GET, Referer: EPISODE_REFERER, Origin: EPISODE_REFERER },
      timeout: 10000,
      params: {
        variables: JSON.stringify({ showId, translationType: 'sub', episodeString: episode }),
        extensions: JSON.stringify({
          persistedQuery: { version: 1, sha256Hash: HASH },
          aaReq: buildAaReqToken(HASH),
        }),
      },
    });

    if (res.status !== 200) {
      console.log(`    ❌ HTTP ${res.status} — hash puede haber cambiado`);
      return { ok: false, hashValid: false };
    }

    const { format, decryptOk, sources } = extractSourceUrls(res.data);

    if (format === 'tobeparsed_decrypt_failed') {
      console.log('    ❌ tobeparsed presente pero descifrado falló — clave AES puede haber cambiado');
      return { ok: false, format, decryptFailed: true };
    }

    if (!sources.length) {
      console.log(`    ❌ 0 sources. Formato: ${format}`);
      return { ok: false, format };
    }

    console.log(`    Formato: ${format}  |  Total: ${sources.length} providers`);

    const newProviders = [];
    const providerResults = sources.map((src) => {
      const name = src.sourceName;
      const rawUrl = src.sourceUrl || '';
      const priority = src.priority || 0;
      const isMapped = !!mapping[name];
      const isEncoded = rawUrl.startsWith('--');
      const isDirect = rawUrl.startsWith('http');
      let resolvedUrl = isEncoded ? decodeUrl(rawUrl.slice(2)) : (isDirect ? rawUrl : null);
      const status = !isMapped ? 'NO_MAPEADO' : 'OK';
      const suggestedType = isMapped ? mapping[name] : suggestType(name, resolvedUrl || rawUrl);
      if (!isMapped) newProviders.push({ name, suggestedType, url: resolvedUrl || rawUrl });
      const icon = isMapped ? '  ✅' : '  🔴';
      console.log(`${icon} ${name.padEnd(10)} p:${String(priority).padEnd(5)} tipo:[${suggestedType.padEnd(12)}] encoded:${isEncoded} direct:${isDirect}`);
      return { name, priority, status, isMapped, isEncoded, isDirect, resolvedUrl, suggestedType };
    });

    return { ok: true, format, total: sources.length, hashValid: true, providers: providerResults, unmapped: newProviders.map(p => p.name), newProviders };
  } catch (e) {
    console.log(`    ❌ ${e.message}`);
    if (e.response?.status === 400 || e.response?.status === 404)
      console.log('    ⚠️  El hash persistedQuery puede haber cambiado');
    return { ok: false, error: e.message };
  }
}

// ─── Test profundo: cada provider uno por uno ───────────────────────────────
async function testProviderDeep(provider) {
  const { name, resolvedUrl, suggestedType } = provider;
  const result = { name, type: suggestedType, resolvedUrl, steps: [] };

  if (!resolvedUrl) {
    result.verdict = 'NO_URL';
    result.playable = false;
    return result;
  }

  const isClockEndpoint = resolvedUrl.includes('/clock.json') || resolvedUrl.includes('/apivtwo/');
  const fullUrl = resolvedUrl.startsWith('http')
    ? resolvedUrl
    : `https://${ALLANIME_BASE}${resolvedUrl}`;

  // ── Paso A: Fetch del provider URL ─────────────────────────────────────
  let providerRes;
  try {
    providerRes = await axios.get(fullUrl, {
      headers: HEADERS_GET, timeout: 10000, validateStatus: () => true,
    });
    result.steps.push({ step: 'fetch_provider', url: fullUrl.substring(0, 80), status: providerRes.status });
  } catch (e) {
    result.steps.push({ step: 'fetch_provider', url: fullUrl.substring(0, 80), error: e.message });
    result.verdict = 'PROVIDER_FETCH_FAILED';
    result.playable = false;
    return result;
  }

  if (providerRes.status !== 200) {
    result.steps.push({ step: 'fetch_provider_status', error: `HTTP ${providerRes.status}` });
    result.verdict = `PROVIDER_HTTP_${providerRes.status}`;
    result.playable = false;
    return result;
  }

  const contentType = providerRes.headers['content-type'] || '';
  result.steps.push({ step: 'content_type', value: contentType.substring(0, 60) });

  // ── Paso B: clock.json → extraer rawUrls.vids ──────────────────────────
  if (isClockEndpoint) {
    const isJson = contentType.includes('json') || typeof providerRes.data === 'object';
    if (!isJson) {
      result.steps.push({ step: 'clock_json_parse', error: 'respuesta no es JSON' });
      result.verdict = 'CLOCK_NOT_JSON';
      result.playable = false;
      return result;
    }

    const clockLinks = extractFromClockJson(providerRes.data);
    result.steps.push({ step: 'clock_extract', total: clockLinks.length });

    if (!clockLinks.length) {
      result.steps.push({ step: 'clock_no_links', error: 'clock.json sin links ni rawUrls.vids' });
      result.verdict = 'CLOCK_NO_LINKS';
      result.playable = false;
      return result;
    }

    const rawUrlsVids = clockLinks.filter(l => l.type === 'mp4');
    const skJsonLinks = clockLinks.filter(l => l.isSkJson);

    result.steps.push({
      step: 'clock_breakdown',
      rawUrlsVids: rawUrlsVids.length,
      skJsonLinks: skJsonLinks.length,
    });

    if (skJsonLinks.length && !rawUrlsVids.length) {
      // Intentar fetchear sk.json para ver si funciona
      for (const skLink of skJsonLinks.slice(0, 1)) {
        const skRes = await httpGet(skLink.url).catch(() => null);
        result.steps.push({
          step: 'sk_json_fetch',
          url: skLink.url.substring(0, 80),
          status: skRes?.status ?? 'error',
          ok: skRes?.status === 200,
        });
        if (skRes?.status !== 200) {
          result.steps.push({ step: 'sk_json_verdict', error: `sk.json devuelve ${skRes?.status ?? 'error'} — sin rawUrls.vids en clock.json y sk.json no accesible` });
          result.verdict = 'SK_JSON_404';
          result.playable = false;
          return result;
        }
      }
    }

    if (!rawUrlsVids.length) {
      result.steps.push({ step: 'no_raw_urls_vids', warning: 'clock.json sin rawUrls.vids — solo sk.json links' });
      result.verdict = 'CLOCK_NO_RAW_VIDS';
      result.playable = false;
      return result;
    }

    // Verificar accesibilidad de la primera URL de video (por bandwidth)
    const sortedVids = rawUrlsVids.sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0));
    const topVid = sortedVids[0];
    const headResult = await httpHead(topVid.url, 8000);

    result.steps.push({
      step: 'video_url_head',
      url: topVid.url.substring(0, 80),
      quality: topVid.quality,
      status: headResult.status,
      contentType: headResult.contentType?.substring(0, 40),
      ok: headResult.ok,
    });

    if (!headResult.ok) {
      // 403 en CDNs de Bilibili (akamaized.net) es normal desde una IP diferente a la que generó el token.
      // El token está firmado por AllAnime para la sesión actual. En el dispositivo puede funcionar si
      // el request viene del mismo contexto de red que generó el clock.json.
      const isCdnToken = topVid.url.includes('akamaized.net') || topVid.url.includes('bstar');
      result.steps.push({
        step: 'video_url_verdict',
        error: `URL de video ${topVid.quality} devuelve ${headResult.status}`,
        note: isCdnToken && headResult.status === 403
          ? 'CDN Bilibili con token firmado — 403 desde esta IP es esperado; puede funcionar en el dispositivo si el token no es IP-restringido'
          : undefined,
      });
      result.verdict = isCdnToken && headResult.status === 403 ? 'VIDEO_URL_403_CDN_TOKEN' : `VIDEO_URL_${headResult.status || 'UNREACHABLE'}`;
      result.playable = false; // conservador: no sabemos si funciona en device
      result.mayWorkOnDevice = isCdnToken && headResult.status === 403;
      return result;
    }

    result.qualities = sortedVids.map(v => v.quality);
    result.topVideoUrl = topVid.url.substring(0, 80);
    result.verdict = 'OK';
    result.playable = true;
    return result;
  }

  // ── Paso C: Provider de iframe (HTML) ──────────────────────────────────
  const isHtml = contentType.includes('html') || typeof providerRes.data === 'string';
  const html = typeof providerRes.data === 'string' ? providerRes.data : JSON.stringify(providerRes.data);

  result.steps.push({ step: 'iframe_fetch', responseSize: html.length });

  const videoUrls = extractVideoUrlsFromHtml(html);
  result.steps.push({ step: 'iframe_video_extraction', found: videoUrls.length });

  if (!videoUrls.length) {
    result.steps.push({ step: 'iframe_verdict', warning: 'HTML recibido pero sin URLs de video extraíbles — scraping no implementado para este provider' });
    result.verdict = 'IFRAME_NO_URLS';
    result.playable = false;
    return result;
  }

  // Verificar primera URL encontrada
  const headResult = await httpHead(videoUrls[0], 6000);
  result.steps.push({
    step: 'iframe_video_head',
    url: videoUrls[0].substring(0, 80),
    status: headResult.status,
    ok: headResult.ok,
  });

  if (headResult.ok) {
    result.verdict = 'OK_IFRAME';
    result.playable = true;
    result.extractedUrls = videoUrls.slice(0, 3);
  } else {
    result.verdict = 'IFRAME_VIDEO_UNREACHABLE';
    result.playable = false;
  }
  return result;
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  AllAnime API — Diagnóstico Profundo');
  console.log(`  showId: ${SHOW_ID}  episode: ${EPISODE}${AUTO_FIX ? '  [AUTO-FIX]' : ''}`);
  console.log('══════════════════════════════════════════════════\n');

  console.log('[ 1 ] Conectividad');
  if (!(await testConnectivity())) { console.log('\n❌ Sin conexión. Abortando.\n'); process.exit(1); }

  console.log('\n[ 2 ] Catálogo');
  const catalog = await testCatalog();

  console.log('\n[ 3 ] Trending');
  const trending = await testTrending();

  console.log('\n[ 4 ] Episodios');
  const episodes = await testEpisodeList(SHOW_ID);

  console.log('\n[ 5 ] Detalles del anime');
  const animeDetails = await testAnimeDetails(SHOW_ID);

  console.log('\n[ 6 ] Episode infos');
  const episodeInfos = await testEpisodeInfos(SHOW_ID, EPISODE);

  console.log('\n[ 7 ] Providers (superficie)');
  const providers = await testProviders(SHOW_ID, EPISODE);

  // ── Test profundo por provider ───────────────────────────────────────────
  const deepResults = [];
  if (providers.ok && providers.providers?.length) {
    console.log('\n[ 8 ] Providers (profundo) — clock.json, rawUrls, accesibilidad de video');

    const sorted = [...providers.providers].sort((a, b) => b.priority - a.priority);
    for (const p of sorted) {
      process.stdout.write(`  [${p.name}] `);
      const deep = await testProviderDeep(p);
      deepResults.push(deep);

      if (deep.verdict === 'OK') {
        const quals = deep.qualities?.join(', ') || '?';
        console.log(`✅ REPRODUCIBLE — calidades: ${quals}`);
        deep.steps.forEach(s => {
          if (s.step === 'video_url_head')
            console.log(`       ↳ HEAD ${s.quality}: HTTP ${s.status} ${s.contentType}`);
        });
      } else if (deep.verdict === 'OK_IFRAME') {
        console.log(`✅ IFRAME con video extraíble: ${deep.extractedUrls?.[0]?.substring(0, 60)}`);
      } else if (deep.verdict === 'IFRAME_NO_URLS') {
        console.log(`⚠️  IFRAME — HTML OK pero sin URLs de video extraíbles`);
      } else if (deep.verdict === 'VIDEO_URL_403_CDN_TOKEN') {
        console.log(`⚠️  clock.json OK + rawUrls.vids OK — CDN 403 desde esta IP (token firmado; puede funcionar en device)`);
      } else if (deep.verdict === 'SK_JSON_404') {
        const skStep = deep.steps.find(s => s.step === 'sk_json_fetch');
        console.log(`❌ clock.json OK pero sk.json → HTTP ${skStep?.status} — sin rawUrls.vids`);
      } else if (deep.verdict === 'CLOCK_NO_RAW_VIDS') {
        console.log(`❌ clock.json sin rawUrls.vids y sin sk.json alternativo`);
      } else {
        console.log(`❌ ${deep.verdict}`);
      }
    }
  }

  // ─── Resumen final ─────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log('══════════════════════════════════════════════════');

  const issues = [];
  if (!catalog.ok)              issues.push({ type: 'CATALOG_FORMAT',    fixable: false, msg: 'Catálogo: formato/campos cambiados',          file: 'src/services/CatalogService.js',  method: 'parseSeasonResults' });
  if (!trending.ok)             issues.push({ type: 'TRENDING_FORMAT',   fixable: false, msg: 'Trending: formato/campos cambiados',          file: 'src/services/CatalogService.js',  method: 'parseTrendingResults' });
  if (!episodes.ok)             issues.push({ type: 'EPISODES_FORMAT',   fixable: false, msg: 'Episodios: formato cambiado',                 file: 'src/services/AnimeService.js',    method: 'getEpisodesList' });
  if (!animeDetails.ok)         issues.push({ type: 'ANIME_DETAILS',     fixable: false, msg: 'AnimeDetails: formato/campos cambiados',      file: 'src/services/AnimeService.js',    method: 'getAnimeDetails' });
  if (!episodeInfos.ok)         issues.push({ type: 'EPISODE_INFOS',     fixable: false, msg: 'EpisodeInfos: formato cambiado',              file: 'src/services/AnimeService.js',    method: 'getEpisodeInfos' });
  if (providers.decryptFailed)  issues.push({ type: 'DECRYPT_KEY',       fixable: false, msg: 'Clave AES tobeparsed puede haber cambiado',   file: 'src/services/AnimeService.js',    line: 13 });
  if (providers.hashValid === false) issues.push({ type: 'HASH_CHANGED', fixable: false, msg: 'Hash persistedQuery de providers cambiado',   file: 'src/services/AnimeService.js',    method: 'getEpisodeUrl' });
  if (providers.unmapped?.length) issues.push({ type: 'UNMAPPED_PROVIDERS', fixable: true, msg: `Providers sin mapear: ${providers.unmapped.join(', ')}`, file: 'src/utils/apiConfig.js' });

  const playable = deepResults.filter(r => r.playable);
  const broken   = deepResults.filter(r => !r.playable && r.resolvedUrl);

  if (playable.length) {
    console.log(`✅ Providers reproducibles: ${playable.map(r => r.name).join(', ')}`);
  } else if (deepResults.length) {
    issues.push({ type: 'NO_PLAYABLE_PROVIDERS', fixable: false, msg: 'Ningún provider produce video reproducible', file: 'src/services/VideoService.js' });
  }

  if (broken.length) {
    broken.forEach(r => {
      const detail = r.steps.find(s => s.error || s.warning);
      console.log(`❌ ${r.name}: ${r.verdict}${detail ? ' — ' + (detail.error || detail.warning) : ''}`);
    });
  }

  if (!issues.length && playable.length) {
    console.log('✅ Todo funciona correctamente');
  } else {
    issues.forEach(i => console.log(`${i.fixable ? '⚠️ ' : '❌'} ${i.msg}  →  ${i.file}${i.method ? ` (${i.method})` : ''}${i.line ? `:${i.line}` : ''}`));
  }

  if (AUTO_FIX && providers.newProviders?.length) {
    console.log('\n[ FIX ] Aplicando...');
    addProvidersToMapping(providers.newProviders);
    console.log(`✅ Agregados: ${providers.newProviders.map(p => `${p.name}→${p.suggestedType}`).join(', ')}`);
    console.log('   → src/utils/apiConfig.js');
  } else if (!AUTO_FIX && providers.newProviders?.length) {
    console.log('\n[ FIX disponible con --fix ]');
    providers.newProviders.forEach(p =>
      console.log(`  "${p.name}": "${p.suggestedType}",  // ${p.url.substring(0, 70)}`));
  }

  console.log('');
  console.log('__DIAGNOSE_JSON__');
  console.log(JSON.stringify({
    showId: SHOW_ID, episode: EPISODE,
    catalog, trending, episodes, animeDetails, episodeInfos,
    providers, deepResults, issues,
  }, null, 2));
  console.log('__END_DIAGNOSE_JSON__');
}

main().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
