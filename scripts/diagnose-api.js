#!/usr/bin/env node
/**
 * scripts/diagnose-api.js
 * Diagnóstico completo de la integración con AllAnime.
 *
 * Uso:
 *   node scripts/diagnose-api.js
 *   node scripts/diagnose-api.js --showId <id> --episode <n>
 *   node scripts/diagnose-api.js --fix
 */
'use strict';

const CryptoJS = require('crypto-js');
const axios = require('axios').default;
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APICONFIG_PATH = path.join(ROOT, 'src/utils/apiConfig.js');

const DEFAULT_SHOW_ID = 'srGrP23qJnjsHrRYD'; // Tensei Slime S4 — anime reciente con providers activos
const DEFAULT_EPISODE = '6';
const API_BASE = 'https://api.allanime.day';
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
const ALLANIME_KEY_HEX = CryptoJS.SHA256('Xot36i3lK3:v1').toString(CryptoJS.enc.Hex);

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
    const plain = decryptCtr(cipher, ALLANIME_KEY_HEX, `${iv}00000002`).replace(/\0+$/g, '');
    try { return JSON.parse(plain); } catch { return plain; }
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

// ─── Leer PROVIDER_MAPPING actual ──────────────────────────────────────────
function readProviderMapping() {
  const content = fs.readFileSync(APICONFIG_PATH, 'utf8');
  const match = content.match(/export const PROVIDER_MAPPING\s*=\s*\{([\s\S]*?)\};/);
  if (!match) return {};
  const mapping = {};
  const re = /(?:["']([^"'\n]+)["']|([\w-]+))\s*:\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(match[1])) !== null) {
    const key = m[1] || m[2];
    mapping[key] = m[3];
  }
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

// ─── Tests ──────────────────────────────────────────────────────────────────
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
      console.log(`✅ ${edges.length} resultados`);
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
      console.log(`✅ ${recs.length} items`);
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

async function testProviders(showId, episode) {
  const HASH = 'd405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec';
  const mapping = readProviderMapping();
  console.log(`  Providers (${showId} ep ${episode}):`);

  try {
    const res = await axios.get(`${API_BASE}/api`, {
      headers: HEADERS_GET, timeout: 10000,
      params: {
        variables: JSON.stringify({ showId, translationType: 'sub', episodeString: episode }),
        extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: HASH } }),
      },
    });

    if (res.status !== 200) {
      console.log(`    ❌ HTTP ${res.status} — hash puede haber cambiado`);
      return { ok: false, hashValid: false };
    }

    const { format, decryptOk, sources, error } = extractSourceUrls(res.data);

    if (error || (!sources.length && !['tobeparsed', 'direct_episode_sourceUrls', 'direct_sourceUrls'].includes(format))) {
      console.log(`    ❌ No se extrajeron sources. Formato detectado: ${format}`);
      return { ok: false, format, error };
    }

    if (format === 'tobeparsed_decrypt_failed') {
      console.log('    ❌ tobeparsed presente pero descifrado falló — clave AES puede haber cambiado');
      return { ok: false, format, decryptFailed: true };
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
      const hasValidUrl = isEncoded || isDirect;
      let resolvedUrl = isEncoded ? decodeUrl(rawUrl.slice(2)) : (isDirect ? rawUrl : null);
      const status = !isMapped ? 'NO_MAPEADO' : !hasValidUrl ? 'URL_INVALIDA' : 'OK';
      const suggestedType = isMapped ? mapping[name] : suggestType(name, resolvedUrl || rawUrl);
      if (!isMapped) newProviders.push({ name, suggestedType, url: resolvedUrl || rawUrl });
      const icon = { OK: '  ✅', NO_MAPEADO: '  🔴', URL_INVALIDA: '  ⚠️ ' }[status];
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

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  AllAnime API — Diagnóstico');
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

  console.log('\n[ 5 ] Providers');
  const providers = await testProviders(SHOW_ID, EPISODE);

  console.log('\n══════════════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log('══════════════════════════════════════════════════');

  const issues = [];
  if (!catalog.ok)           issues.push({ type: 'CATALOG_FORMAT',    fixable: false, msg: 'Catálogo: formato cambiado',           file: 'src/services/CatalogService.js',  method: 'parseSeasonResults' });
  if (!trending.ok)          issues.push({ type: 'TRENDING_FORMAT',   fixable: false, msg: 'Trending: formato cambiado',           file: 'src/services/CatalogService.js',  method: 'parseTrendingResults' });
  if (!episodes.ok)          issues.push({ type: 'EPISODES_FORMAT',   fixable: false, msg: 'Episodios: formato cambiado',          file: 'src/services/AnimeService.js',    method: 'parseEpisodesList' });
  if (providers.decryptFailed) issues.push({ type: 'DECRYPT_KEY',     fixable: false, msg: 'Clave AES tobeparsed puede haber cambiado', file: 'src/services/AnimeService.js', line: 13 });
  if (providers.hashValid === false) issues.push({ type: 'HASH_CHANGED', fixable: false, msg: 'Hash persistedQuery de providers cambiado', file: 'src/services/AnimeService.js', method: 'getEpisodeUrl' });
  if (providers.unmapped?.length) issues.push({ type: 'UNMAPPED_PROVIDERS', fixable: true, msg: `Providers sin mapear: ${providers.unmapped.join(', ')}`, file: 'src/utils/apiConfig.js' });

  if (!issues.length) {
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
  console.log(JSON.stringify({ showId: SHOW_ID, episode: EPISODE, catalog, trending, episodes, providers, issues }, null, 2));
  console.log('__END_DIAGNOSE_JSON__');
}

main().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
