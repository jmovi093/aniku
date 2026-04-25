const logger = createLogger("catalog");
import { createLogger } from "../utils/logger";
// services/CatalogService.js
// Servicio especializado para catálogos (trending, temporadas, géneros)

import axios from "axios";
import { API_CONFIG, GENRES, SEASONS } from "../utils/apiConfig.js";

class CatalogService {
  /**
   * TRENDING / POPULAR
   */

  /**
   * Obtiene anime trending diario
   * @param {number} limit - Número de resultados (default: 20)
   * @returns {Promise<Array>} - Array de anime trending
   */
  static async getPopularDaily(limit = 20) {
    logger.debug("🔍 INICIANDO getPopularDaily con limit:", limit);

    try {
      const variables = {
        type: "anime",
        size: limit,
        dateRange: 1, // 1 = daily
        page: 1,
        allowAdult: false,
        allowUnknown: false,
      };

      const response = await this.fetchTrending(variables);

      return this.parseTrendingResults(response.data);
    } catch (error) {
      logger.error("❌ ERROR - getPopularDaily:", error.message);
      throw error;
    }
  }

  /**
   * Obtiene anime trending semanal
   * @param {number} limit - Número de resultados (default: 20)
   * @returns {Promise<Array>} - Array de anime trending
   */
  static async getPopularWeekly(limit = 20) {
    logger.debug("🔍 INICIANDO getPopularWeekly con limit:", limit);

    try {
      const variables = {
        type: "anime",
        size: limit,
        dateRange: 7, // 7 = weekly
        page: 1,
        allowAdult: false,
        allowUnknown: false,
      };

      const response = await this.fetchTrending(variables);

      return this.parseTrendingResults(response.data);
    } catch (error) {
      logger.error("❌ ERROR - getPopularWeekly:", error.message);
      throw error;
    }
  }

  /**
   * Obtiene anime trending mensual
   * @param {number} limit - Número de resultados (default: 20)
   * @returns {Promise<Array>} - Array de anime trending
   */
  static async getPopularMonthly(limit = 20) {
    logger.debug("🔍 INICIANDO getPopularMonthly con limit:", limit);

    try {
      const variables = {
        type: "anime",
        size: limit,
        dateRange: 30, // 30 = monthly
        page: 1,
        allowAdult: false,
        allowUnknown: false,
      };

      const response = await this.fetchTrending(variables);

      return this.parseTrendingResults(response.data);
    } catch (error) {
      logger.error("Error getting monthly trending:", error);
      throw error;
    }
  }

  /**
   * TEMPORADAS
   */

  /**
   * Obtiene anime de la temporada actual
   * @param {number} limit - Número de resultados (default: 26)
   * @param {number} page - Página para paginación (default: 1)
   * @returns {Promise<Array>} - Array de anime de temporada
   */
  static async getCurrentSeasonAnime(limit = 26, page = 1) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11

    let season;
    if (currentMonth >= 0 && currentMonth <= 2)
      season = "Winter"; // Ener-Mar
    else if (currentMonth >= 3 && currentMonth <= 5)
      season = "Spring"; // Abr-Jun
    else if (currentMonth >= 6 && currentMonth <= 8)
      season = "Summer"; // Jul-Sep
    else season = "Fall"; // Oct-Dic

    return this.getAnimeBySeason(season, currentYear, limit, page);
  }

  /**
   * Obtiene anime por temporada específica
   * @param {string} season - Temporada ("Winter", "Spring", "Summer", "Fall")
   * @param {number} year - Año
   * @param {number} limit - Número de resultados (default: 26)
   * @param {number} page - Página para paginación (default: 1)
   * @returns {Promise<Array>} - Array de anime de temporada
   */
  static async getAnimeBySeason(season, year, limit = 26, page = 1) {
    logger.debug(
      `🔍 INICIANDO getAnimeBySeason: ${season} ${year}, limit: ${limit}, page: ${page}`,
    );

    try {
      const variables = {
        search: {
          season: season,
          year: year,
        },
        limit: limit,
        page: page,
        translationType: "sub",
        countryOrigin: "JP",
      };

      const response = await this.fetchCatalog(variables);

      return this.parseSeasonResults(response.data);
    } catch (error) {
      logger.error(
        `❌ ERROR - getAnimeBySeason (${season} ${year}) - Página ${page}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * GÉNEROS
   */

  /**
   * Obtiene anime por género específico
   * @param {string} genre - Género del anime
   * @param {number} limit - Número de resultados (default: 26)
   * @param {number} page - Página para paginación (default: 1)
   * @returns {Promise<Array>} - Array de anime del género
   */
  static async getAnimeByGenre(genre, limit = 26, page = 1) {
    logger.debug(
      `🔍 INICIANDO getAnimeByGenre: ${genre}, limit: ${limit}, page: ${page}`,
    );

    try {
      const variables = {
        search: {
          genres: [genre],
        },
        limit: limit,
        page: page,
        translationType: "sub",
        countryOrigin: "JP",
      };

      const response = await this.fetchCatalog(variables);

      return this.parseGenreResults(response.data);
    } catch (error) {
      logger.error(
        `❌ ERROR - getAnimeByGenre (${genre}) - Página ${page}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Obtiene anime de múltiples géneros
   * @param {Array} genres - Array de géneros (se ordenarán alfabéticamente)
   * @param {number} limit - Número de resultados (default: 26)
   * @param {number} page - Página para paginación (default: 1)
   * @returns {Promise<Array>} - Array de anime de los géneros
   */
  static async getAnimeByMultipleGenres(genres, limit = 26, page = 1) {
    try {
      // Ordenar alfabéticamente
      const sortedGenres = [...genres].sort();

      const variables = {
        search: {
          genres: sortedGenres,
        },
        limit: limit,
        page: page,
        translationType: "sub",
        countryOrigin: "JP",
      };

      const response = await this.fetchCatalog(variables);

      return this.parseGenreResults(response.data);
    } catch (error) {
      logger.error(`Error getting multiple genres anime:`, error.message);
      throw error;
    }
  }

  /**
   * MÉTODOS DE CONVENIENCIA PARA GÉNEROS POPULARES
   */

  static async getActionAnime(limit = 26, page = 1) {
    return this.getAnimeByGenre("Action", limit, page);
  }

  static async getRomanceAnime(limit = 26, page = 1) {
    return this.getAnimeByGenre("Romance", limit, page);
  }

  static async getComedyAnime(limit = 26, page = 1) {
    return this.getAnimeByGenre("Comedy", limit, page);
  }

  static async getDramaAnime(limit = 26, page = 1) {
    return this.getAnimeByGenre("Drama", limit, page);
  }

  static async getFantasyAnime(limit = 26, page = 1) {
    return this.getAnimeByGenre("Fantasy", limit, page);
  }

  static async getIsekaiAnime(limit = 26, page = 1) {
    return this.getAnimeByGenre("Isekai", limit, page);
  }

  static async getShounenAnime(limit = 26, page = 1) {
    return this.getAnimeByGenre("Shounen", limit, page);
  }

  static async getSliceOfLifeAnime(limit = 26, page = 1) {
    return this.getAnimeByGenre("Slice of Life", limit, page);
  }

  /**
   * Combinaciones populares de géneros
   */
  static async getActionAdventureAnime(limit = 26, page = 1) {
    return this.getAnimeByMultipleGenres(["Action", "Adventure"], limit, page);
  }

  static async getRomanceComedyAnime(limit = 26, page = 1) {
    return this.getAnimeByMultipleGenres(["Comedy", "Romance"], limit, page); // ✅ Orden alfabético
  }

  static async getSciFantasyAnime(limit = 26, page = 1) {
    return this.getAnimeByMultipleGenres(["Fantasy", "Sci-Fi"], limit, page); // ✅ Orden alfabético
  }

  /**
   * FETCH HELPERS
   */

  static async fetchCatalog(variables) {
    const query = `query($search:SearchInput,$limit:Int,$page:Int,$translationType:VaildTranslationTypeEnumType,$countryOrigin:VaildCountryOriginEnumType){shows(search:$search,limit:$limit,page:$page,translationType:$translationType,countryOrigin:$countryOrigin){pageInfo{total}edges{_id name englishName nativeName thumbnail description score season type episodeCount airedStart availableEpisodes}}}`;

    logger.debug("📤 fetchCatalog POST to", `${API_CONFIG.BASE_URL}/api`);

    const response = await fetch(`${API_CONFIG.BASE_URL}/api`, {
      method: "POST",
      headers: API_CONFIG.getHeaders(),
      body: JSON.stringify({ variables, query }),
    });

    logger.debug("📥 fetchCatalog response status:", response.status);
    const responseText = await response.text();
    logger.debug(
      "📥 fetchCatalog response raw (primeros 200 chars):",
      responseText.substring(0, 200),
    );

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      logger.error("❌ JSON parse error en fetchCatalog:", e.message);
      logger.error("Response body:", responseText);
      throw e;
    }
    logger.debug(
      "📥 fetchCatalog response:",
      JSON.stringify(data).substring(0, 200),
    );
    return { data };
  }
  static async fetchTrending(variables) {
    const query = `query($type:VaildPopularTypeEnumType!,$size:Int!,$dateRange:Int!,$page:Int!,$allowAdult:Boolean!,$allowUnknown:Boolean!){queryPopular(type:$type,size:$size,dateRange:$dateRange,page:$page,allowAdult:$allowAdult,allowUnknown:$allowUnknown){total recommendations{anyCard{_id name englishName nativeName thumbnail description score airedStart availableEpisodes}pageStatus{views rangeViews}}}}`;

    logger.debug("📤 fetchTrending POST to", `${API_CONFIG.BASE_URL}/api`);

    const response = await fetch(`${API_CONFIG.BASE_URL}/api`, {
      method: "POST",
      headers: API_CONFIG.getHeaders(),
      body: JSON.stringify({ variables, query }),
    });

    logger.debug("📥 fetchTrending response status:", response.status);
    const responseText = await response.text();
    logger.debug(
      "📥 fetchTrending response raw (primeros 200 chars):",
      responseText.substring(0, 200),
    );

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      logger.error("❌ JSON parse error en fetchTrending:", e.message);
      logger.error("Response body:", responseText);
      throw e;
    }
    logger.debug(
      "📥 fetchTrending response:",
      JSON.stringify(data).substring(0, 200),
    );
    return { data };
  }
  /**
   * PARSERS
   */

  static parseTrendingResults(data) {
    if (!data?.data?.queryPopular?.recommendations) return [];

    return data.data.queryPopular.recommendations.map((rec) => ({
      id: rec.anyCard._id,
      name: rec.anyCard.name,
      englishName: rec.anyCard.englishName,
      nativeName: rec.anyCard.nativeName,
      episodes: rec.anyCard.availableEpisodes?.sub || 0,
      thumbnail: rec.anyCard.thumbnail,
      description: rec.anyCard.description,
      score: rec.anyCard.score,
      airedStart: rec.anyCard.airedStart,
      views: rec.pageStatus?.views || null,
      rangeViews: rec.pageStatus?.rangeViews || null,
    }));
  }

  static parseSeasonResults(data) {
    if (!data || !data.data || !data.data.shows || !data.data.shows.edges) {
      return [];
    }

    return data.data.shows.edges.map((edge) => ({
      id: edge._id,
      name: edge.name,
      englishName: edge.englishName,
      nativeName: edge.nativeName,
      episodes: edge.availableEpisodes?.sub || 0,
      thumbnail: edge.thumbnail,
      description: edge.description,
      score: edge.score,
      season: edge.season,
      type: edge.type,
      episodeCount: edge.episodeCount,
      airedStart: edge.airedStart,
    }));
  }

  static parseGenreResults(data) {
    // Mismo parser que temporadas ya que usan la misma estructura
    return this.parseSeasonResults(data);
  }

  /**
   * UTILIDADES
   */

  /**
   * Obtiene información de paginación de la respuesta
   * @param {Object} data - Respuesta raw de la API
   * @returns {Object} - Información de paginación
   */
  static getPaginationInfo(data) {
    if (!data || !data.data || !data.data.shows || !data.data.shows.pageInfo) {
      return {
        total: 0,
        hasNextPage: false,
        currentPage: 1,
        totalPages: 1,
      };
    }

    const pageInfo = data.data.shows.pageInfo;
    const currentResults = data.data.shows.edges
      ? data.data.shows.edges.length
      : 0;

    return {
      total: pageInfo.total || 0,
      currentResults: currentResults,
      hasNextPage: currentResults >= 26, // Si hay 26 resultados, probablemente hay más
      currentPage: pageInfo.currentPage || 1,
      totalPages: Math.ceil((pageInfo.total || 0) / 26),
    };
  }

  /**
   * Obtiene todos los géneros disponibles
   * @returns {Array} - Array de géneros disponibles
   */
  static getAvailableGenres() {
    return GENRES;
  }

  /**
   * Obtiene todas las temporadas disponibles
   * @returns {Array} - Array de temporadas disponibles
   */
  static getAvailableSeasons() {
    return SEASONS;
  }

  /**
   * Obtiene años disponibles (últimos 10 años + próximo)
   * @returns {Array} - Array de años disponibles
   */
  static getAvailableYears() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear + 1; i >= currentYear - 10; i--) {
      years.push(i);
    }
    return years;
  }
}

export default CatalogService;
