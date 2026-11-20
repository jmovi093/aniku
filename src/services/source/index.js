const logger = createLogger("source");
import { createLogger } from "../../utils/logger";
// services/source/index.js
// Capa de adaptación entre las pantallas y la fuente de anime activa.
//
// Las pantallas importan de acá, y este módulo decide qué fuente usar. Cada
// export replica la firma y la forma de retorno que las pantallas ya esperaban:
//   - cards de catálogo/búsqueda → { id, name, englishName, thumbnail,
//     episodes, type, score, year, description, ... }
//   - lista de episodios         → ["1","2","3"]  (strings ordenados)
//   - episode infos              → { [numero]: { thumbnail, notes, hasSub, hasDub } }
//   - links de video             → [{ url, quality, type, source, referer }]
//
// ─── ESTADO ─────────────────────────────────────────────────────────────────
// FUENTE ACTIVA: hianime (la misma que usa ani-cli desde su PR #1897).
// anidb.app murió (redirige a otro sitio) y quedó reemplazada; AnidbService.js
// y los servicios de AllAnime siguen en el repo solo como REFERENCIA.
// Ver HianimeService.js para el mapeo de endpoints.
//
// Huecos conocidos de hianime: no hay calendario semanal (/schedule da 404),
// ni thumbnails/títulos por episodio, y la búsqueda por texto solo trae una
// página de resultados.

import { appConfig } from "../../config";
import AllAnimeService from "../AnimeService";
import AllAnimeCatalogService from "../CatalogService";
import AllAnimeDetailsService from "../AnimeDetailsService";
import AllAnimeScheduleService from "../ScheduleService";
import { GENRES as ALLANIME_GENRES, SEASONS as ALLANIME_SEASONS } from "../../utils/apiConfig";
import HianimeService, {
  HIANIME_GENRES,
  HIANIME_SORTS,
  HIANIME_STATUSES,
  HIANIME_TYPES,
} from "../HianimeService";

const SOURCE = appConfig.source;

/**
 * Taxonomía de la fuente activa, para que la UI de filtros ofrezca EXACTAMENTE
 * lo que la fuente entiende.
 */
const HianimeTaxonomy = {
  genres: Object.values(HIANIME_GENRES),
  seasons: ["Winter", "Spring", "Summer", "Fall"],
  types: HIANIME_TYPES,
  statuses: HIANIME_STATUSES,
  years: Array.from(
    { length: new Date().getFullYear() + 1 - 2006 + 1 },
    (_, i) => new Date().getFullYear() + 1 - i,
  ),
  sorts: [
    { value: HIANIME_SORTS.trending, label: "Trending" },
    { value: HIANIME_SORTS.score, label: "Top Rated" },
    { value: HIANIME_SORTS.updated, label: "Latest Updated" },
    { value: HIANIME_SORTS.popular, label: "Most Watched" },
    { value: HIANIME_SORTS.followed, label: "Most Followed" },
    { value: HIANIME_SORTS.titleAZ, label: "Title A-Z" },
    { value: HIANIME_SORTS.newest, label: "Newest First" },
  ],
  // /genres/<slug> admite un solo género; si el usuario elige varios se
  // aplica el primero.
  supportsMultiGenre: false,
};

const genreSlug = (genreName) => {
  const entry = Object.entries(HIANIME_GENRES).find(
    ([, name]) => name.toLowerCase() === String(genreName).toLowerCase(),
  );
  return entry ? entry[0] : null;
};

// ─── normalización de cards ─────────────────────────────────────────────────
function toCard(item) {
  return {
    id: item.id,
    name: item.title,
    // algunos consumidores (isAnimeDataComplete) miran `title`, no `name`
    title: item.title,
    englishName: item.title,
    nativeName: item.nativeName || null,
    thumbnail: item.thumbnail,
    episodes: item.episodes ?? null,
    description: item.description || null,
    score: null,
    type: item.type || "TV",
    year: null,
    season: null,
    episodeCount: item.episodes ?? null,
    airedStart: null,
    views: null,
  };
}

const toCards = (list) => (Array.isArray(list) ? list.map(toCard) : []);

// ─── catálogo (pantalla Home) ───────────────────────────────────────────────
const HianimeCatalog = {
  async getPopularDaily(limit = 20) {
    return toCards(await HianimeService.getTrending()).slice(0, limit);
  },

  async getPopularWeekly(limit = 20) {
    return toCards(await HianimeService.getPopular()).slice(0, limit);
  },

  async getPopularMonthly(limit = 20) {
    return toCards(await HianimeService.getMostFavorite()).slice(0, limit);
  },

  async getCurrentSeasonAnime(limit = 26) {
    return toCards(await HianimeService.getTopAiring()).slice(0, limit);
  },

  async getAnimeByGenre(genreName, limit = 26, page = 1) {
    const slug = genreSlug(genreName);
    if (!slug) {
      logger.warn(`⚠️ Género desconocido en hianime: ${genreName}`);
      return [];
    }
    return toCards(await HianimeService.getByGenre(slug, { page })).slice(0, limit);
  },

  getActionAnime(limit = 26, page = 1) {
    return this.getAnimeByGenre("Action", limit, page);
  },
  getRomanceAnime(limit = 26, page = 1) {
    return this.getAnimeByGenre("Romance", limit, page);
  },
  getComedyAnime(limit = 26, page = 1) {
    return this.getAnimeByGenre("Comedy", limit, page);
  },
  getDramaAnime(limit = 26, page = 1) {
    return this.getAnimeByGenre("Drama", limit, page);
  },
  getFantasyAnime(limit = 26, page = 1) {
    return this.getAnimeByGenre("Fantasy", limit, page);
  },

  getAvailableGenres() {
    return Object.values(HIANIME_GENRES);
  },
};

// ─── búsqueda, detalle, episodios y video ───────────────────────────────────
const HianimeAnime = {
  async searchAnime(query, limit = 26, page = 1) {
    return toCards(await HianimeService.search(query, page)).slice(0, limit);
  },

  /**
   * Búsqueda con filtros.
   *
   * ⚠️ CONTRATO: devuelve `{ results, pagination }`, NO un array. La pantalla
   * Search hace `const { results, pagination } = await ...`.
   */
  async searchAnimeAdvanced(filters = {}, limit = 26, page = 1) {
    const params = { query: filters.query || filters.search || "", page };

    if (filters.type) params.type = filters.type;
    if (filters.season) params.season = String(filters.season).toLowerCase();
    if (filters.year) params.year = filters.year;

    // La UI ofrece "Top" y "Recent" (ver SORT_OPTIONS en AdvancedSearchFilters).
    const sortBy = filters.sortBy || filters.sort;
    if (sortBy) {
      params.sort =
        { Top: HIANIME_SORTS.score, Recent: HIANIME_SORTS.updated }[sortBy] ||
        Object.values(HIANIME_SORTS).find((v) => v && v === sortBy) ||
        undefined;
    }

    if (filters.status) {
      params.status = /airing|emision|emisión/i.test(filters.status)
        ? "Currently Airing"
        : "Finished Airing";
    }

    const genreName = Array.isArray(filters.genres) ? filters.genres[0] : filters.genre;
    if (genreName) {
      const slug = genreSlug(genreName);
      if (slug) params.genre = slug;
    }

    const { cards, hasNext } = await HianimeService.browse(params);
    const results = toCards(cards).slice(0, limit);

    // hianime no expone un total de resultados: se devuelve una COTA INFERIOR
    // que solo alimenta la condición de "cargar más" del hook.
    return {
      results,
      pagination: {
        total: hasNext ? page * limit + 1 : (page - 1) * limit + results.length,
        currentResults: results.length,
        hasNextPage: hasNext,
        currentPage: page,
        totalPages: hasNext ? page + 1 : page,
      },
    };
  },

  async getAnimeDetails(animeId) {
    return HianimeService.getAnimeDetails(animeId);
  },

  async getEpisodesList(animeId) {
    return HianimeService.getEpisodeNumbers(animeId);
  },

  /**
   * hianime NO tiene títulos ni thumbnails por episodio. Se devuelve el mapa
   * sin thumbnail/notes: la UI ya trata ambos como opcionales.
   */
  async getEpisodeInfos(animeId) {
    const infoMap = {};
    try {
      const episodes = await HianimeService.getEpisodes(animeId);
      episodes.forEach((ep) => {
        infoMap[ep.number] = {
          thumbnail: null,
          notes: null,
          filler: false,
          hasSub: true,
          hasDub: false,
        };
      });
    } catch (error) {
      logger.warn(`⚠️ episode infos: ${error.message}`);
    }
    return infoMap;
  },

  /**
   * Audios disponibles para un episodio (para el selector sub/dub del player).
   * Si solo hay uno, la UI oculta el selector.
   * @returns {Promise<Array<{value:"sub"|"dub", label:string, code:string}>>}
   */
  async getEpisodeAudioOptions(animeId, episodeNumber) {
    try {
      const types = await HianimeService.getEpisodeAudioTypes(animeId, episodeNumber);
      const options = [];
      if (types.includes("sub")) {
        options.push({ value: "sub", label: "Sub (japonés)", code: "jpn" });
      }
      if (types.includes("dub")) {
        options.push({ value: "dub", label: "Dub (inglés)", code: "eng" });
      }
      return options;
    } catch (error) {
      logger.warn(`⚠️ audios del episodio: ${error.message}`);
      return [];
    }
  },

  async getOptimizedVideoLinks(animeId, episodeString, translationType = "sub") {
    const links = await HianimeService.getVideoLinks(
      animeId,
      episodeString,
      translationType,
    );
    if (!links || links.length === 0) {
      throw new Error("No se encontraron enlaces para este episodio");
    }
    return links;
  },

  async getBestDownloadUrl(animeId, episodeString, translationType = "sub") {
    const links = await this.getOptimizedVideoLinks(
      animeId,
      episodeString,
      translationType,
    );
    // Todo es HLS: se devuelve la mejor calidad.
    return links[0];
  },
};

// ─── detalle (componente AnimeDetails) ──────────────────────────────────────
const HianimeDetails = {
  getAnimeDetails: (animeId) => HianimeService.getAnimeDetails(animeId),
};

// ─── calendario ─────────────────────────────────────────────────────────────
const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const HianimeSchedule = {
  /** Últimos 7 días hasta hoy — lógica de fechas pura, igual que antes. */
  getAvailableDays() {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const idx = date.getDay();
      days.push({
        name: DAY_NAMES[idx],
        shortName: DAY_SHORT[idx],
        date,
        isToday: date.toDateString() === today.toDateString(),
        dayIndex: idx,
      });
    }
    return days;
  },

  /**
   * hianime no publica calendario de emisión (/schedule → 404). Como
   * aproximación, HOY se muestran los animes en emisión actualizados más
   * recientemente; los demás días quedan vacíos.
   */
  async getAnimesForWeekday(dayName) {
    const target = DAY_NAMES.indexOf(String(dayName).toLowerCase());
    if (target === -1 || target !== new Date().getDay()) return [];

    const { cards } = await HianimeService.browse({
      status: "Currently Airing",
      sort: HIANIME_SORTS.updated,
    });
    return cards.map((c) => ({
      ...toCard(c),
      episodes: c.episodes || 0,
      airingAt: null,
      episodeName: null,
    }));
  },
};

// ─── AllAnime / mkissa (fuente "mkissa") ────────────────────────────────────
// Los servicios viejos (AnimeService/CatalogService/…) ya hablan el contrato que
// esperan las pantallas; solo faltan las piezas que se agregaron después de la
// migración: el selector de audio y la taxonomía de filtros.
const AllAnimeAnime = Object.assign(Object.create(AllAnimeService), {
  // AllAnime no expone qué audios tiene cada episodio sin otra query; se deja
  // vacío (la UI oculta el selector y usa sub). Sub/dub sigue funcionando si se
  // pide explícitamente translationType.
  async getEpisodeAudioOptions() {
    return [];
  },
});

const AllAnimeTaxonomy = {
  genres: ALLANIME_GENRES,
  seasons: ALLANIME_SEASONS,
  years: AllAnimeCatalogService.getAvailableYears(),
  supportsMultiGenre: true,
};

// ─── selección de fuente ────────────────────────────────────────────────────
// appConfig.source: "mkissa" (AllAnime, api.allanime.day + api.mkissa.net)
//                   "hianime" (la de ani-cli).
const useAllAnime = SOURCE === "mkissa";

export const SourceTaxonomy = useAllAnime ? AllAnimeTaxonomy : HianimeTaxonomy;
export const CatalogSource = useAllAnime ? AllAnimeCatalogService : HianimeCatalog;
export const AnimeSource = useAllAnime ? AllAnimeAnime : HianimeAnime;
export const DetailsSource = useAllAnime ? AllAnimeDetailsService : HianimeDetails;
export const ScheduleSource = useAllAnime ? AllAnimeScheduleService : HianimeSchedule;

logger.debug(`🌐 Fuente activa: ${SOURCE}`);

export default { CatalogSource, AnimeSource, DetailsSource, ScheduleSource };
