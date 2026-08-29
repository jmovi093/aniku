#!/usr/bin/env node
/**
 * .claude/check-source-contract.js
 *
 * Verifica que `src/services/source/index.js` devuelva EXACTAMENTE las formas
 * que las pantallas esperan. Corre sin device, sin red y sin el bundle de RN:
 * mockea el puente de Cloudflare con payloads fijos.
 *
 *   node .claude/check-source-contract.js
 *
 * POR QUÉ EXISTE: al migrar a anidb se rompieron 3 contratos de una sola vez y
 * todos se manifestaron recién en el celular:
 *   1. searchAnimeAdvanced devolvía un array, pero la pantalla Search hace
 *      `const { results, pagination } = await ...` → "Cannot read property
 *      'length' of undefined".
 *   2. getAnimeDetails no traía `title`, que isAnimeDataComplete() exige →
 *      la pantalla de detalle descartaba la respuesta en silencio.
 *   3. `details.episodes` tiene que ser un NÚMERO (generateEpisodesList itera
 *      1..N), no un objeto.
 *
 * Regla: si cambiás algo en el adaptador, corré esto ANTES de compilar el APK.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..');

// ─── mocks ──────────────────────────────────────────────────────────────────
// Payloads reales recortados (verificados contra anidb.app el 2026-08-29).
const BROWSE = [
  { id: 'that-time-i-got-reincarnated-as-a-slime-5231', title: 'Slime S2', thumbnail: 'https://cdn/x.jpg' },
];
const EPISODES = { episodes: [{ id: 7381, number: 1, number2: null, filler: false }] };
const SCHEDULE = {
  schedules: [{
    id: 1423, episode_name: 'Episode 22', airing_at: new Date().toISOString(),
    anime_id: 4429, anime_title: 'RILAKKUMA', anime_poster: 'https://cdn/p.jpg',
    anime_url: 'https://anidb.app/anime/rilakkuma-4429',
  }],
};
const DETAIL_EVAL = {
  ld: {
    name: 'That Time I Got Reincarnated as a Slime Season 2',
    alternateName: 'Tensei shitara Slime Datta Ken 2nd Season',
    description: 'Taking a break…',
    image: 'https://cdn.xlsbox.com/poster/small/1/5231.jpg',
    genre: ['Action', 'Fantasy', 'Comedy'],
  },
  type: 'TV', status: 'Finished Airing', score: '8.3',
  seasonQ: 'Winter', year: '2021', duration: '23', studio: '8bit',
};

const bridgeMock = {
  ensureBridgeReady: async () => {},
  isBridgeReady: () => true,
  cfEval: async (expr) => {
    if (expr.includes('DOMParser') && expr.includes('ld+json')) return DETAIL_EVAL;
    if (expr.includes('anime-card') || expr.includes('/anime/')) return BROWSE;
    if (expr.includes("file:")) return 'https://hls.anidb.app/stream/x/master.m3u8';
    return BROWSE;
  },
  cfFetch: async () => ({ status: 200, body: '' }),
  cfFetchJson: async (url) => {
    if (url.includes('/episodes')) return EPISODES;
    if (url.includes('/schedule')) return SCHEDULE;
    if (url.includes('/languages')) {
      return { languages: [{ code: 'jpn', name: 'Japanese', embed_url: 'https://anidb.app/embed/x' }] };
    }
    return {};
  },
};

const loggerMock = {
  createLogger: () => ({ debug() {}, info() {}, warn() {}, error() {} }),
};

// El master m3u8 se pide con `fetch` global (hls.anidb.app NO tiene Cloudflare,
// por eso no pasa por el puente). Se mockea para que el check sea hermético.
const MASTER_M3U8 = [
  '#EXTM3U',
  '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=803948,RESOLUTION=1920x1080',
  'https://hls.anidb.app/stream/x/1080p/index.m3u8',
  '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=400000,RESOLUTION=1280x720',
  'https://hls.anidb.app/stream/x/720p/index.m3u8',
].join('\n');

globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  text: async () => MASTER_M3U8,
});

// ─── loader que resuelve los imports ESM del proyecto ───────────────────────
// Se transpila con babel (el del proyecto) y se interceptan los módulos
// que tocan RN o la red.
const babel = require(path.join(ROOT, 'node_modules/@babel/core'));
// preset-env no está instalado; alcanza con pasar ESM → CommonJS.
const esmToCjs = require.resolve(
  path.join(ROOT, 'node_modules/@babel/plugin-transform-modules-commonjs'),
);

const cache = new Map();
function loadModule(file) {
  const abs = require.resolve(file);
  if (cache.has(abs)) return cache.get(abs);

  const src = fs.readFileSync(abs, 'utf8');
  const { code } = babel.transformSync(src, {
    filename: abs,
    plugins: [esmToCjs],
    babelrc: false,
    configFile: false,
  });

  const m = new Module(abs, null);
  m.filename = abs;
  m.paths = Module._nodeModulePaths(path.dirname(abs));
  const origRequire = m.require.bind(m);
  m.require = (id) => {
    if (id.includes('cloudflareBridge')) return bridgeMock;
    if (id.includes('utils/logger') || id.endsWith('/logger')) return loggerMock;
    if (id.includes('config')) return { appConfig: { source: 'anidb' } };
    if (id.startsWith('.')) return loadModule(path.resolve(path.dirname(abs), id));
    return origRequire(id);
  };
  m._compile(code, abs);
  cache.set(abs, m.exports);
  return m.exports;
}

// ─── aserciones ─────────────────────────────────────────────────────────────
let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`  ✅ ${name}`); }
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}

(async () => {
  const src = loadModule(path.join(ROOT, 'src/services/source/index.js'));
  const { CatalogSource, AnimeSource, ScheduleSource, DetailsSource } = src;

  console.log('\nCatalogSource (Home espera ARRAYS):');
  for (const fn of ['getPopularDaily', 'getPopularWeekly', 'getCurrentSeasonAnime',
    'getActionAnime', 'getRomanceAnime']) {
    const r = await CatalogSource[fn](20);
    check(`${fn} → array`, Array.isArray(r), `devolvió ${typeof r}`);
  }

  console.log('\nAnimeSource.searchAnimeAdvanced (Search hace destructuring):');
  const s = await AnimeSource.searchAnimeAdvanced({ query: 'tensei' }, 26, 1);
  check('devuelve objeto, no array', s && !Array.isArray(s) && typeof s === 'object');
  check('tiene .results como array', Array.isArray(s.results),
    `results es ${Array.isArray(s.results) ? 'array' : typeof s.results}`);
  check('tiene .pagination', !!s.pagination);
  check('pagination.total es número', typeof s.pagination?.total === 'number');

  console.log('\nAnimeSource.getAnimeDetails (isAnimeDataComplete exige title+id):');
  const d = await AnimeSource.getAnimeDetails('slime-5231');
  check('tiene .id', !!d.id);
  check('tiene .title (¡no solo .name!)', !!d.title);
  check('tiene .name', !!d.name);
  check('.episodes es número', typeof d.episodes === 'number',
    `es ${typeof d.episodes}`);
  for (const f of ['thumbnail', 'description', 'type', 'status', 'season', 'score',
    'genres', 'studios', 'episodeDuration']) {
    check(`campo .${f} presente`, f in d);
  }
  check('.stats presente (la UI lo guarda con &&)', 'stats' in d);

  console.log('\nAnimeSource.getAnimeDetails · seasons y relations:');
  check('.seasons es array', Array.isArray(d.seasons));
  check('.relations es objeto',
    d.relations && typeof d.relations === 'object' && !Array.isArray(d.relations));
  check('.relatedShows es array (compat AllAnime)', Array.isArray(d.relatedShows));

  console.log('\nAnimeSource.getEpisodeAudioOptions (selector sub/dub):');
  const audio = await AnimeSource.getEpisodeAudioOptions('slime-5231', '1');
  check('es array', Array.isArray(audio));
  check('cada opción tiene value+label',
    audio.every((o) => o.value && o.label), JSON.stringify(audio));

  console.log('\nAnimeSource.getEpisodesList (array de strings):');
  const eps = await AnimeSource.getEpisodesList('slime-5231');
  check('es array', Array.isArray(eps));
  check('elementos string', eps.every((e) => typeof e === 'string'));

  console.log('\nAnimeSource.getEpisodeInfos (mapa por número):');
  const infos = await AnimeSource.getEpisodeInfos('slime-5231');
  check('es objeto', infos && typeof infos === 'object' && !Array.isArray(infos));

  console.log('\nAnimeSource.getOptimizedVideoLinks (array con .length):');
  try {
    const links = await AnimeSource.getOptimizedVideoLinks('slime-5231', '1', 'sub');
    check('es array', Array.isArray(links));
  } catch (e) {
    check('es array', false, e.message);
  }

  console.log('\nScheduleSource:');
  const days = ScheduleSource.getAvailableDays();
  check('getAvailableDays → 7 días', Array.isArray(days) && days.length === 7);
  check('cada día tiene name/date/dayIndex',
    days.every((x) => x.name && x.date instanceof Date && typeof x.dayIndex === 'number'));
  const todayName = days.find((x) => x.isToday)?.name;
  const sched = await ScheduleSource.getAnimesForWeekday(todayName);
  check('getAnimesForWeekday → array', Array.isArray(sched));

  console.log('\nDetailsSource:');
  check('expone getAnimeDetails', typeof DetailsSource.getAnimeDetails === 'function');

  console.log(failures === 0
    ? '\n✅ Todos los contratos OK\n'
    : `\n❌ ${failures} contrato(s) rotos\n`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('\n💥 Error corriendo el check:', e.message); process.exit(1); });
