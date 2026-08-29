const logger = createLogger("source");
import { createLogger } from "../../utils/logger";
// services/source/index.js
// Capa de adaptación entre las pantallas y la fuente de anime activa.
//
// ─── POR QUÉ EXISTE ─────────────────────────────────────────────────────────
// Las pantallas antes importaban AnimeService/CatalogService/ScheduleService
// (AllAnime) directamente. Ahora importan de acá, y este módulo decide qué
// fuente usar. Así cambiar de proveedor es una constante, no una refactor.
//
// Cada export replica EXACTAMENTE la firma y la forma de retorno que las
// pantallas ya esperaban con AllAnime, para no tener que tocar componentes:
//   - cards de catálogo/búsqueda → { id, name, englishName, thumbnail,
//     episodes, type, score, year, description, ... }
//   - lista de episodios         → ["1","2","3"]  (strings ordenados)
//   - episode infos              → { [numero]: { thumbnail, notes, hasSub, hasDub } }
//   - links de video             → [{ url, quality, type, source }]
//
// ─── ESTADO ─────────────────────────────────────────────────────────────────
// FUENTE ACTIVA: anidb.app (la misma que ani-cli v5).
// AllAnime/mkissa quedó DESCONECTADO a propósito: sus servicios siguen en
// `src/services/AnimeService.js`, `CatalogService.js`, `ScheduleService.js` y
// `AnimeDetailsService.js` como REFERENCIA (no los borres), pero ya nadie los
// importa. Para volver a ellos hay que reconectarlos acá.
//
// Ver `.claude/ANIDB-SOURCE.md` para el mapeo completo de endpoints y los
// huecos conocidos de esta fuente.

import { appConfig } from "../../config";
import AnidbService, { ANIDB_GENRES, ANIDB_SORTS } from "../AnidbService";

const SOURCE = appConfig.source;

// ─── normalización de cards ─────────────────────────────────────────────────
// anidb devuelve { id, title, thumbnail }; la UI espera los campos de AllAnime.
// Los que anidb no da a nivel de listado quedan en null/0 — la UI ya los trata
// como opcionales (se llenan al abrir el detalle).
function toCard(item) {
  return {
    id: item.id,
    name: item.title,
    englishName: item.title,
    nativeName: null,
    thumbnail: item.thumbnail,
    episodes: 0,
    description: null,
    score: null,
    type: "TV",
    year: null,
    season: null,
    episodeCount: null,
    airedStart: null,
    views: null,
  };
}

const toCards = (list) => (Array.isArray(list) ? list.map(toCard) : []);

// ─── catálogo (pantalla Home) ───────────────────────────────────────────────
export const CatalogSource = {
  // anidb no distingue "daily/weekly": su ranking de trending es uno solo.
  // Se mapea daily→trending y weekly→popular para que Home siga teniendo dos
  // carruseles distintos y con contenido diferente.
  async getPopularDaily(limit = 20) {
    return toCards(await AnidbService.getTrending()).slice(0, limit);
  },

  async getPopularWeekly(limit = 20) {
    return toCards(await AnidbService.getPopular()).slice(0, limit);
  },

  async getPopularMonthly(limit = 20) {
    return toCards(
      await AnidbService.browse({ sort: ANIDB_SORTS.top }),
    ).slice(0, limit);
  },

  async getCurrentSeasonAnime(limit = 26) {
    const now = new Date();
    const quarter = ["winter", "winter", "spring", "spring", "spring", "summer",
      "summer", "summer", "fall", "fall", "fall", "winter"][now.getMonth()];
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    return toCards(
      await AnidbService.browse({
        season: quarter,
        year,
        sort: ANIDB_SORTS.popular,
      }),
    ).slice(0, limit);
  },

  async getAnimeByGenre(genreName, limit = 26, page = 1) {
    const entry = Object.entries(ANIDB_GENRES).find(
      ([, name]) => name.toLowerCase() === String(genreName).toLowerCase(),
    );
    if (!entry) {
      logger.warn(`⚠️ Género desconocido en anidb: ${genreName}`);
      return [];
    }
    return toCards(
      await AnidbService.getByGenre(entry[0], { page }),
    ).slice(0, limit);
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
    return Object.values(ANIDB_GENRES);
  },
};

// ─── búsqueda, detalle, episodios y video ───────────────────────────────────
export const AnimeSource = {
  async searchAnime(query, limit = 26, page = 1) {
    return toCards(await AnidbService.search(query, page)).slice(0, limit);
  },

  /**
   * Búsqueda con filtros. Mapea los filtros que ya usaba la pantalla Search a
   * los parámetros de /browse de anidb.
   */
  async searchAnimeAdvanced(filters = {}, limit = 26, page = 1) {
    const params = { query: filters.query || filters.search || "", page };

    if (filters.type) params.type = filters.type;
    if (filters.season) params.season = String(filters.season).toLowerCase();
    if (filters.year) params.year = filters.year;
    if (filters.sort) params.sort = filters.sort;

    if (filters.status) {
      params.status = /airing|emision|emisión/i.test(filters.status)
        ? "Currently Airing"
        : "Finished Airing";
    }

    const genreName = Array.isArray(filters.genres) ? filters.genres[0] : filters.genre;
    if (genreName) {
      const entry = Object.entries(ANIDB_GENRES).find(
        ([, name]) => name.toLowerCase() === String(genreName).toLowerCase(),
      );
      if (entry) params.genre = entry[0];
    }

    return toCards(await AnidbService.browse(params)).slice(0, limit);
  },

  async getAnimeDetails(animeId) {
    return AnidbService.getAnimeDetails(animeId);
  },

  async getEpisodesList(animeId) {
    return AnidbService.getEpisodeNumbers(animeId);
  },

  /**
   * anidb NO tiene títulos ni thumbnails por episodio (su API solo devuelve
   * {id, number, number2, filler}). Se devuelve el mapa con `filler` y sin
   * thumbnail/notes: la UI ya trata ambos como opcionales.
   * Ver el hueco documentado en .claude/ANIDB-SOURCE.md.
   */
  async getEpisodeInfos(animeId) {
    const infoMap = {};
    try {
      const episodes = await AnidbService.getEpisodes(animeId);
      episodes.forEach((ep) => {
        infoMap[ep.number] = {
          thumbnail: null,
          notes: null,
          filler: ep.filler,
          hasSub: true,
          hasDub: false,
        };
      });
    } catch (error) {
      logger.warn(`⚠️ episode infos: ${error.message}`);
    }
    return infoMap;
  },

  async getOptimizedVideoLinks(animeId, episodeString, translationType = "sub") {
    const links = await AnidbService.getVideoLinks(
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
    // Sin mp4 directo en anidb: todo es HLS. Se devuelve la mejor calidad.
    return links[0];
  },
};

// ─── detalle (componente AnimeDetails) ──────────────────────────────────────
export const DetailsSource = {
  getAnimeDetails: (animeId) => AnidbService.getAnimeDetails(animeId),
};

// ─── calendario ─────────────────────────────────────────────────────────────
const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// YYYY-MM-DD en hora LOCAL. No usar toISOString(): eso pasa a UTC y puede
// correr el día (de noche en América daría el día siguiente).
function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Zona del dispositivo, para que anidb corte los días donde el usuario los ve.
function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export const ScheduleSource = {
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
   * anidb devuelve el calendario POR DÍA:
   *   /api/frontend/schedule?date=YYYY-MM-DD&tz=<IANA>
   * Así que se resuelve la fecha concreta de ese día de la semana (dentro de la
   * ventana de 7 días que muestra la pantalla) y se pide ese día puntual.
   */
  async getAnimesForWeekday(dayName) {
    const target = DAY_NAMES.indexOf(String(dayName).toLowerCase());
    if (target === -1) return [];

    const day = this.getAvailableDays().find((d) => d.dayIndex === target);
    if (!day) return [];

    const schedules = await AnidbService.getSchedule(
      toLocalDateString(day.date),
      deviceTimeZone(),
    );

    return schedules.map((s) => {
      const idMatch = String(s.anime_url || "").match(/\/anime\/([a-z0-9-]+-\d+)/i);
      return {
        id: idMatch ? idMatch[1] : String(s.anime_id),
        name: s.anime_title,
        englishName: s.anime_title,
        thumbnail: s.anime_poster,
        episodes: 0,
        description: null,
        score: null,
        type: "TV",
        airingAt: s.airing_at,
        episodeName: s.episode_name,
      };
    });
  },
};

logger.debug(`🌐 Fuente activa: ${SOURCE}`);

export default { CatalogSource, AnimeSource, DetailsSource, ScheduleSource };
