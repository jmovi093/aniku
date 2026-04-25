const logger = createLogger("api");
import { createLogger } from "../utils/logger";
// services/AnimeService.js
// Servicio principal para funciones core de anime (búsqueda, episodios)

import axios from "axios";
import CryptoJS from "crypto-js";
import { API_CONFIG, PROVIDER_MAPPING } from "../utils/apiConfig.js";
import { filterProviders } from "../utils/urlDecoder.js";
import VideoService from "./VideoService.js";
import CatalogService from "./CatalogService.js";

const ALLANIME_KEY_HEX = CryptoJS.SHA256("Xot36i3lK3:v1").toString(
  CryptoJS.enc.Hex,
);

function safeJsonParse(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeDecodedSourceUrls(decodedPayload) {
  let sourceUrls = [];

  if (Array.isArray(decodedPayload)) {
    sourceUrls = decodedPayload;
  } else if (Array.isArray(decodedPayload?.sourceUrls)) {
    sourceUrls = decodedPayload.sourceUrls;
  } else if (Array.isArray(decodedPayload?.episode?.sourceUrls)) {
    sourceUrls = decodedPayload.episode.sourceUrls;
  }

  return sourceUrls.filter(
    (source) =>
      source &&
      typeof source.sourceName === "string" &&
      typeof source.sourceUrl === "string",
  );
}

function extractSourceUrlsFromParsedPayload(parsedPayload) {
  if (!parsedPayload) {
    return [];
  }

  const direct = normalizeDecodedSourceUrls(parsedPayload);
  if (direct.length > 0) {
    return direct;
  }

  const sourceUrlsAsString = parsedPayload?.sourceUrls;
  if (typeof sourceUrlsAsString === "string") {
    const nestedSourceUrls = safeJsonParse(sourceUrlsAsString);
    const nestedNormalized = normalizeDecodedSourceUrls(nestedSourceUrls);
    if (nestedNormalized.length > 0) {
      return nestedNormalized;
    }
  }

  const episodeSourceUrlsAsString = parsedPayload?.episode?.sourceUrls;
  if (typeof episodeSourceUrlsAsString === "string") {
    const nestedEpisodeSourceUrls = safeJsonParse(episodeSourceUrlsAsString);
    const nestedEpisodeNormalized = normalizeDecodedSourceUrls(
      nestedEpisodeSourceUrls,
    );
    if (nestedEpisodeNormalized.length > 0) {
      return nestedEpisodeNormalized;
    }
  }

  return [];
}

function extractSourceUrlsFromPlaintext(plaintext) {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    return [];
  }

  const sources = [];
  const regex = /"sourceUrl":"(--[^\"]+)"[^{}]*?"sourceName":"([^\"]+)"/g;
  let match;

  while ((match = regex.exec(plaintext)) !== null) {
    const [, sourceUrl, sourceName] = match;
    sources.push({ sourceUrl, sourceName });
  }

  return sources;
}

function normalizeBase64(input) {
  if (typeof input !== "string") {
    return "";
  }

  const normalized = input.replace(/-/g, "+").replace(/_/g, "/").trim();
  const remainder = normalized.length % 4;
  if (remainder === 0) {
    return normalized;
  }

  return normalized + "=".repeat(4 - remainder);
}

function wordArrayToByteArray(wordArray) {
  const bytes = [];
  const { words, sigBytes } = wordArray;

  for (let i = 0; i < sigBytes; i++) {
    const word = words[i >>> 2];
    const shift = 24 - (i % 4) * 8;
    bytes.push((word >>> shift) & 0xff);
  }

  return bytes;
}

function byteArrayToWordArray(bytes) {
  const words = [];

  for (let i = 0; i < bytes.length; i++) {
    const wordIndex = i >>> 2;
    words[wordIndex] = words[wordIndex] || 0;
    words[wordIndex] |= (bytes[i] & 0xff) << (24 - (i % 4) * 8);
  }

  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

function incrementCounter(counterBytes) {
  for (let i = counterBytes.length - 1; i >= 0; i--) {
    counterBytes[i] = (counterBytes[i] + 1) & 0xff;
    if (counterBytes[i] !== 0) {
      break;
    }
  }
}

function decodePlaintextBytes(plainBytes) {
  const plainWordArray = byteArrayToWordArray(plainBytes);

  try {
    const utf8 = CryptoJS.enc.Utf8.stringify(plainWordArray);
    if (utf8 && utf8.length > 0) {
      return utf8;
    }
  } catch {
    // Fallback a Latin1 para payloads con bytes fuera de UTF-8 estricto.
  }

  return CryptoJS.enc.Latin1.stringify(plainWordArray);
}

function decryptCtrOpenSslCompat(cipherHex, keyHex, counterHex) {
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const counter = wordArrayToByteArray(CryptoJS.enc.Hex.parse(counterHex));
  const cipherBytes = wordArrayToByteArray(CryptoJS.enc.Hex.parse(cipherHex));
  const plainBytes = [];

  for (let offset = 0; offset < cipherBytes.length; offset += 16) {
    const block = cipherBytes.slice(offset, offset + 16);

    const keystream = CryptoJS.AES.encrypt(byteArrayToWordArray(counter), key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.NoPadding,
    }).ciphertext;

    const keystreamBytes = wordArrayToByteArray(keystream);
    const plainBlock = block.map((byte, index) => byte ^ keystreamBytes[index]);
    plainBytes.push(...plainBlock);

    incrementCounter(counter);
  }

  return decodePlaintextBytes(plainBytes);
}

function decryptTobeparsedSourceUrls(blob) {
  if (typeof blob !== "string" || blob.length === 0) {
    return [];
  }

  try {
    const normalizedBlob = normalizeBase64(blob);
    const payloadHex = CryptoJS.enc.Base64.parse(normalizedBlob).toString(
      CryptoJS.enc.Hex,
    );
    if (!payloadHex || payloadHex.length < (1 + 12 + 16) * 2) {
      return [];
    }

    // Formato actual de AllAnime: 1 byte de prefijo, 12 bytes de IV, ciphertext, 16 bytes de tag.
    const ivHex = payloadHex.slice(2, 26);
    const counterHex = `${ivHex}00000002`;
    const cipherHexEnd = payloadHex.length - 32;
    const cipherHex = payloadHex.slice(26, cipherHexEnd);

    if (cipherHex.length <= 0 || cipherHex.length % 2 !== 0) {
      return [];
    }

    const plaintext = decryptCtrOpenSslCompat(
      cipherHex,
      ALLANIME_KEY_HEX,
      counterHex,
    ).replace(/\0+$/g, "");

    if (!plaintext) {
      logger.warn("⚠️ tobeparsed descifrado vacío");
      return [];
    }

    const parsed = safeJsonParse(plaintext);

    if (parsed) {
      const parsedSourceUrls = extractSourceUrlsFromParsedPayload(parsed);
      if (parsedSourceUrls.length > 0) {
        return parsedSourceUrls;
      }
    }

    const regexSourceUrls = extractSourceUrlsFromPlaintext(plaintext);
    if (regexSourceUrls.length > 0) {
      return regexSourceUrls;
    }

    logger.warn(
      `⚠️ tobeparsed descifrado, pero sin sourceUrls parseables (plain_len=${plaintext.length})`,
    );
    return [];
  } catch (error) {
    logger.warn(`⚠️ Error decodificando tobeparsed: ${error.message}`);
    return [];
  }
}

function findTobeparsedBlob(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (typeof value.tobeparsed === "string" && value.tobeparsed.length > 0) {
    return value.tobeparsed;
  }

  if (typeof value.sourceUrls === "string") {
    const parsed = safeJsonParse(value.sourceUrls);
    if (
      typeof parsed?.tobeparsed === "string" &&
      parsed.tobeparsed.length > 0
    ) {
      return parsed.tobeparsed;
    }
  }

  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || typeof current !== "object") {
      continue;
    }

    if (
      typeof current.tobeparsed === "string" &&
      current.tobeparsed.length > 0
    ) {
      return current.tobeparsed;
    }

    for (const nestedValue of Object.values(current)) {
      if (nestedValue && typeof nestedValue === "object") {
        stack.push(nestedValue);
      }
    }
  }

  return null;
}

// ─── Caché de providers por episodio ────────────────────────────────────────
// Solo cachea el resultado de getEpisodeUrl (llamada GraphQL de providers).
// Máx. 30 entradas → cubre una sesión normal sin acumular memoria.
// TTL 5 min → suficiente para pre-fetch y cambio de episodio.
const _providerCache = new Map();
const PROVIDER_CACHE_TTL = 5 * 60 * 1000;
const PROVIDER_CACHE_MAX = 30;
// ────────────────────────────────────────────────────────────────────────────

class AnimeService {
  /**
   * Busca anime por nombre
   * @param {string} query - Término de búsqueda
   * @param {number} limit - Número de resultados (default: 40)
   * @param {number} page - Página para paginación (default: 1)
   * @returns {Promise<Array>} - Array de resultados de búsqueda
   */
  static async searchAnime(query, limit = 26, page = 1) {
    logger.debug(
      `🔍 INICIANDO searchAnime: "${query}", limit: ${limit}, page: ${page}`,
    );

    try {
      const variables = {
        search: {
          query: query,
        },
        limit: limit,
        page: page,
        translationType: "sub",
        countryOrigin: "ALL",
      };

      logger.debug("📤 REQUEST - searchAnime:", JSON.stringify(variables));

      const response = await CatalogService.fetchCatalog(variables);

      logger.debug(
        "📥 RESPONSE - searchAnime:",
        JSON.stringify(response.data).substring(0, 200),
      );

      return this.parseSearchResults(response.data);
    } catch (error) {
      logger.error("❌ ERROR - searchAnime:", error.message);
      throw error;
    }
  }

  /**
   * Búsqueda avanzada por filtros opcionales.
   * season requiere year para que el backend lo procese.
   */
  static async searchAnimeAdvanced(filters = {}, limit = 26, page = 1) {
    const {
      query = "",
      genres = [],
      year = null,
      season = null,
      sortBy = null,
    } = filters;

    const search = {};

    if (query && query.trim().length > 0) {
      search.query = query.trim();
    }

    if (Array.isArray(genres) && genres.length > 0) {
      search.genres = genres;
    }

    if (year) {
      search.year = Number(year);
    }

    if (season && year) {
      search.season = season;
    }

    if (sortBy === "Top" || sortBy === "Recent") {
      search.sortBy = sortBy;
    }

    const variables = {
      search,
      limit,
      page,
      translationType: "sub",
      countryOrigin: "JP",
    };

    logger.debug(
      "📤 REQUEST - searchAnimeAdvanced:",
      JSON.stringify(variables),
    );

    try {
      const response = await CatalogService.fetchCatalog(variables);
      return this.parseSearchResults(response.data);
    } catch (error) {
      logger.error("❌ ERROR - searchAnimeAdvanced:", error.message);
      throw error;
    }
  }

  /**
   * Obtiene la lista de episodios de un anime
   * @param {string} showId - ID del anime
   * @returns {Promise<Array>} - Array de números de episodios
   */
  static async getEpisodesList(showId) {
    try {
      const episodesGQL = `query ($showId: String!) { show( _id: $showId ) { _id availableEpisodesDetail }}`;

      const variables = { showId: showId };

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api`,
        {
          variables,
          query: episodesGQL,
        },
        {
          headers: API_CONFIG.getHeaders(),
        },
      );

      logger.debug("📥 getEpisodesList response status:", response.status);
      logger.debug(
        "📥 getEpisodesList response data (primeros 200 chars):",
        JSON.stringify(response.data).substring(0, 200),
      );

      return this.parseEpisodesList(response.data);
    } catch (error) {
      logger.error("Error getting episodes:", error.message);
      if (error.response) {
        logger.error("📊 Response status:", error.response.status);
        logger.error(
          "📊 Response data:",
          JSON.stringify(error.response.data).substring(0, 200),
        );
      }
      throw error;
    }
  }

  /**
   * Obtiene thumbnails e info de episodios desde el endpoint episodeInfos
   * @param {string} showId - ID del anime
   * @param {number} totalEpisodes - Total de episodios para saber hasta cuándo paginar
   * @returns {Promise<Object>} Map { episodeNum → { thumbnail, notes, hasSub, hasDub } }
   */
  static async getEpisodeInfos(showId, totalEpisodes) {
    const THUMB_BASE = "https://wp.youtube-anime.com/aln.youtube-anime.com";
    const BATCH_SIZE = 26;
    const HASH =
      "c8f3ac51f598e630a1d09d7f7fb6924cff23277f354a23e473b962a367880f7d";
    const infoMap = {};

    try {
      for (let start = 1; start <= totalEpisodes; start += BATCH_SIZE) {
        const end = Math.min(start + BATCH_SIZE - 1, totalEpisodes);
        const variables = {
          showId,
          episodeNumStart: start,
          episodeNumEnd: end,
        };
        const extensions = JSON.stringify({
          persistedQuery: { version: 1, sha256Hash: HASH },
        });
        const url = `${API_CONFIG.BASE_URL}/api?variables=${encodeURIComponent(JSON.stringify(variables))}&extensions=${encodeURIComponent(extensions)}`;

        logger.debug(
          "📥 getEpisodeInfos request (GET):",
          url.substring(0, 100) + "...",
        );

        const response = await fetch(url, {
          headers: API_CONFIG.getHeaders(),
        });

        logger.debug("📥 getEpisodeInfos response status:", response.status);
        const responseText = await response.text();
        logger.debug(
          "📥 getEpisodeInfos response raw (primeros 200 chars):",
          responseText.substring(0, 200),
        );

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          logger.error("❌ JSON parse error en getEpisodeInfos:", e.message);
          logger.error("Response body:", responseText);
          throw e;
        }

        if (data?.data?.episodeInfos) {
          data.data.episodeInfos.forEach((ep) => {
            // Priorizar thumbnail sub, luego cualquiera
            const thumbPath =
              ep.thumbnails?.find((t) => t.includes("_sub")) ||
              ep.thumbnails?.[0];
            infoMap[ep.episodeIdNum] = {
              thumbnail: thumbPath ? `${THUMB_BASE}${thumbPath}?w=480` : null,
              notes: ep.notes || null,
              hasSub: !!ep.vidInforssub,
              hasDub: !!ep.vidInforsdub,
            };
          });
        }
      }
    } catch (error) {
      logger.warn("⚠️ Error obteniendo episode infos:", error.message);
    }

    return infoMap;
  }

  /**
   * Obtiene los providers de video para un episodio específico
   * @param {string} showId - ID del anime
   * @param {string} episodeString - Número del episodio
   * @param {string} translationType - "sub" o "dub" (default: "sub")
   * @returns {Promise<Array>} - Array de providers filtrados
   */
  static async getEpisodeUrl(showId, episodeString, translationType = "sub") {
    const cacheKey = `${showId}|${episodeString}|${translationType}`;
    const cached = _providerCache.get(cacheKey);

    if (cached && Date.now() - cached.ts < PROVIDER_CACHE_TTL) {
      let cachedData;
      try {
        cachedData = await Promise.resolve(cached.data);
      } catch {
        _providerCache.delete(cacheKey);
        cachedData = null;
      }

      if (Array.isArray(cachedData) && cachedData.length === 0) {
        logger.debug(
          `🧹 Invalidando cache vacío de providers ep ${episodeString}`,
        );
        _providerCache.delete(cacheKey);
      } else if (cachedData) {
        logger.debug(`📦 Cache hit: providers ep ${episodeString}`);
        return cachedData;
      }
    }

    try {
      const episodeGQL = `query ($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) { episode( showId: $showId translationType: $translationType episodeString: $episodeString ) { episodeString sourceUrls }}`;

      const variables = {
        showId,
        translationType,
        episodeString,
      };

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api`,
        {
          variables,
          query: episodeGQL,
        },
        {
          headers: API_CONFIG.getHeaders(),
        },
      );

      logger.debug("📥 getEpisodeUrl response status:", response.status);
      logger.debug(
        "📥 getEpisodeUrl response data (primeros 200 chars):",
        JSON.stringify(response.data).substring(0, 200),
      );

      const result = await this.parseEpisodeProviders(response.data);

      // Evita dejar al usuario bloqueado con resultados vacíos durante el TTL.
      if (Array.isArray(result) && result.length > 0) {
        // Si supera el límite, eliminar la entrada más antigua (FIFO)
        if (_providerCache.size >= PROVIDER_CACHE_MAX) {
          _providerCache.delete(_providerCache.keys().next().value);
        }
        _providerCache.set(cacheKey, { data: result, ts: Date.now() });
      } else {
        logger.debug(
          `⚠️ No se cachea providers vacío para ep ${episodeString}; se intentará refetch`,
        );
      }

      return result;
    } catch (error) {
      logger.error("Error getting episode URL:", error.message);
      if (error.response) {
        logger.error("📊 Response status:", error.response.status);
        logger.error(
          "📊 Response data:",
          JSON.stringify(error.response.data).substring(0, 200),
        );
      }
      throw error;
    }
  }

  /**
   * 🏁 Devuelve los enlaces del PRIMER provider que resuelva con éxito.
   * No espera a los providers lentos — navega en cuanto hay algo válido.
   */
  static async raceValidLinks(providers) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let remaining = providers.length;

      providers.forEach(async (provider, index) => {
        try {
          logger.debug(
            `   [${index + 1}/${providers.length}] Procesando ${provider.name}...`,
          );
          const links = await VideoService.getVideoLinks(provider.url);
          const validLinks = links.filter((l) => l.url && l.url.length > 10);

          if (!settled && validLinks.length > 0) {
            settled = true;
            logger.debug(
              `   🏆 Primer válido: ${provider.name} (${validLinks.length} enlaces)`,
            );
            resolve(
              validLinks.map((l) => ({
                ...l,
                provider: provider.name,
                providerType: provider.type,
                priority: provider.priority || 0,
              })),
            );
          }
        } catch (_) {
          // provider falló — los demás siguen corriendo
        } finally {
          remaining--;
          if (remaining === 0 && !settled) {
            reject(new Error("Todos los providers fallaron"));
          }
        }
      });
    });
  }

  /**
   * Parsers
   */
  static parseSearchResults(data) {
    if (!data || !data.data || !data.data.shows || !data.data.shows.edges) {
      return [];
    }

    return data.data.shows.edges.map((edge) => ({
      id: edge._id,
      name: edge.name,
      englishName: edge.englishName || null,
      thumbnail: edge.thumbnail || null,
      episodes: edge.availableEpisodes ? edge.availableEpisodes.sub || 0 : 0,
      type: edge.type || "TV",
      score: edge.score || null,
      year: edge.season ? edge.season.year : null,
    }));
  }

  static parseEpisodesList(data) {
    if (
      !data ||
      !data.data ||
      !data.data.show ||
      !data.data.show.availableEpisodesDetail
    ) {
      return [];
    }

    const episodes = data.data.show.availableEpisodesDetail.sub || [];
    return episodes.sort((a, b) => parseFloat(a) - parseFloat(b));
  }

  static parseEpisodeProviders(data) {
    const payloadData = data?.data;

    if (!payloadData) {
      return [];
    }

    const episodeSourceUrls = payloadData?.episode?.sourceUrls;
    if (Array.isArray(episodeSourceUrls)) {
      return filterProviders(episodeSourceUrls, PROVIDER_MAPPING);
    }

    if (Array.isArray(payloadData.sourceUrls)) {
      return filterProviders(payloadData.sourceUrls, PROVIDER_MAPPING);
    }

    const tobeparsedBlob = findTobeparsedBlob(payloadData);
    if (tobeparsedBlob) {
      const decodedSourceUrls = decryptTobeparsedSourceUrls(tobeparsedBlob);
      if (decodedSourceUrls.length > 0) {
        logger.debug(
          `✅ tobeparsed decodificado: ${decodedSourceUrls.length} providers`,
        );
        return filterProviders(decodedSourceUrls, PROVIDER_MAPPING);
      }

      logger.warn("⚠️ tobeparsed detectado, pero no se pudo decodificar");
      return [];
    }

    logger.warn("⚠️ Respuesta de providers sin sourceUrls ni tobeparsed");

    return [];
  }

  /**
   * Método legacy para compatibilidad (simplificado)
   * Para funciones de video avanzadas, usar VideoService
   */
  static async getVideoLinks(providerUrl) {
    // Implementación básica - para funcionalidad completa usar VideoService
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

    try {
      const response = await axios.get(
        `https://${API_CONFIG.ALLANIME_BASE}${providerUrl}`,
        {
          headers: API_CONFIG.getHeaders(),
          timeout: 10000,
        },
      );

      logger.debug("🔍 PROVIDER RESPONSE:");
      logger.debug("   Status:", response.status);
      logger.debug("   Size:", JSON.stringify(response.data).length);

      // Implementación básica - para parsing avanzado usar VideoService
      return [
        {
          url: `https://${API_CONFIG.ALLANIME_BASE}${providerUrl}`,
          quality: "auto",
          type: "mp4",
          source: "basic",
        },
      ];
    } catch (error) {
      logger.debug("❌ PROVIDER ERROR:", error.message);
      return [];
    }
  }

  /**
   * Obtiene el mejor enlace DIRECTO para descarga.
   * Reutiliza getOptimizedVideoLinks (resultado cacheado si el usuario ya vio el detalle).
   * Prioriza mp4 directo; acepta YouTube como ultimo recurso.
   */
  static async getBestDownloadUrl(
    showId,
    episodeString,
    translationType = "sub",
  ) {
    const links = await this.getOptimizedVideoLinks(
      showId,
      episodeString,
      translationType,
    );

    if (!links || links.length === 0) {
      throw new Error("Sin enlaces de descarga disponibles");
    }

    // 1) Preferir mp4 directo (no YouTube)
    const mp4 = links.find(
      (l) => l.url && l.type === "mp4" && l.source !== "youtube",
    );
    if (mp4) return mp4;

    // 2) Cualquier enlace no-YouTube
    const nonYt = links.find((l) => l.url && l.source !== "youtube");
    if (nonYt) return nonYt;

    // 3) Ultimo recurso: YouTube
    const yt = links.find((l) => l.url && l.url.length > 10);
    if (yt) return yt;

    throw new Error("Sin URL de descarga valida");
  }

  /**
   * �🚀 NUEVA FUNCIÓN OPTIMIZADA: Pipeline completo para obtener enlaces de video
   * Utiliza las optimizaciones de VideoService y procesamiento paralelo
   * @param {string} showId - ID del anime
   * @param {string} episodeString - Número del episodio
   * @param {string} translationType - "sub" o "dub" (default: "sub")
   * @returns {Promise<Array>} - Array de enlaces válidos y verificados
   */
  static async getOptimizedVideoLinks(
    showId,
    episodeString,
    translationType = "sub",
  ) {
    logger.debug(
      `🚀 INICIANDO PIPELINE OPTIMIZADO para episodio ${episodeString}`,
    );
    const startTime = Date.now();

    try {
      // Paso 1: Obtener providers con timeout optimizado
      logger.debug("📡 Paso 1: Obteniendo providers...");
      const providers = await this.getEpisodeUrl(
        showId,
        episodeString,
        translationType,
      );

      if (!providers || providers.length === 0) {
        throw new Error("No se encontraron providers para este episodio");
      }

      logger.debug(`📡 Providers encontrados: ${providers.length}`);

      // Paso 2: Carrera — navega con el primer provider que resuelva
      logger.debug("⚡ Paso 2: Carrera entre providers...");
      const validLinks = await this.raceValidLinks(providers);

      const elapsed = Date.now() - startTime;
      logger.debug(
        `🎯 PIPELINE COMPLETADO en ${elapsed}ms — ${validLinks.length} enlaces`,
      );

      return validLinks;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      logger.error(
        `❌ ERROR EN PIPELINE OPTIMIZADO después de ${elapsed}ms:`,
        error.message,
      );
      throw error;
    }
  }
}

export default AnimeService;
