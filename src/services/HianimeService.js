const logger = createLogger("hianime");
import { createLogger } from "../utils/logger";
// services/HianimeService.js
// Fuente de anime: hianime (hianime.at → hianime.fm), la misma que adoptó
// ani-cli (PR #1897, "replace anidb with hianime provider").
//
// anidb.app murió (hoy redirige a otro sitio), por eso esta fuente la reemplaza.
// A diferencia de anidb, hianime se puede pedir con un fetch normal: ani-cli lo
// hace con curl a secas, sin WebView ni Cloudflare bridge.
//
// ─── ENDPOINTS (verificados en vivo contra el sitio, igual que ani-cli) ─────
//   GET /search?keyword=<q>                         → HTML con cards .flw-item
//   GET /filter?type=&status=&season=&sy=&ey=&sort=&page=  → HTML de cards
//   GET /genres/<slug>?page=                        → HTML de cards
//   GET /most-popular | /top-airing | /most-favorite → HTML de cards
//   GET /<slug>-<id>                                → detalle
//   GET /api/theme/episode/list/<id>                → {html} con .ep-item (data-number, data-id)
//   GET /api/theme/episode/servers?episodeId=<epId> → {html} con .server-item
//        (data-type sub|dub|hsub, data-server-name, data-hash = base64(embed url))
//   GET <embed>                                     → HTML con  window.__P="<blob>"
//        blob = base64( json XOR "otaku-embed-v1" )  → json.src = master.m3u8
//   GET <master.m3u8>   ¡REQUIERE Referer = origen del embed! (403 sin él)
//
// Solo se entiende el embed de "ZokoAnime" (igual que ani-cli); los otros
// servidores usan otros players.
//
// El id de anime es un slug con el id numérico al final
// ("that-time-i-got-reincarnated-as-a-slime-season-4-2866"). La API de
// episodios quiere SOLO el número final.

const BASE = "https://hianime.at";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const EMBED_KEY = "otaku-embed-v1";
const EMBED_SERVER = "ZokoAnime";
const REQUEST_TIMEOUT = 15000;

// Géneros que ofrece el sitio (slug → nombre mostrado). Se dejaron fuera los
// combos raros del sitio ("drama-action-adventure-animation", etc.).
export const HIANIME_GENRES = {
  action: "Action",
  adventure: "Adventure",
  comedy: "Comedy",
  drama: "Drama",
  ecchi: "Ecchi",
  fantasy: "Fantasy",
  horror: "Horror",
  isekai: "Isekai",
  josei: "Josei",
  "mahou-shoujo": "Mahou Shoujo",
  mecha: "Mecha",
  music: "Music",
  mystery: "Mystery",
  psychological: "Psychological",
  romance: "Romance",
  "sci-fi": "Sci-Fi",
  seinen: "Seinen",
  shoujo: "Shoujo",
  shounen: "Shounen",
  "slice-of-life": "Slice of Life",
  sports: "Sports",
  supernatural: "Supernatural",
  suspense: "Suspense",
  thriller: "Thriller",
  vampire: "Vampire",
};

// valores del <select name="sort"> de /filter
export const HIANIME_SORTS = {
  default: "",
  updated: "updated_date",
  added: "added_date",
  newest: "release_date",
  trending: "trending",
  titleAZ: "title_az",
  score: "avg_score",
  malScore: "mal_score",
  popular: "most_viewed",
  followed: "most_followed",
  episodes: "episode_count",
};

export const HIANIME_TYPES = ["TV", "Movie", "ONA", "OVA", "Special", "Music"];
export const HIANIME_STATUSES = ["Currently Airing", "Finished Airing"];
export const HIANIME_SEASONS = ["winter", "spring", "summer", "fall"];

const STATUS_PARAM = {
  "currently airing": "releasing",
  "finished airing": "completed",
  "not yet aired": "not_yet_aired",
};

// ─── utilidades ─────────────────────────────────────────────────────────────

function decodeEntities(str) {
  if (!str) return str;
  return String(str)
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, "&");
}

const stripTags = (html) =>
  decodeEntities(String(html || "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const numericId = (animeId) => String(animeId).split("-").pop();

async function fetchWithTimeout(url, init = {}) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT) : null;
  try {
    return await fetch(url, {
      ...init,
      headers: { "User-Agent": USER_AGENT, ...(init.headers || {}) },
      signal: controller ? controller.signal : undefined,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function getText(url, headers = {}) {
  const response = await fetchWithTimeout(url, { headers });
  const body = await response.text();
  if (/<title>\s*Just a moment/i.test(body)) {
    throw new Error("hianime está detrás de un challenge de Cloudflare");
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} en ${url}`);
  }
  return body;
}

// Los endpoints /api/theme/... devuelven {status, html}; el html trae los items.
async function getApiHtml(path) {
  const body = await getText(`${BASE}${path}`, { Accept: "application/json" });
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error(`Respuesta no-JSON de ${path}`);
  }
  return String(json?.html || "").replace(/\\/g, "");
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// atob no está garantizado en todos los runtimes de RN, así que se hace a mano.
function base64ToBytes(input) {
  const clean = String(input || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/[^A-Za-z0-9+/]/g, "");
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    buffer = (buffer << 6) | B64.indexOf(clean[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
      buffer &= (1 << bits) - 1;
    }
  }
  return bytes;
}

function bytesToUtf8(bytes) {
  let encoded = "";
  for (let i = 0; i < bytes.length; i++) {
    encoded += "%" + (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
  }
  try {
    return decodeURIComponent(encoded);
  } catch {
    return String.fromCharCode.apply(null, bytes.slice(0, 20000));
  }
}

// el blob del embed es base64(json XOR "otaku-embed-v1"), igual que ani-cli
function deobfuscateBlob(blob) {
  const key = EMBED_KEY;
  const bytes = base64ToBytes(blob).map((b, i) => b ^ key.charCodeAt(i % key.length));
  return JSON.parse(bytesToUtf8(bytes));
}

// ─── parsers de HTML ────────────────────────────────────────────────────────

// Cards del listado (.flw-item). Se corta en el sidebar para no mezclar el top 10.
function parseCards(html) {
  const main = String(html || "").split('id="main-sidebar"')[0];
  const chunks = main.split(/class="flw-item/).slice(1);
  const out = [];
  const seen = {};
  for (const chunk of chunks) {
    const hrefMatch =
      chunk.match(/film-poster-ahref[\s\S]*?href="[^"]*?\/watch\/([a-z0-9-]+-\d+)/i) ||
      chunk.match(/href="[^"]*?\/watch\/([a-z0-9-]+-\d+)/i) ||
      chunk.match(/film-name">\s*<a href="[^"]*?\/([a-z0-9-]+-\d+)"/i);
    if (!hrefMatch) continue;
    const id = hrefMatch[1];
    if (seen[id]) continue;
    seen[id] = true;

    const titleMatch = chunk.match(/film-name">[\s\S]*?title="([^"]*)"/);
    const jnameMatch = chunk.match(/data-jname="([^"]*)"/);
    const imgMatch = chunk.match(/<img[^>]*?(?:data-src|src)="([^"]+)"/);
    const typeMatch = chunk.match(/fdi-item">\s*([A-Za-z]+)\s*</);
    const epsMatch = chunk.match(/tick-eps">\s*(\d+)/);
    const descMatch = chunk.match(/class="description">([\s\S]*?)<\/div>/);

    const title = decodeEntities(titleMatch ? titleMatch[1] : "");
    out.push({
      id,
      title,
      nativeName: decodeEntities(jnameMatch ? jnameMatch[1] : null),
      thumbnail: imgMatch ? imgMatch[1] : null,
      type: typeMatch ? typeMatch[1].toUpperCase() === "MOVIE" ? "Movie" : typeMatch[1] : null,
      episodes: epsMatch ? parseInt(epsMatch[1], 10) : null,
      description: descMatch ? stripTags(descMatch[1]) : null,
    });
  }
  return out;
}

// ¿hay una página siguiente? (links de paginación con ?page=N mayor a la actual)
function hasNextPage(html, currentPage) {
  const pages = [...String(html || "").matchAll(/[?&]page=(\d+)/g)].map((m) => parseInt(m[1], 10));
  return pages.some((p) => p > currentPage);
}

function infoValue(html, head) {
  const re = new RegExp(
    `item-head">\\s*${head}:?\\s*</span>\\s*<span class="name">([\\s\\S]*?)</span>`,
    "i",
  );
  const m = html.match(re);
  return m ? stripTags(m[1]) : null;
}

function infoList(html, head) {
  const re = new RegExp(
    `item-head">\\s*${head}:?\\s*</span>([\\s\\S]*?)</div>`,
    "i",
  );
  const m = html.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/<a [^>]*>([\s\S]*?)<\/a>/g)].map((a) => stripTags(a[1])).filter(Boolean);
}

// ─── servicio ───────────────────────────────────────────────────────────────

const episodeCache = new Map(); // animeId -> { at, episodes }
const EPISODE_CACHE_MS = 2 * 60 * 1000;

class HianimeService {
  /** Compatibilidad con la interfaz anterior (no hay nada que precalentar). */
  static async warmUp() {}

  // ── listados ──
  static async _list(path, page = 1) {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${BASE}${path}${page > 1 ? `${sep}page=${page}` : ""}`;
    logger.debug(`🔍 ${url}`);
    const html = await getText(url);
    const cards = parseCards(html);
    logger.debug(`   ${cards.length} resultados`);
    return { cards, hasNext: hasNextPage(html, page) };
  }

  static async search(query, page = 1) {
    const { cards } = await this._list(`/search?keyword=${encodeURIComponent(query)}`, page);
    return cards;
  }

  /**
   * Catálogo con filtros combinables.
   * @param {{query?:string,type?:string,status?:string,season?:string,year?:number,
   *          genre?:string,sort?:string,page?:number}} params  genre = slug
   * @returns {Promise<{cards:Array, hasNext:boolean}>}
   */
  static async browse(params = {}) {
    const page = params.page || 1;
    const hasFilters =
      params.type || params.status || params.season || params.year || params.sort;

    if (params.query && !hasFilters && !params.genre) {
      return this._list(`/search?keyword=${encodeURIComponent(params.query)}`, page);
    }

    // un género solo se puede combinar con la página /genres/<slug>
    if (params.genre && !hasFilters && !params.query) {
      return this._list(`/genres/${params.genre}`, page);
    }

    const qs = [];
    if (params.query) qs.push(`keyword=${encodeURIComponent(params.query)}`);
    if (params.type) qs.push(`type=${encodeURIComponent(String(params.type).toLowerCase())}`);
    if (params.status) {
      qs.push(
        `status=${STATUS_PARAM[String(params.status).toLowerCase()] || encodeURIComponent(params.status)}`,
      );
    }
    if (params.season) qs.push(`season=${encodeURIComponent(String(params.season).toLowerCase())}`);
    if (params.year) qs.push(`sy=${params.year}&ey=${params.year}`);
    if (params.genre) qs.push(`genres=${encodeURIComponent(params.genre)}`);
    if (params.sort) qs.push(`sort=${encodeURIComponent(params.sort)}`);
    return this._list(`/filter${qs.length ? `?${qs.join("&")}` : ""}`, page);
  }

  static async getTrending(page = 1) {
    return (await this.browse({ sort: HIANIME_SORTS.trending, page })).cards;
  }

  static async getPopular(page = 1) {
    return (await this._list("/most-popular", page)).cards;
  }

  static async getTopAiring(page = 1) {
    return (await this._list("/top-airing", page)).cards;
  }

  static async getMostFavorite(page = 1) {
    return (await this._list("/most-favorite", page)).cards;
  }

  static async getByGenre(genreSlug, { page = 1 } = {}) {
    return (await this._list(`/genres/${genreSlug}`, page)).cards;
  }

  // ── detalle ──
  static async getAnimeDetails(animeId) {
    const html = await getText(`${BASE}/${animeId}`);
    const episodes = await this.getEpisodes(animeId).catch(() => []);

    const head = html.split('class="anisc-info-wrap"')[0];
    const infoHtml = html.split('class="anisc-info-wrap"')[1] || "";
    const titleMatch = head.match(/<h2 class="film-name[^>]*>\s*([\s\S]*?)\s*<\/h2>/);
    const jname = (head.match(/<h2 class="film-name[^>]*data-jname="([^"]*)"/) || [])[1];
    const name = decodeEntities(stripTags(titleMatch ? titleMatch[1] : ""));
    const poster = (head.match(/<img src="([^"]+)"[^>]*class="film-poster-img"/) ||
      head.match(/class="film-poster-img"[^>]*src="([^"]+)"/) || [])[1] || null;
    const banner = (head.match(/anis-cover"[^>]*url\(([^)]+)\)/) || [])[1] || poster;
    const typeMatch = head.match(/tick-eps[\s\S]*?<span class="item">\s*([A-Za-z]+)\s*<\/span>/);
    const overview = (infoHtml.match(/Overview:?\s*<\/span>\s*<div class="text">([\s\S]*?)<\/div>/) || [])[1];

    const aired = infoValue(infoHtml, "Aired") || "";
    const year = (aired.match(/\b(19|20)\d{2}\b/) || [])[0];
    const premiered = infoValue(infoHtml, "Premiered") || "";
    const seasonQ = (premiered.match(/\b(Winter|Spring|Summer|Fall)\b/i) || [])[1];
    const durationMin = parseInt((infoValue(infoHtml, "Duration") || "").replace(/\D/g, ""), 10);
    const score = parseFloat(infoValue(infoHtml, "MAL Score") || "");
    const studios = infoList(infoHtml, "Studios");

    // "More Seasons": otras entradas de la misma serie
    const seasonsBlock = (html.match(/block_area-seasons[\s\S]*?<\/section>/) || [""])[0];
    const seasons = [];
    const seenSeasons = {};
    for (const m of seasonsBlock.matchAll(/<a href="[^"]*?\/([a-z0-9-]+-\d+)"[^>]*class="os-item([^"]*)"[^>]*title="([^"]*)"[\s\S]*?<\/a>/g)) {
      if (seenSeasons[m[1]]) continue;
      seenSeasons[m[1]] = true;
      const label = (m[0].match(/class="title">([\s\S]*?)<\/div>/) || [])[1];
      const poster = (m[0].match(/url\(([^)]+)\)/) || [])[1] || null;
      seasons.push({
        id: m[1],
        name: decodeEntities(m[3]),
        label: label ? stripTags(label) : null,
        thumbnail: poster,
        year: null,
        current: /\bactive\b/.test(m[2]),
      });
    }

    // "Related Anime" (sidebar): lista plana
    const relatedBlock = (html.match(/<h2 class="cat-heading">Related Anime<\/h2>[\s\S]*?<\/ul>/) || [""])[0];
    const related = [];
    const seenRel = {};
    for (const li of relatedBlock.split("<li>").slice(1)) {
      const idm = li.match(/film-name">\s*<a href="[^"]*?\/([a-z0-9-]+-\d+)"[^>]*title="([^"]*)"/);
      if (!idm || seenRel[idm[1]]) continue;
      seenRel[idm[1]] = true;
      related.push({
        id: idm[1],
        name: decodeEntities(idm[2]),
        thumbnail: (li.match(/<img src="([^"]+)"/) || [])[1] || null,
      });
    }

    return {
      id: animeId,
      name: name || null,
      // `title` NO es redundante: isAnimeDataComplete() exige `title` + `id`.
      title: name || null,
      englishName: name || null,
      nativeName: jname ? decodeEntities(jname) : null,
      stats: null,
      description: overview ? stripTags(overview) : null,
      thumbnail: poster,
      banner,
      genres: infoList(infoHtml, "Genres"),
      type: typeMatch
        ? typeMatch[1].toUpperCase() === "MOVIE"
          ? "Movie"
          : typeMatch[1]
        : "TV",
      status: infoValue(infoHtml, "Status"),
      score: Number.isFinite(score) ? score : null,
      studios,
      season: seasonQ && year ? { quarter: seasonQ, year: parseInt(year, 10) } : null,
      airedStart: year ? { year: parseInt(year, 10) } : null,
      episodeCount: episodes.length || null,
      // `episodes` tiene que ser un NÚMERO: generateEpisodesList() itera 1..N.
      episodes: episodes.length,
      seasons,
      relations: related.length ? { Related: related } : {},
      relatedShows: related,
      availableEpisodes: { sub: episodes.length, dub: episodes.length },
      episodeDuration: Number.isFinite(durationMin) ? durationMin * 60000 : null,
    };
  }

  // ── episodios ──
  /** @returns {Promise<Array<{id:number, number:string, title:string|null}>>} */
  static async getEpisodes(animeId) {
    const cached = episodeCache.get(animeId);
    if (cached && Date.now() - cached.at < EPISODE_CACHE_MS) return cached.episodes;

    const html = await getApiHtml(`/api/theme/episode/list/${numericId(animeId)}`);
    const episodes = [];
    const seen = {};
    for (const m of html.matchAll(/<a[^>]*?data-number="([^"]*)"[^>]*?data-id="(\d+)"[^>]*>/g)) {
      if (seen[m[1]]) continue;
      seen[m[1]] = true;
      const title = (m[0].match(/title="([^"]*)"/) || [])[1];
      episodes.push({ id: parseInt(m[2], 10), number: m[1], title: title || null });
    }
    episodes.sort((a, b) => parseFloat(a.number) - parseFloat(b.number));
    logger.debug(`📺 ${episodes.length} episodios de ${animeId}`);
    episodeCache.set(animeId, { at: Date.now(), episodes });
    return episodes;
  }

  /** ["1","2","3"…] ordenados — mismo contrato que siempre. */
  static async getEpisodeNumbers(animeId) {
    return (await this.getEpisodes(animeId)).map((ep) => String(ep.number));
  }

  // ── servidores / audio ──
  /** @returns {Promise<Array<{type:string, server:string, hash:string}>>} */
  static async getServers(episodeId) {
    const html = await getApiHtml(`/api/theme/episode/servers?episodeId=${episodeId}`);
    const servers = [];
    for (const m of html.matchAll(/<div[^>]*server-item[^>]*>/g)) {
      const tag = m[0];
      const type = (tag.match(/data-type="([^"]*)"/) || [])[1];
      const server = (tag.match(/data-server-name="([^"]*)"/) || [])[1];
      const hash = (tag.match(/data-hash="([^"]*)"/) || [])[1];
      if (type && server && hash) servers.push({ type, server, hash });
    }
    return servers;
  }

  static async getEpisodeAudioTypes(animeId, episodeNumber) {
    const episodes = await this.getEpisodes(animeId);
    const episode = episodes.find((ep) => String(ep.number) === String(episodeNumber));
    if (!episode) return [];
    const servers = await this.getServers(episode.id);
    return ["sub", "dub"].filter((t) =>
      servers.some((s) => s.type === t && s.server === EMBED_SERVER),
    );
  }

  // ── video ──
  /**
   * Links del episodio: [{ url, quality, type, source, referer, subtitleUrl }].
   * `referer` es OBLIGATORIO para reproducir/descargar (el CDN responde 403
   * sin él); VideoPlayer y DownloadService lo envían.
   */
  static async getVideoLinks(animeId, episodeNumber, translationType = "sub") {
    const type = translationType === "dub" ? "dub" : "sub";

    const episodes = await this.getEpisodes(animeId);
    const episode = episodes.find((ep) => String(ep.number) === String(episodeNumber));
    if (!episode) {
      logger.warn(`⚠️ Episodio ${episodeNumber} no está en ${animeId}`);
      return [];
    }

    const servers = await this.getServers(episode.id);
    const server = servers.find((s) => s.type === type && s.server === EMBED_SERVER);
    if (!server) {
      logger.warn(`⚠️ Sin servidor ${EMBED_SERVER} (${type}) para ep ${episodeNumber}`);
      return [];
    }

    const embedUrl = bytesToUtf8(base64ToBytes(server.hash)).trim();
    if (!/^https?:\/\//.test(embedUrl)) {
      logger.warn("⚠️ data-hash no decodificó a una URL");
      return [];
    }
    const referer = embedUrl.replace(/^(https?:\/\/[^/]*).*$/, "$1/");

    const embedHtml = await getText(embedUrl);
    const blob = (embedHtml.match(/window\.__P="([^"]*)"/) || [])[1];
    if (!blob) {
      logger.warn("⚠️ El embed no trae window.__P");
      return [];
    }

    let config;
    try {
      config = deobfuscateBlob(blob);
    } catch (error) {
      logger.warn(`⚠️ No se pudo decodificar el blob del embed: ${error.message}`);
      return [];
    }
    const master = config?.src;
    if (!master || !/\.m3u8/.test(master)) {
      logger.warn("⚠️ El embed no trae master.m3u8");
      return [];
    }
    const subs = Array.isArray(config.subtitles) ? config.subtitles : [];
    const subtitleUrl = (subs.find((s) => s.default) || subs[0] || {}).src || null;

    return this.parseMasterPlaylist(master, referer, subtitleUrl);
  }

  /** Descarga el master (con Referer) y devuelve las variantes por calidad. */
  static async parseMasterPlaylist(masterUrl, referer, subtitleUrl = null) {
    const response = await fetchWithTimeout(masterUrl, { headers: { Referer: referer } });
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
        source: "hianime-hls",
        referer,
        subtitleUrl,
      });
    }

    // Sin variantes: el master ya es reproducible tal cual.
    if (links.length === 0) {
      links.push({
        url: masterUrl,
        quality: "auto",
        type: "hls",
        source: "hianime-hls",
        referer,
        subtitleUrl,
      });
    }

    links.sort((a, b) => parseInt(b.quality, 10) - parseInt(a.quality, 10) || 0);
    logger.debug(`🎬 ${links.length} calidades: ${links.map((l) => l.quality).join("/")}`);
    return links;
  }
}

export default HianimeService;
