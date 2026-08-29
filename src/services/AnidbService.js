const logger = createLogger("anidb");
import { createLogger } from "../utils/logger";
// services/AnidbService.js
// Fuente de anime alternativa: anidb.app (la misma que adoptó ani-cli v5).
//
// ─── CONTEXTO ───────────────────────────────────────────────────────────────
// pystardust/ani-cli v5 (PR #1830) abandonó AllAnime y se pasó a anidb.app.
// Este servicio implementa esa misma fuente, pero con dos diferencias
// deliberadas respecto a ani-cli:
//
// 1. **Cómo pasamos Cloudflare.** ani-cli usa `curl-impersonate` (binario
//    nativo que falsifica el ClientHello TLS). Eso no se puede hacer desde JS
//    en React Native, así que ejecutamos los requests dentro de un WebView
//    oculto — que es Chrome de verdad. Ver `src/utils/cloudflareBridge.js`,
//    donde está la tabla de todo lo que probé y falló, y el plan B nativo.
//    IMPORTANTE: solo la metadata pasa por el WebView. El video
//    (`hls.anidb.app`) NO tiene Cloudflare y va directo a ExoPlayer.
//
// 2. **Cuánto usamos de la fuente.** ani-cli solo usa `/browse?q=` (buscar por
//    nombre) porque es una CLI. anidb.app soporta mucho más y Aniku lo
//    necesita: filtros por tipo/estado/temporada/año/género y ordenamientos
//    (trending, top, popular, top airing…). Todo eso está mapeado abajo.
//
// ─── ENDPOINTS (verificados en vivo el 2026-08-29) ──────────────────────────
//   GET /browse?q=&type=&status=&season=&year=&genres=&sort=   → HTML de cards
//   GET /api/frontend/anime/{numericId}/episodes  → {"episodes":[{id,number,number2,filler}]}
//   GET /api/frontend/episode/{episodeId}/languages
//        → {"languages":[{code:"jpn"|"eng", name, embed_url}]}
//   GET {embed_url}                               → HTML con  file: '<master.m3u8>'
//   GET {master.m3u8}                             → HLS estándar (hls.anidb.app, SIN Cloudflare)
//
// El id de anime es un slug con el id numérico al final:
//   "that-time-i-got-reincarnated-as-a-slime-the-movie-scarlet-bond-5241"
// La API de episodios quiere SOLO el número final (5241), igual que ani-cli
// (`${1##*-}`).

import { cfEval, cfFetchJson, ensureBridgeReady } from "../utils/cloudflareBridge";

const BASE = "https://anidb.app";

// sub → japonés, dub → inglés (mismo criterio que ani-cli).
const LANG_BY_TRANSLATION = { sub: "jpn", dub: "eng" };

// Opciones de los <select> de /browse, tal cual las expone el sitio.
export const ANIDB_SORTS = {
  trending: "order_trending",
  top: "order_top",
  updated: "order_updated",
  popular: "order_popular",
  favorite: "order_favorite",
  topAiring: "order_top_airing",
  titleAZ: "title",
  newest: "aired_start",
};

export const ANIDB_TYPES = ["TV", "Movie", "ONA", "OVA", "Special", "Music"];
export const ANIDB_STATUSES = ["Currently Airing", "Finished Airing"];
export const ANIDB_SEASONS = ["winter", "spring", "summer", "fall"];

// id numérico → nombre. Los ids son los de /genres/<id>.
export const ANIDB_GENRES = {
  1: "Action",
  2: "Drama",
  3: "Adventure",
  4: "Fantasy",
  5: "Comedy",
  6: "Sci-Fi",
  7: "Mystery",
  8: "Gourmet",
  9: "Slice of Life",
  10: "Supernatural",
  11: "Sports",
  12: "Award Winning",
  13: "Ecchi",
  14: "Romance",
  15: "Hentai",
  16: "Boys Love",
  17: "Erotica",
  18: "Suspense",
  19: "Avant Garde",
  20: "Girls Love",
  21: "Horror",
};

// ─── helpers ────────────────────────────────────────────────────────────────

// "slug-con-guiones-5241" → "5241"
function numericId(animeId) {
  return String(animeId).split("-").pop();
}

function buildBrowseUrl(params = {}) {
  const qs = new URLSearchParams();
  if (params.query) qs.set("q", params.query);
  if (params.type) qs.set("type", params.type);
  if (params.status) qs.set("status", params.status);
  if (params.season) qs.set("season", params.season);
  if (params.year) qs.set("year", String(params.year));
  if (params.genre) qs.set("genres", String(params.genre));
  if (params.sort) qs.set("sort", params.sort);
  if (params.page && params.page > 1) qs.set("page", String(params.page));
  const query = qs.toString();
  return `${BASE}/browse${query ? `?${query}` : ""}`;
}

// Parsea las cards DENTRO del WebView con DOMParser y devuelve solo los datos.
// Se hace en la página (y no trayendo el HTML entero por el bridge) porque el
// HTML de /browse pesa ~115 KB y solo necesitamos unos pocos campos.
function browseParserExpression(url) {
  return `
    fetch(${JSON.stringify(url)})
      .then(function(r){ return r.text(); })
      .then(function(html){
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var out = [];
        var seen = {};
        var cards = doc.querySelectorAll('a[href*="/anime/"]');
        for (var i = 0; i < cards.length; i++) {
          var a = cards[i];
          var href = a.getAttribute('href') || '';
          var m = href.match(/\\/anime\\/([a-z0-9-]+-\\d+)/i);
          if (!m) continue;
          var id = m[1];
          if (seen[id]) continue;
          seen[id] = 1;
          var img = a.querySelector('img');
          out.push({
            id: id,
            title: a.getAttribute('title') || (img && img.getAttribute('alt')) || '',
            thumbnail: (img && (img.getAttribute('src') || img.getAttribute('data-src'))) || null
          });
        }
        return out;
      })
  `;
}

// ─── servicio ───────────────────────────────────────────────────────────────

class AnidbService {
  /** Prepara el puente (resuelve el challenge). Útil para precalentar. */
  static async warmUp() {
    await ensureBridgeReady();
  }

  /**
   * Búsqueda y catálogo. Todos los filtros son opcionales y combinables.
   * @param {{query?:string,type?:string,status?:string,season?:string,
   *          year?:number,genre?:number,sort?:string,page?:number}} params
   * @returns {Promise<Array<{id,title,thumbnail}>>}
   */
  static async browse(params = {}) {
    const url = buildBrowseUrl(params);
    logger.debug(`🔍 browse: ${url}`);
    const results = await cfEval(browseParserExpression(url));
    logger.debug(`   ${results?.length ?? 0} resultados`);
    return Array.isArray(results) ? results : [];
  }

  /** Atajo: buscar por nombre (lo único que hace ani-cli). */
  static async search(query, page = 1) {
    return this.browse({ query, page });
  }

  /** Trending — no existe en ani-cli; anidb sí lo soporta vía sort. */
  static async getTrending(page = 1) {
    return this.browse({ sort: ANIDB_SORTS.trending, page });
  }

  static async getPopular(page = 1) {
    return this.browse({ sort: ANIDB_SORTS.popular, page });
  }

  static async getTopAiring(page = 1) {
    return this.browse({ sort: ANIDB_SORTS.topAiring, page });
  }

  /** Catálogo por género (id numérico de ANIDB_GENRES). */
  static async getByGenre(genreId, { sort = ANIDB_SORTS.popular, page = 1 } = {}) {
    return this.browse({ genre: genreId, sort, page });
  }

  /**
   * Lista de episodios.
   * @returns {Promise<Array<{id:number, number:number, filler:boolean}>>}
   */
  static async getEpisodes(animeId) {
    const data = await cfFetchJson(
      `${BASE}/api/frontend/anime/${numericId(animeId)}/episodes`,
    );
    const episodes = Array.isArray(data?.episodes) ? data.episodes : [];
    logger.debug(`📺 ${episodes.length} episodios de ${animeId}`);
    return episodes.map((ep) => ({
      id: ep.id,
      number: ep.number,
      number2: ep.number2 ?? null,
      filler: Boolean(ep.filler),
    }));
  }

  /** Idiomas/embeds disponibles para un episodio. */
  static async getEpisodeLanguages(episodeId) {
    const data = await cfFetchJson(
      `${BASE}/api/frontend/episode/${episodeId}/languages`,
    );
    return Array.isArray(data?.languages) ? data.languages : [];
  }

  /**
   * Devuelve los links de video de un episodio, en el mismo formato que usa
   * VideoService/VideoPlayer: [{ url, quality, type, source }].
   *
   * El m3u8 vive en hls.anidb.app, que NO tiene Cloudflare: se puede pedir con
   * axios/fetch normal y ExoPlayer lo reproduce directo. Solo el paso de
   * conseguir el embed_url y leer la página del embed pasa por el WebView.
   */
  static async getVideoLinks(animeId, episodeNumber, translationType = "sub") {
    const wanted = LANG_BY_TRANSLATION[translationType] || "jpn";

    const episodes = await this.getEpisodes(animeId);
    const episode = episodes.find((ep) => String(ep.number) === String(episodeNumber));
    if (!episode) {
      logger.warn(`⚠️ Episodio ${episodeNumber} no está en ${animeId}`);
      return [];
    }

    const languages = await this.getEpisodeLanguages(episode.id);
    const lang =
      languages.find((l) => l.code === wanted) ||
      (translationType === "sub" ? null : languages[0]);
    if (!lang?.embed_url) {
      logger.warn(`⚠️ Sin embed ${wanted} para ep ${episodeNumber}`);
      return [];
    }

    const master = await this.getMasterPlaylist(lang.embed_url);
    if (!master) return [];

    return this.parseMasterPlaylist(master);
  }

  /** Extrae la URL del master.m3u8 desde la página del embed. */
  static async getMasterPlaylist(embedUrl) {
    // La página del embed está en anidb.app → necesita el bridge.
    const result = await cfEval(`
      fetch(${JSON.stringify(embedUrl)})
        .then(function(r){ return r.text(); })
        .then(function(html){
          var m = html.match(/file:\\s*'([^']+)'/) || html.match(/file:\\s*"([^"]+)"/);
          return m ? m[1] : null;
        })
    `);
    if (!result) logger.warn("⚠️ No se encontró file: '<m3u8>' en el embed");
    return result;
  }

  /**
   * Descarga el master playlist y devuelve las variantes por calidad.
   * Va por fetch normal: hls.anidb.app no está detrás de Cloudflare.
   */
  static async parseMasterPlaylist(masterUrl) {
    const response = await fetch(masterUrl);
    if (!response.ok) {
      logger.error(`❌ master.m3u8 -> ${response.status}`);
      return [];
    }
    const text = await response.text();

    const links = [];
    const lines = text.split("\n").map((l) => l.trim());
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith("#EXT-X-STREAM-INF")) continue;
      const url = lines[i + 1];
      if (!url || url.startsWith("#")) continue;
      const resolution = lines[i].match(/RESOLUTION=\d+x(\d+)/);
      links.push({
        url: url.startsWith("http") ? url : new URL(url, masterUrl).toString(),
        quality: resolution ? `${resolution[1]}p` : "auto",
        type: "hls",
        source: "anidb-hls",
      });
    }

    // Si no había variantes, el master ya es reproducible tal cual.
    if (links.length === 0) {
      links.push({ url: masterUrl, quality: "auto", type: "hls", source: "anidb-hls" });
    }

    links.sort((a, b) => parseInt(b.quality, 10) - parseInt(a.quality, 10) || 0);
    logger.debug(`🎬 ${links.length} calidades: ${links.map((l) => l.quality).join("/")}`);
    return links;
  }
}

export default AnidbService;
