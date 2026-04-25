const logger = createLogger("api");
import { createLogger } from "../utils/logger";
// services/AnimeDetailsService.js
// Servicio especializado para obtener información detallada de anime

import { API_CONFIG } from "../utils/apiConfig.js";

class AnimeDetailsService {
  /**
   * Obtiene información detallada completa de un anime por su ID
   * @param {string} animeId - ID del anime
   * @returns {Promise<Object>} - Objeto con toda la información del anime
   */
  static async getAnimeDetails(animeId) {
    logger.debug(`🔍 OBTENIENDO DETALLES DE ANIME: ${animeId}`);

    try {
      const query = `query($_id:String!){show(_id:$_id){_id name englishName nativeName thumbnail banner thumbnails description genres tags type status rating isAdult season airedStart airedEnd episodeCount episodeDuration availableEpisodes score averageScore studios countryOfOrigin altNames broadcastInterval prevideos relatedShows relatedMangas lastUpdateEnd lastEpisodeInfo lastEpisodeDate characters musics pageStatus{views likesCount dislikesCount commentCount reviewCount userScoreCount userScoreAverValue}}}`;

      const variables = { _id: animeId };

      logger.debug(
        "📤 REQUEST - getAnimeDetails (POST):",
        `${API_CONFIG.BASE_URL}/api`,
      );

      const response = await fetch(`${API_CONFIG.BASE_URL}/api`, {
        method: "POST",
        headers: API_CONFIG.getHeaders(),
        body: JSON.stringify({ variables, query }),
      });

      logger.debug("📥 getAnimeDetails response status:", response.status);
      const responseText = await response.text();
      logger.debug(
        "📥 getAnimeDetails response raw (primeros 200 chars):",
        responseText.substring(0, 200),
      );

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        logger.error("❌ JSON parse error en getAnimeDetails:", e.message);
        logger.error("Response body:", responseText);
        throw e;
      }

      logger.debug(
        "📥 RESPONSE - getAnimeDetails:",
        JSON.stringify(data).substring(0, 200),
      );

      return this.parseAnimeDetails(data);
    } catch (error) {
      logger.error("❌ ERROR - getAnimeDetails:", error.message);
      throw error;
    }
  }

  /**
   * Parsea la respuesta de la API a un formato más usable
   * @param {Object} data - Respuesta raw de la API
   * @returns {Object} - Objeto parseado con información del anime
   */
  static parseAnimeDetails(data) {
    if (!data || !data.data || !data.data.show) {
      throw new Error("No se encontró información del anime");
    }

    const show = data.data.show;

    // Formatear fechas
    const formatDate = (dateObj) => {
      if (!dateObj || !dateObj.year) return null;
      return {
        year: dateObj.year,
        month: dateObj.month || 1,
        date: dateObj.date || 1,
        hour: dateObj.hour || 0,
        minute: dateObj.minute || 0,
        formatted: `${dateObj.date || 1}/${dateObj.month || 1}/${dateObj.year}`,
      };
    };

    // Formatear duración de episodio
    const formatDuration = (durationMs) => {
      if (!durationMs) return null;
      const minutes = Math.round(parseInt(durationMs) / 1000 / 60);
      return {
        milliseconds: parseInt(durationMs),
        minutes: minutes,
        formatted: `${minutes} min`,
      };
    };

    // Formatear géneros
    const genres = show.genres || [];

    // Formatear temporada
    const season = show.season
      ? {
          quarter: show.season.quarter,
          year: show.season.year,
          formatted: `${show.season.quarter} ${show.season.year}`,
        }
      : null;

    // Formatear episodios disponibles
    const availableEpisodes = show.availableEpisodes || {};
    const episodeCount = show.episodeCount ? parseInt(show.episodeCount) : null;

    // Formatear personajes principales
    const mainCharacters = (show.characters || [])
      .filter((char) => char.role === "Main")
      .map((char) => ({
        name: char.name?.full || "Nombre no disponible",
        nativeName: char.name?.native || null,
        image: char.image?.large || char.image?.medium || null,
        role: char.role,
        aniListId: char.aniListId,
      }));

    // Formatear estudios
    const studios = show.studios || [];

    // Formatear tags
    const tags = show.tags || [];

    // Formatear música (OP/ED)
    const music = {
      openings: (show.musics || [])
        .filter((music) => music.type === "Opening")
        .map((music) => ({
          title: music.title,
          format: music.format,
          url: music.url,
        })),
      endings: (show.musics || [])
        .filter((music) => music.type === "Ending")
        .map((music) => ({
          title: music.title,
          format: music.format,
          url: music.url,
        })),
    };

    // Estadísticas y popularidad
    const stats = show.pageStatus
      ? {
          views: parseInt(show.pageStatus.views) || 0,
          likesCount: parseInt(show.pageStatus.likesCount) || 0,
          dislikesCount: parseInt(show.pageStatus.dislikesCount) || 0,
          commentCount: parseInt(show.pageStatus.commentCount) || 0,
          reviewCount: parseInt(show.pageStatus.reviewCount) || 0,
          userScoreCount: parseInt(show.pageStatus.userScoreCount) || 0,
          userScoreAverage: parseFloat(show.pageStatus.userScoreAverValue) || 0,
        }
      : null;

    return {
      // Información básica
      id: show._id,
      name: show.name,
      englishName: show.englishName,
      nativeName: show.nativeName,
      alternativeNames: show.altNames || [],

      // Imágenes
      thumbnail: show.thumbnail,
      banner: show.banner,
      thumbnails: show.thumbnails || [],

      // Descripción y géneros
      description: show.description,
      genres: genres,
      tags: tags,

      // Tipo y estado
      type: show.type, // TV, OVA, Movie, etc.
      status: show.status, // Releasing, Finished, etc.
      rating: show.rating, // PG-13, etc.
      isAdult: show.isAdult || false,

      // Temporada y fechas
      season: season,
      airedStart: formatDate(show.airedStart),
      airedEnd: formatDate(show.airedEnd),

      // Episodios
      episodeCount: episodeCount,
      episodeDuration: formatDuration(show.episodeDuration),
      availableEpisodes: {
        sub: availableEpisodes.sub || 0,
        dub: availableEpisodes.dub || 0,
        raw: availableEpisodes.raw || 0,
      },
      availableEpisodesDetail: show.availableEpisodesDetail || {},

      // Puntuación
      score: show.score,
      averageScore: show.averageScore,

      // Información de producción
      studios: studios,
      countryOfOrigin: show.countryOfOrigin,

      // Personajes
      characters: mainCharacters,

      // Música
      music: music,

      // Estadísticas
      stats: stats,

      // Información adicional
      broadcastInterval: show.broadcastInterval,
      prevideos: show.prevideos || [], // Trailers/PVs
      relatedShows: show.relatedShows || [],
      relatedMangas: show.relatedMangas || [],

      // Metadata
      lastUpdateEnd: show.lastUpdateEnd,
      lastEpisodeInfo: show.lastEpisodeInfo,
      lastEpisodeDate: show.lastEpisodeDate,
    };
  }

  /**
   * Obtiene un resumen formatado y legible del anime
   * @param {string} animeId - ID del anime
   * @returns {Promise<string>} - Resumen formateado del anime
   */
  static async getAnimeFormattedSummary(animeId) {
    try {
      const details = await this.getAnimeDetails(animeId);

      let summary = `📺 **${details.name}**\n\n`;

      // Títulos alternativos
      if (details.englishName && details.englishName !== details.name) {
        summary += `🇺🇸 Inglés: ${details.englishName}\n`;
      }
      if (details.nativeName && details.nativeName !== details.name) {
        summary += `🇯🇵 Japonés: ${details.nativeName}\n`;
      }
      if (details.alternativeNames.length > 0) {
        summary += `📝 Otros nombres: ${details.alternativeNames
          .slice(0, 3)
          .join(", ")}\n`;
      }

      summary += "\n";

      // Descripción
      if (details.description) {
        const cleanDescription = details.description
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]*>/g, "")
          .replace(/&apos;/g, "'")
          .replace(/&quot;/g, '"')
          .substring(0, 300);
        summary += `📖 **Descripción:**\n${cleanDescription}${
          details.description.length > 300 ? "..." : ""
        }\n\n`;
      }

      // Imagen de portada
      if (details.thumbnail) {
        summary += `🖼️ **Imagen de portada:**\n${details.thumbnail}\n\n`;
      }

      // Géneros
      if (details.genres.length > 0) {
        summary += `🏷️ **Géneros:** ${details.genres.join(", ")}\n\n`;
      }

      // Información de emisión
      summary += `📅 **Emisión:**\n`;
      if (details.airedStart) {
        summary += `• Inicio: ${details.airedStart.formatted}\n`;
      }
      if (details.airedEnd) {
        summary += `• Fin: ${details.airedEnd.formatted}\n`;
      }
      if (details.season) {
        summary += `• Temporada: ${details.season.formatted}\n`;
      }
      if (details.status) {
        const statusText =
          details.status === "Releasing"
            ? "En emisión"
            : details.status === "Finished"
              ? "Finalizado"
              : details.status;
        summary += `• Estado: ${statusText}\n`;
      }

      summary += "\n";

      // Información de episodios
      summary += `🎬 **Episodios:**\n`;
      if (details.episodeDuration) {
        summary += `• Duración aprox.: ${details.episodeDuration.formatted}\n`;
      }
      if (details.episodeCount) {
        summary += `• Total: ${details.episodeCount}\n`;
      }
      if (details.availableEpisodes.sub > 0) {
        summary += `• Disponibles (sub): ${details.availableEpisodes.sub}\n`;
      }
      if (details.availableEpisodes.dub > 0) {
        summary += `• Disponibles (dub): ${details.availableEpisodes.dub}\n`;
      }

      // Puntuación
      if (details.score || details.averageScore) {
        summary += `\n⭐ **Puntuación:**\n`;
        if (details.score) {
          summary += `• AllAnime: ${details.score}/10\n`;
        }
        if (details.averageScore) {
          summary += `• Promedio: ${details.averageScore}/100\n`;
        }
      }

      // Estadísticas
      if (details.stats && details.stats.views > 0) {
        summary += `\n📊 **Popularidad:**\n`;
        summary += `• Vistas: ${details.stats.views.toLocaleString()}\n`;
        if (details.stats.userScoreCount > 0) {
          summary += `• Calificaciones: ${details.stats.userScoreCount} usuarios\n`;
          summary += `• Puntuación usuarios: ${details.stats.userScoreAverage.toFixed(
            1,
          )}/10\n`;
        }
      }

      // Estudios
      if (details.studios.length > 0) {
        summary += `\n🏢 **Estudio:** ${details.studios.join(", ")}\n`;
      }

      return summary;
    } catch (error) {
      logger.error("Error generando resumen:", error);
      throw error;
    }
  }

  /**
   * Obtiene solo la información básica de un anime (más rápido)
   * @param {string} animeId - ID del anime
   * @returns {Promise<Object>} - Información básica del anime
   */
  static async getAnimeBasicInfo(animeId) {
    try {
      const details = await this.getAnimeDetails(animeId);

      return {
        id: details.id,
        name: details.name,
        englishName: details.englishName,
        nativeName: details.nativeName,
        thumbnail: details.thumbnail,
        description: details.description,
        genres: details.genres,
        type: details.type,
        status: details.status,
        score: details.score,
        episodeCount: details.episodeCount,
        availableEpisodes: details.availableEpisodes,
        season: details.season,
      };
    } catch (error) {
      logger.error("Error obteniendo información básica:", error);
      throw error;
    }
  }
}

export default AnimeDetailsService;
