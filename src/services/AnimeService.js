const logger = createLogger("api");
import { createLogger } from "../utils/logger";
// services/AnimeService.js
// Servicio principal para funciones core de anime (búsqueda, episodios)

import axios from "axios";
import CryptoJS from "crypto-js";
import { gcm } from "@noble/ciphers/aes.js";
import { API_CONFIG, PROVIDER_MAPPING } from "../utils/apiConfig.js";
import { filterProviders } from "../utils/urlDecoder.js";
import VideoService from "./VideoService.js";
import CatalogService from "./CatalogService.js";

// AllAnime cambió su esquema de cifrado el 2026-07-07/08 a una clave fija
// derivada por XOR en su build, y desde entonces la ha rotado repetidas
// veces de forma impredecible (confirmado en vivo cada vez: 22196fa6... →
// volvió a la vieja SHA256("Xot36i3lK3:v1") el 2026-07-12 → cf4777b5... el
// 2026-07-17 → e661283a... el 2026-07-20, junto con un nuevo hash de query
// de episodio). Se prueban todas las conocidas en cascada al descifrar en
// vez de asumir una sola — ver issue #1802 de pystardust/ani-cli para la
// más reciente si esto vuelve a fallar.
const ALLANIME_KEY_HEX_LATEST =
  "e661283abaef7a6cecd6d74efc385a4f455e838d439af13f2754d51dab9f21e0";
const ALLANIME_KEY_HEX_PREV =
  "cf4777b5778aeadc9449e12769ea545d00c43cd8ff65d482364586cde204f359";
const ALLANIME_KEY_HEX_ORIGINAL = CryptoJS.SHA256("Xot36i3lK3:v1").toString(
  CryptoJS.enc.Hex,
);
const ALLANIME_KEY_CANDIDATES = [
  ALLANIME_KEY_HEX_LATEST,
  ALLANIME_KEY_HEX_PREV,
  ALLANIME_KEY_HEX_ORIGINAL,
];
// Clave usada para el token aaReq saliente — debe ser la más reciente para
// que la API acepte la query en sí (a diferencia del descifrado de la
// respuesta, este lado no tiene fallback: si está desactualizada, la API
// responde AA_CRYPTO_STALE).
const ALLANIME_KEY_HEX = ALLANIME_KEY_HEX_LATEST;

// Parámetros del token `aaReq` requerido desde 2026-07-07/08 para las
// queries de episodio (sin ellos, la API responde AA_CRYPTO_MISSING/STALE).
// Son valores observados en el build actual del sitio; si AllAnime los rota
// de nuevo habrá que volver a extraerlos (ver issue #1802 la última vez).
const AAREQ_EPOCH = 6884;
const AAREQ_BUILD_ID = "51";

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

function buildAaReqToken(queryHash) {
  const ts = Math.floor(Date.now() / 300000) * 300000;
  const payload = JSON.stringify({
    v: 1,
    ts,
    epoch: AAREQ_EPOCH,
    buildId: AAREQ_BUILD_ID,
    qh: queryHash,
  });

  const ivBytes = wordArrayToByteArray(
    CryptoJS.SHA256(`${AAREQ_EPOCH}:${AAREQ_BUILD_ID}:${queryHash}:${ts}`),
  ).slice(0, 12);
  const keyBytes = wordArrayToByteArray(CryptoJS.enc.Hex.parse(ALLANIME_KEY_HEX));
  const payloadBytes = wordArrayToByteArray(CryptoJS.enc.Utf8.parse(payload));

  const cipher = gcm(new Uint8Array(keyBytes), new Uint8Array(ivBytes));
  const ciphertextWithTag = cipher.encrypt(new Uint8Array(payloadBytes));

  const tokenBytes = new Uint8Array(1 + ivBytes.length + ciphertextWithTag.length);
  tokenBytes[0] = 1;
  tokenBytes.set(ivBytes, 1);
  tokenBytes.set(ciphertextWithTag, 1 + ivBytes.length);

  return byteArrayToWordArray(Array.from(tokenBytes)).toString(CryptoJS.enc.Base64);
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

    // AllAnime alterna entre su clave nueva y la vieja sin aviso — se
    // prueban ambas y se usa la primera que produzca sourceUrls válidos.
    for (const keyHex of ALLANIME_KEY_CANDIDATES) {
      const plaintext = decryptCtrOpenSslCompat(
        cipherHex,
        keyHex,
        counterHex,
      ).replace(/\0+$/g, "");

      if (!plaintext) continue;

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
    }

    logger.warn(
      "⚠️ tobeparsed descifrado con ambas claves, pero sin sourceUrls parseables",
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

// Caché de links de video ya resueltos por episodio.
// El pre-fetch los guarda aquí; handleNextEpisode los lee al instante.
const _videoLinksCache = new Map();
const VIDEO_LINKS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const VIDEO_LINKS_CACHE_MAX = 15;

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
      return {
        results: this.parseSearchResults(response.data),
        pagination: CatalogService.getPaginationInfo(response.data),
      };
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
          headers: API_CONFIG.getGetHeaders(),
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
      const variables = { showId, translationType, episodeString };
      const queryHash =
        "f4662f4b7510b26795dd53ef824a0bf1740fbbc5d1273fab18222ac831bca8d0";

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api`, {
        params: {
          variables: JSON.stringify(variables),
          extensions: JSON.stringify({
            persistedQuery: { version: 1, sha256Hash: queryHash },
            aaReq: buildAaReqToken(queryHash),
          }),
        },
        // AllAnime valida Origin/Referer contra su dominio espejo desde el
        // cambio de cifrado del 2026-07-07/08; allmanga.to ya no sirve aquí.
        headers: {
          ...API_CONFIG.getGetHeaders(),
          Referer: "https://youtu-chan.com",
          Origin: "https://youtu-chan.com",
        },
      });

      logger.debug("📥 getEpisodeUrl response status:", response.status);

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
    const raceController = new AbortController();

    return new Promise((resolve, reject) => {
      let settled = false;
      let remaining = providers.length;

      providers.forEach(async (provider, index) => {
        try {
          logger.debug(
            `   [${index + 1}/${providers.length}] Procesando ${provider.name}...`,
          );
          const links = await VideoService.getVideoLinks(provider.url, raceController.signal);
          const validLinks = links.filter((l) => l.url && l.url.length > 10);

          if (!settled && validLinks.length > 0) {
            settled = true;
            raceController.abort();
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
          // provider falló o fue cancelado — los demás siguen corriendo
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
          headers: API_CONFIG.getGetHeaders(),
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
    { silent = false, excludeProviders = [] } = {},
  ) {
    const vlCacheKey = `${showId}|${episodeString}|${translationType}`;

    // Con exclusiones activas necesitamos una carrera nueva — no reusar cache.
    if (excludeProviders.length === 0) {
      const vlCached = _videoLinksCache.get(vlCacheKey);
      if (vlCached && Date.now() - vlCached.ts < VIDEO_LINKS_CACHE_TTL) {
        logger.debug(`📦 Cache hit: video links ep ${episodeString} (${vlCached.data.length} enlaces)`);
        return vlCached.data;
      }
    }

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

      const usableProviders = excludeProviders.length > 0
        ? providers.filter((p) => !excludeProviders.includes(p.name))
        : providers;

      if (!usableProviders || usableProviders.length === 0) {
        throw new Error("No se encontraron providers para este episodio");
      }

      logger.debug(`📡 Providers encontrados: ${usableProviders.length}`);

      // Paso 2: Carrera — navega con el primer provider que resuelva
      logger.debug("⚡ Paso 2: Carrera entre providers...");
      const validLinks = await this.raceValidLinks(usableProviders);

      const elapsed = Date.now() - startTime;
      logger.debug(
        `🎯 PIPELINE COMPLETADO en ${elapsed}ms — ${validLinks.length} enlaces`,
      );

      // Guardar links en caché para acceso instantáneo al presionar siguiente
      // (solo cuando no hay exclusiones — ese resultado es específico al retry)
      if (validLinks.length > 0 && excludeProviders.length === 0) {
        if (_videoLinksCache.size >= VIDEO_LINKS_CACHE_MAX) {
          _videoLinksCache.delete(_videoLinksCache.keys().next().value);
        }
        _videoLinksCache.set(vlCacheKey, { data: validLinks, ts: Date.now() });
      }

      return validLinks;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      const logFn = silent ? logger.debug : logger.error;
      logFn(
        `❌ ERROR EN PIPELINE OPTIMIZADO después de ${elapsed}ms:`,
        error.message,
      );
      throw error;
    }
  }
}

export default AnimeService;
