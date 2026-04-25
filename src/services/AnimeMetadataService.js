const logger = createLogger("api");
import { createLogger } from "../utils/logger";
/**
 * AnimeMetadataService
 *
 * Servicio para obtener y cachear metadatos de anime (thumbnail, detalles, etc.)
 * Optimizado para navegación directa al Player desde la tab "Viendo".
 */

import AnimeDetailsService from "./AnimeDetailsService";

class AnimeMetadataService {
  // Cache en memoria para metadatos
  static cache = new Map();
  static cacheTimeout = 5 * 60 * 1000; // 5 minutos

  /**
   * Obtiene metadatos completos de un anime con cache
   * @param {string} animeId - ID del anime
   * @returns {Promise<Object>} Metadatos del anime
   */
  static async getAnimeMetadata(animeId) {
    try {
      logger.debug(
        `📋 AnimeMetadataService: Obteniendo metadatos para ${animeId}`
      );

      // Verificar cache
      const cached = this.getCachedMetadata(animeId);
      if (cached) {
        logger.debug(`📋 AnimeMetadataService: Usando metadatos desde cache`);
        return cached;
      }

      // Obtener metadatos frescos
      const metadata = await this.fetchAnimeMetadata(animeId);

      // Guardar en cache
      this.setCachedMetadata(animeId, metadata);

      return metadata;
    } catch (error) {
      logger.error(`❌ AnimeMetadataService Error:`, error);

      // Retornar metadatos mínimos en caso de error
      return {
        thumbnail: null,
        title: "Anime",
        description: "",
        status: "Desconocido",
      };
    }
  }

  /**
   * Obtiene metadatos desde la API
   * @param {string} animeId - ID del anime
   * @returns {Promise<Object>} Metadatos obtenidos
   */
  static async fetchAnimeMetadata(animeId) {
    try {
      logger.debug(
        `📋 AnimeMetadataService: Fetching desde API para ${animeId}`
      );

      // Usar AnimeDetailsService para obtener detalles
      const animeDetails = await AnimeDetailsService.getAnimeDetails(animeId);

      if (!animeDetails) {
        throw new Error("No se pudieron obtener detalles del anime");
      }

      // Extraer metadatos relevantes
      const metadata = {
        thumbnail: animeDetails.thumbnail || animeDetails.image || null,
        title: animeDetails.title || animeDetails.name || "Anime",
        description: animeDetails.description || animeDetails.synopsis || "",
        status: animeDetails.status || "Desconocido",
        type: animeDetails.type || "Anime",
        year: animeDetails.year || null,
        genres: animeDetails.genres || [],
        rating: animeDetails.rating || null,
        episodes: animeDetails.episodes || [],
        totalEpisodes:
          animeDetails.totalEpisodes || animeDetails.episodes?.length || 0,
      };

      logger.debug(`📋 AnimeMetadataService: Metadatos obtenidos:`, {
        title: metadata.title,
        thumbnail: metadata.thumbnail ? "Sí" : "No",
        totalEpisodes: metadata.totalEpisodes,
      });

      return metadata;
    } catch (error) {
      logger.error(
        `📋 AnimeMetadataService: Error fetching metadatos:`,
        error
      );
      throw error;
    }
  }

  /**
   * Obtiene metadatos desde cache si están disponibles y válidos
   * @param {string} animeId - ID del anime
   * @returns {Object|null} Metadatos cacheados o null
   */
  static getCachedMetadata(animeId) {
    const cached = this.cache.get(animeId);

    if (!cached) {
      return null;
    }

    // Verificar si el cache expiró
    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      logger.debug(`📋 AnimeMetadataService: Cache expirado para ${animeId}`);
      this.cache.delete(animeId);
      return null;
    }

    return cached.metadata;
  }

  /**
   * Guarda metadatos en cache
   * @param {string} animeId - ID del anime
   * @param {Object} metadata - Metadatos a cachear
   */
  static setCachedMetadata(animeId, metadata) {
    this.cache.set(animeId, {
      metadata,
      timestamp: Date.now(),
    });

    logger.debug(`📋 AnimeMetadataService: Metadatos cacheados para ${animeId}`);

    // Limpiar cache viejo si tiene muchas entradas
    this.cleanupCache();
  }

  /**
   * Limpia entradas viejas del cache
   */
  static cleanupCache() {
    const maxEntries = 50;

    if (this.cache.size <= maxEntries) {
      return;
    }

    logger.debug(
      `📋 AnimeMetadataService: Limpiando cache (${this.cache.size} entradas)`
    );

    const now = Date.now();
    const entriesToDelete = [];

    // Encontrar entradas expiradas
    for (const [animeId, data] of this.cache.entries()) {
      if (now - data.timestamp > this.cacheTimeout) {
        entriesToDelete.push(animeId);
      }
    }

    // Eliminar entradas expiradas
    entriesToDelete.forEach((animeId) => this.cache.delete(animeId));

    // Si aún hay muchas entradas, eliminar las más viejas
    if (this.cache.size > maxEntries) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toDelete = entries.slice(0, entries.length - maxEntries);
      toDelete.forEach(([animeId]) => this.cache.delete(animeId));
    }

    logger.debug(
      `📋 AnimeMetadataService: Cache limpiado (${this.cache.size} entradas restantes)`
    );
  }

  /**
   * Limpia todo el cache
   */
  static clearCache() {
    this.cache.clear();
    logger.debug(`📋 AnimeMetadataService: Cache completamente limpiado`);
  }

  /**
   * Pre-carga metadatos para múltiples animes (optimización)
   * @param {Array<string>} animeIds - IDs de animes a pre-cargar
   */
  static async preloadMetadata(animeIds) {
    logger.debug(
      `📋 AnimeMetadataService: Pre-cargando metadatos para ${animeIds.length} animes`
    );

    const promises = animeIds.map((animeId) =>
      this.getAnimeMetadata(animeId).catch((error) => {
        logger.error(
          `📋 AnimeMetadataService: Error pre-cargando ${animeId}:`,
          error
        );
        return null;
      })
    );

    await Promise.allSettled(promises);
    logger.debug(`📋 AnimeMetadataService: Pre-carga completada`);
  }
}

export default AnimeMetadataService;
