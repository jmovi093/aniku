const logger = createLogger("player");
import { createLogger } from "../utils/logger";
// services/VideoService.js (OPTIMIZADO)
// Servicio especializado con procesamiento paralelo y timeouts optimizados

import axios from "axios";
import { API_CONFIG } from "../utils/apiConfig.js";

// Cache para JSON procesados
const jsonCache = new Map();
const JSON_CACHE_TIMEOUT = 300000; // 5 minutos

class VideoService {
  /**
   * 🚀 OPTIMIZACIÓN CRÍTICA: getVideoLinks con timeouts y mejor error handling
   */
  static async getVideoLinks(providerUrl) {
    logger.debug(`📡 PROCESANDO PROVIDER: ${providerUrl.substring(0, 50)}...`);

    // Manejo especial para YouTube (inmediato)
    if (providerUrl.includes("tools.fast4speed.rsvp")) {
      logger.debug("🎬 YOUTUBE PROVIDER - ENLACE DIRECTO");
      return [
        {
          url: providerUrl.startsWith("http")
            ? providerUrl
            : `https://${API_CONFIG.ALLANIME_BASE}${providerUrl}`,
          quality: "auto",
          type: "youtube",
          source: "youtube",
          requiresReferer: true,
        },
      ];
    }

    // Construir URL absoluta correctamente (evita doble-prefijo si ya es https://)
    const fullUrl = providerUrl.startsWith("http")
      ? providerUrl
      : `https://${API_CONFIG.ALLANIME_BASE}${providerUrl}`;

    const isClockEndpoint = providerUrl.includes("/clock.json");

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        logger.debug(
          `⏰ TIMEOUT para provider: ${providerUrl.substring(0, 30)}...`,
        );
        controller.abort();
      }, 8000);

      const response = await axios.get(fullUrl, {
        headers: API_CONFIG.getHeaders(),
        signal: controller.signal,
        timeout: 8000,
      });

      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      logger.debug(
        `📡 RESPONSE RECIBIDO en ${elapsed}ms - Size: ${JSON.stringify(response.data).length}`,
      );

      // clock.json devuelve los streams directamente — no pasar por processJsonLinksParallel
      if (isClockEndpoint) {
        const responseStr = JSON.stringify(response.data);
        logger.debug(
          `🕐 CLOCK.JSON RAW (primeros 300 chars): ${responseStr.substring(0, 300)}`,
        );
        const links = this.extractLinksFromJson(responseStr);
        logger.debug(`🕐 CLOCK.JSON: ${links.length} enlaces extraídos`);
        return this.filterLinksForAndroid(links);
      }

      const initialLinks = this.parseVideoLinks(response.data, providerUrl);
      logger.debug(`🔍 LINKS INICIALES PARSEADOS: ${initialLinks.length}`);

      const processedLinks = await this.processJsonLinksParallel(initialLinks);

      const totalElapsed = Date.now() - startTime;
      logger.debug(
        `✅ PROVIDER COMPLETADO en ${totalElapsed}ms: ${processedLinks.length} enlaces finales`,
      );

      return processedLinks;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      logger.debug(
        `❌ PROVIDER FAILED después de ${elapsed}ms: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * 🚀 NUEVA OPTIMIZACIÓN: Procesa múltiples enlaces JSON en paralelo
   */
  static async processJsonLinksParallel(initialLinks) {
    const jsonLinks = initialLinks.filter(
      (link) => link.url && link.url.includes(".json"),
    );
    const nonJsonLinks = initialLinks.filter(
      (link) => !link.url || !link.url.includes(".json"),
    );

    if (jsonLinks.length === 0) {
      return nonJsonLinks;
    }

    logger.debug(`🔄 PROCESANDO ${jsonLinks.length} ENLACES JSON EN PARALELO`);

    // Procesar todos los JSON links en paralelo
    const jsonProcessingPromises = jsonLinks.map(async (link, index) => {
      try {
        logger.debug(
          `   📄 [${index + 1}] Procesando JSON: ${link.url.substring(0, 50)}...`,
        );

        const jsonLinksResult = await this.processJsonLink(link.url);

        if (jsonLinksResult.length > 0) {
          logger.debug(
            `   ✅ [${index + 1}] JSON procesado: ${jsonLinksResult.length} enlaces`,
          );
          return jsonLinksResult.map((jsonLink) => ({
            ...link,
            url: jsonLink.url,
            quality: `${link.quality}-${jsonLink.quality}`,
            type: jsonLink.type,
            isProcessedFromJson: true,
          }));
        } else {
          logger.debug(
            `   ⚠️ [${index + 1}] JSON sin enlaces válidos, manteniendo original`,
          );
          return [link];
        }
      } catch (error) {
        logger.debug(
          `   ❌ [${index + 1}] Error procesando JSON: ${error.message}`,
        );
        return [link]; // Mantener enlace original si falla
      }
    });

    // Esperar a que todos los JSON se procesen
    const jsonResults = await Promise.all(jsonProcessingPromises);
    const flattenedJsonLinks = jsonResults.flat();

    return [...nonJsonLinks, ...flattenedJsonLinks];
  }

  /**
   * 🚀 OPTIMIZACIÓN: processJsonLink con cache y timeout mejorado
   */
  static async processJsonLink(jsonUrl) {
    // Verificar cache
    const cached = jsonCache.get(jsonUrl);
    if (cached && Date.now() - cached.timestamp < JSON_CACHE_TIMEOUT) {
      logger.debug("💾 USANDO JSON DESDE CACHE");
      return cached.data;
    }

    logger.debug(`📄 PROCESANDO JSON LINK: ${jsonUrl.substring(0, 50)}...`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await axios.get(jsonUrl, {
        headers: {
          "User-Agent": API_CONFIG.USER_AGENT,
          Referer: `https://${API_CONFIG.ALLANIME_BASE}/`,
        },
        signal: controller.signal,
        timeout: 6000,
      });

      clearTimeout(timeoutId);

      const responseStr = JSON.stringify(response.data);
      logger.debug(`📄 JSON RESPONSE: ${responseStr.length} caracteres`);

      const extractedLinks = this.extractLinksFromJson(responseStr);

      // Guardar en cache
      jsonCache.set(jsonUrl, {
        data: extractedLinks,
        timestamp: Date.now(),
      });

      logger.debug(`📄 ENLACES EXTRAÍDOS DEL JSON: ${extractedLinks.length}`);
      return extractedLinks;
    } catch (error) {
      logger.debug(`❌ Error procesando JSON: ${error.message}`);
      return [];
    }
  }

  /**
   * 🚀 OPTIMIZACIÓN: Extracción de enlaces más eficiente
   */
  static extractLinksFromJson(responseStr) {
    const extractedLinks = [];

    // Patrón 1: link + resolutionStr (más común en ani-cli)
    const linkPattern = /"link":"([^"]*)".*?"resolutionStr":"([^"]*)"/g;
    let match;

    while (
      (match = linkPattern.exec(responseStr)) !== null &&
      extractedLinks.length < 20
    ) {
      const rawUrl = match[1];
      const cleanUrl = rawUrl.replace(/\\u002F/g, "/").replace(/\\/g, "");
      const quality = match[2];

      if (cleanUrl && quality) {
        extractedLinks.push({
          url: cleanUrl,
          quality: quality,
          type: this.getVideoType(cleanUrl),
          source: "json-link-pattern",
        });
      }
    }

    // Patrón 2: hls + url con hardsub en-US
    const hlsPattern = /"hls","url":"([^"]*)".*?"hardsub_lang":"en-US"/g;

    while (
      (match = hlsPattern.exec(responseStr)) !== null &&
      extractedLinks.length < 30
    ) {
      const rawUrl = match[1];
      const cleanUrl = rawUrl.replace(/\\u002F/g, "/").replace(/\\/g, "");

      if (cleanUrl && !extractedLinks.some((link) => link.url === cleanUrl)) {
        extractedLinks.push({
          url: cleanUrl,
          quality: "auto",
          type: "m3u8",
          source: "json-hls-pattern",
        });
      }
    }

    // Patrón 3: URLs de video directo (limitado para evitar spam)
    const directVideoPattern = /"([^"]*(?:\.mp4|\.m3u8|\.avi|\.mkv)[^"]*)"/g;

    while (
      (match = directVideoPattern.exec(responseStr)) !== null &&
      extractedLinks.length < 40
    ) {
      const rawUrl = match[1];
      const cleanUrl = rawUrl.replace(/\\u002F/g, "/").replace(/\\/g, "");

      // Evitar duplicados y URLs muy cortas
      if (
        cleanUrl &&
        cleanUrl.length > 20 &&
        !extractedLinks.some((link) => link.url === cleanUrl)
      ) {
        extractedLinks.push({
          url: cleanUrl,
          quality: "direct",
          type: this.getVideoType(cleanUrl),
          source: "json-direct-pattern",
        });
      }
    }

    return extractedLinks;
  }

  /**
   * 🚀 OPTIMIZACIÓN: parseVideoLinks mejorado con límites
   */
  static parseVideoLinks(responseData, providerUrl) {
    const links = [];

    try {
      const responseStr = JSON.stringify(responseData);
      const responseSize = responseStr.length;

      logger.debug(`🔍 PARSING RESPONSE: ${responseSize} caracteres`);

      // Buscar enlaces con link y resolutionStr (wixmp style)
      const linkMatches = responseStr.match(
        /"link":"([^"]*)".*?"resolutionStr":"([^"]*)"/g,
      );
      if (linkMatches) {
        logger.debug(`📺 WIXMP LINKS encontrados: ${linkMatches.length}`);

        // Limitar a 10 enlaces para evitar procesamiento excesivo
        const limitedMatches = linkMatches.slice(0, 10);

        limitedMatches.forEach((match) => {
          const linkMatch = match.match(
            /"link":"([^"]*)".*?"resolutionStr":"([^"]*)"/,
          );
          if (linkMatch) {
            const rawLink = linkMatch[1];
            const link = rawLink.replace(/\\u002F/g, "/").replace(/\\/g, "");
            const quality = linkMatch[2];

            if (link && quality) {
              links.push({
                url: link,
                quality: quality,
                type: this.getVideoType(link),
                source: "wixmp",
                rawUrl: rawLink,
              });
            }
          }
        });
      }

      // Buscar enlaces HLS (m3u8)
      const hlsMatches = responseStr.match(
        /"hls","url":"([^"]*)".*?"hardsub_lang":"en-US"/g,
      );
      if (hlsMatches) {
        logger.debug(`🎞️ HLS LINKS encontrados: ${hlsMatches.length}`);

        // Limitar a 5 enlaces HLS
        const limitedHlsMatches = hlsMatches.slice(0, 5);

        limitedHlsMatches.forEach((match) => {
          const hlsMatch = match.match(/"url":"([^"]*)"/);
          if (hlsMatch) {
            const rawLink = hlsMatch[1];
            const link = rawLink.replace(/\\u002F/g, "/").replace(/\\/g, "");

            links.push({
              url: link,
              quality: "auto",
              type: "m3u8",
              source: "hls",
              rawUrl: rawLink,
            });
          }
        });
      }

      logger.debug(`📊 LINKS PARSEADOS: ${links.length}`);

      // Filtrar para Android con optimizaciones
      const filteredLinks = this.filterLinksForAndroid(links);
      logger.debug(`📊 LINKS DESPUÉS DE FILTRAR: ${filteredLinks.length}`);

      return filteredLinks;
    } catch (error) {
      logger.error(`❌ ERROR PARSING: ${error.message}`);
      return [];
    }
  }

  /**
   * 🚀 OPTIMIZACIÓN: Filtro para Android más eficiente
   */
  static filterLinksForAndroid(links) {
    logger.debug("🤖 APLICANDO FILTROS ANDROID...");

    // Pre-filtrar enlaces obviamente inválidos
    const preFiltered = links.filter((link) => {
      if (!link.url || link.url.length < 10) return false;
      if (link.url.includes("cc>")) return false; // Soft subs problemáticos
      if (link.url.includes("m3u8_refr >")) return false; // m3u8_refr problemático
      if (link.source === "youtube" && link.url.includes("Yt >")) return false;
      return true;
    });

    // Ordenar por preferencia optimizada
    const sorted = preFiltered.sort((a, b) => {
      // 1. MP4 antes que m3u8 para Android
      const typeScore = (type) => {
        if (type === "mp4") return 3;
        if (type === "youtube") return 2;
        if (type === "m3u8") return 1;
        return 0;
      };

      const typeA = typeScore(a.type);
      const typeB = typeScore(b.type);
      if (typeA !== typeB) return typeB - typeA;

      // 2. Por calidad
      const qualityA = this.getQualityNumber(a.quality);
      const qualityB = this.getQualityNumber(b.quality);
      if (qualityA !== qualityB) return qualityB - qualityA;

      // 3. Por source
      const sourceOrder = { youtube: 4, wixmp: 3, sharepoint: 2, hls: 1 };
      const sourceA = sourceOrder[a.source] || 0;
      const sourceB = sourceOrder[b.source] || 0;
      return sourceB - sourceA;
    });

    // Limitar a 15 enlaces máximo para evitar validación excesiva
    const limited = sorted.slice(0, 15);

    logger.debug(`📈 ORDEN FINAL ANDROID: ${limited.length} enlaces`);
    limited.forEach((link, index) => {
      if (index < 5) {
        // Solo mostrar los primeros 5 en logs
        logger.debug(
          `   ${index + 1}. ${link.quality} ${link.type} ${link.source}`,
        );
      }
    });

    return limited;
  }

  /**
   * Métodos auxiliares optimizados
   */
  static getVideoType(url) {
    if (!url) return "mp4";
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes(".m3u8")) return "m3u8";
    if (lowerUrl.includes(".mp4")) return "mp4";
    if (lowerUrl.includes("youtube") || lowerUrl.includes("youtu.be"))
      return "youtube";
    return "mp4";
  }

  static getQualityNumber(quality) {
    if (quality === "auto") return 9999;
    if (quality === "direct") return 8888;
    const match = quality.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Limpia el cache de JSON
   */
  static clearJsonCache() {
    jsonCache.clear();
    logger.debug("🧹 JSON cache limpiado");
  }
}

export default VideoService;
