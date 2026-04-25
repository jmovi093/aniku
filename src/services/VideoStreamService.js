const logger = createLogger("player");
import { createLogger } from "../utils/logger";
/**
 * VideoStreamService
 *
 * Servicio wrapper para obtener enlaces de video usando el pipeline optimizado
 * existente de AnimeService. Reutiliza toda la lógica probada y funcional.
 */

import AnimeService from "./AnimeService";

class VideoStreamService {
  /**
   * Obtiene enlaces de video para un episodio específico usando el pipeline optimizado
   * @param {string} animeId - ID del anime
   * @param {string|number} episodeNumber - Número del episodio
   * @param {string} translationType - Tipo de traducción ('sub', 'dub')
   * @returns {Promise<Array>} Enlaces de video válidos y ordenados
   */
  static async getVideoLinksForEpisode(
    animeId,
    episodeNumber,
    translationType = "sub",
    { silent = false } = {},
  ) {
    try {
      if (!silent)
        logger.debug(
          `🎥 VideoStreamService: Obteniendo enlaces para anime ${animeId}, episodio ${episodeNumber}`,
        );

      // Usar el pipeline optimizado existente de AnimeService
      const videoLinks = await AnimeService.getOptimizedVideoLinks(
        animeId,
        episodeNumber.toString(),
        translationType,
      );

      logger.debug(
        `🎥 VideoStreamService: Pipeline completado con ${videoLinks.length} enlaces`,
      );

      if (!videoLinks || videoLinks.length === 0) {
        throw new Error("No se encontraron enlaces de video válidos");
      }

      // Transformar al formato esperado por el Player (si es necesario)
      const formattedLinks = videoLinks.map((link) => ({
        server: link.source || link.provider || "Servidor",
        url: link.url,
        quality: this.detectQuality(link),
        type: this.detectServerType(link),
        source: link.source,
        provider: link.provider,
        priority: link.priority || 0,
        contentLength: link.contentLength,
        validatedAt: link.validatedAt,
      }));

      logger.debug(
        `🎥 VideoStreamService: Enlaces formateados: ${formattedLinks.length}`,
      );
      logger.debug(
        `🎥 VideoStreamService: Mejor enlace: ${formattedLinks[0]?.server} (${formattedLinks[0]?.type})`,
      );

      return formattedLinks;
    } catch (error) {
      if (!silent) logger.error(`❌ VideoStreamService Error:`, error);
      throw error;
    }
  }

  /**
   * Detecta la calidad del video basada en el enlace
   * @param {Object} link - Objeto del enlace
   * @returns {string} Calidad detectada
   */
  static detectQuality(link) {
    const url = link.url || "";
    const source = link.source || "";

    // YouTube tiene calidad automática
    if (source === "youtube") return "Auto (YouTube)";

    // Detectar por URL
    if (url.includes("1080") || url.includes("FHD")) return "1080p";
    if (url.includes("720") || url.includes("HD")) return "720p";
    if (url.includes("480")) return "480p";
    if (url.includes("360")) return "360p";

    // Detectar por tamaño de archivo (aproximado)
    if (link.contentLength) {
      const sizeMB = link.contentLength / (1024 * 1024);
      if (sizeMB > 800) return "1080p (estimado)";
      if (sizeMB > 400) return "720p (estimado)";
      if (sizeMB > 200) return "480p (estimado)";
      return "360p (estimado)";
    }

    return "Auto";
  }

  /**
   * Detecta el tipo de servidor basado en el enlace
   * @param {Object} link - Objeto del enlace
   * @returns {string} Tipo de servidor
   */
  static detectServerType(link) {
    const source = link.source || "";
    const provider = link.provider || "";
    const url = link.url || "";

    // Mapeo de sources conocidos
    const sourceMapping = {
      youtube: "YouTube",
      wixmp: "Wix Media",
      sharepoint: "SharePoint",
      googlevideo: "Google Video",
      fembed: "Fembed",
      streamtape: "StreamTape",
      mega: "MEGA",
      okru: "OK.ru",
      blogger: "Blogger",
    };

    if (sourceMapping[source]) {
      return sourceMapping[source];
    }

    // Detectar por provider
    if (provider && provider !== source) {
      return provider.charAt(0).toUpperCase() + provider.slice(1);
    }

    // Detectar por URL
    if (url.includes("youtube.com") || url.includes("youtu.be"))
      return "YouTube";
    if (url.includes("fembed") || url.includes("femax")) return "Fembed";
    if (url.includes("streamtape")) return "StreamTape";
    if (url.includes("mega.nz")) return "MEGA";
    if (url.includes("ok.ru")) return "OK.ru";
    if (url.includes("blogger.com")) return "Blogger";
    if (url.includes("wixmp.com")) return "Wix Media";
    if (url.includes("sharepoint.com")) return "SharePoint";

    return source || provider || "Servidor";
  }

  /**
   * Valida si un enlace de video es accesible (wrapper del pipeline existente)
   * @param {string} url - URL a validar
   * @returns {Promise<boolean>} True si es accesible
   */
  static async validateVideoLink(url) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        timeout: 5000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
          Referer: "https://allmanga.to",
        },
      });
      return response.ok;
    } catch (error) {
      logger.error(`🎥 VideoStreamService: Error validando enlace:`, error);
      return false;
    }
  }

  /**
   * Obtiene múltiples enlaces de episodios en paralelo (para pre-carga)
   * @param {string} animeId - ID del anime
   * @param {Array<string|number>} episodeNumbers - Array de números de episodios
   * @param {string} translationType - Tipo de traducción
   * @returns {Promise<Object>} Objeto con episodios como keys y enlaces como values
   */
  static async getMultipleEpisodeLinks(
    animeId,
    episodeNumbers,
    translationType = "sub",
  ) {
    logger.debug(
      `🎥 VideoStreamService: Pre-cargando ${episodeNumbers.length} episodios`,
    );

    const promises = episodeNumbers.map(async (episode) => {
      try {
        const links = await this.getVideoLinksForEpisode(
          animeId,
          episode,
          translationType,
        );
        return { episode, links, success: true };
      } catch (error) {
        logger.error(
          `🎥 VideoStreamService: Error pre-cargando episodio ${episode}:`,
          error,
        );
        return { episode, links: [], success: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(promises);
    const episodeLinks = {};

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const { episode, links, success } = result.value;
        episodeLinks[episode] = { links, success };
      } else {
        episodeLinks[episodeNumbers[index]] = {
          links: [],
          success: false,
          error: result.reason?.message || "Error desconocido",
        };
      }
    });

    logger.debug(
      `🎥 VideoStreamService: Pre-carga completada para ${
        Object.keys(episodeLinks).length
      } episodios`,
    );
    return episodeLinks;
  }
}

export default VideoStreamService;
