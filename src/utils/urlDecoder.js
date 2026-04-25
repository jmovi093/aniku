const logger = createLogger("app");
import { createLogger } from "./logger";
// utils/urlDecoder.js (OPTIMIZADO)
// Decodificador con paralelización y validación mejorada

// Mapeo de hexadecimal optimizado (pre-compilado)
const HEX_MAPPING = {
  79: "A",
  "7a": "B",
  "7b": "C",
  "7c": "D",
  "7d": "E",
  "7e": "F",
  "7f": "G",
  70: "H",
  71: "I",
  72: "J",
  73: "K",
  74: "L",
  75: "M",
  76: "N",
  77: "O",
  68: "P",
  69: "Q",
  "6a": "R",
  "6b": "S",
  "6c": "T",
  "6d": "U",
  "6e": "V",
  "6f": "W",
  60: "X",
  61: "Y",
  62: "Z",
  59: "a",
  "5a": "b",
  "5b": "c",
  "5c": "d",
  "5d": "e",
  "5e": "f",
  "5f": "g",
  50: "h",
  51: "i",
  52: "j",
  53: "k",
  54: "l",
  55: "m",
  56: "n",
  57: "o",
  48: "p",
  49: "q",
  "4a": "r",
  "4b": "s",
  "4c": "t",
  "4d": "u",
  "4e": "v",
  "4f": "w",
  40: "x",
  41: "y",
  42: "z",
  "08": "0",
  "09": "1",
  "0a": "2",
  "0b": "3",
  "0c": "4",
  "0d": "5",
  "0e": "6",
  "0f": "7",
  "00": "8",
  "01": "9",
  15: "-",
  16: ".",
  67: "_",
  46: "~",
  "02": ":",
  17: "/",
  "07": "?",
  "1b": "#",
  63: "[",
  65: "]",
  78: "@",
  19: "!",
  "1c": "$",
  "1e": "&",
  10: "(",
  11: ")",
  12: "*",
  13: "+",
  14: ",",
  "03": ";",
  "05": "=",
  "1d": "%",
};

// Cache para URLs decodificadas
const decodeCache = new Map();
const DECODE_CACHE_SIZE = 100;

/**
 * 🚀 OPTIMIZACIÓN: Decodifica URLs con cache y validación mejorada
 * @param {string} encodedUrl - URL encodada en hexadecimal
 * @returns {string|null} - URL decodificada o null si es inválida
 */
export function decodeUrl(encodedUrl) {
  // Verificar cache primero
  if (decodeCache.has(encodedUrl)) {
    logger.debug("💾 URL decodificada desde cache");
    return decodeCache.get(encodedUrl);
  }

  try {
    logger.debug(
      `🔓 DECODIFICANDO: ${encodedUrl.substring(0, 30)}... (${
        encodedUrl.length
      } chars)`,
    );

    // Validación rápida inicial
    if (!encodedUrl || encodedUrl.length < 10 || encodedUrl.length % 2 !== 0) {
      logger.debug("❌ URL inválida: muy corta o longitud impar");
      return null;
    }

    let decoded = "";
    let hasUnmapped = false;

    // Decodificación optimizada sin regex
    for (let i = 0; i < encodedUrl.length; i += 2) {
      const hex = encodedUrl.substr(i, 2);

      if (HEX_MAPPING[hex]) {
        decoded += HEX_MAPPING[hex];
      } else {
        hasUnmapped = true;
        decoded += `[${hex}]`; // Placeholder para debug
      }
    }

    // Aplicar transformaciones específicas
    if (decoded.includes("/clock")) {
      decoded = decoded.replace("/clock", "/clock.json");
      logger.debug("🕐 Transformación /clock -> /clock.json aplicada");
    }

    // Validación de URL resultante
    const isValid = validateDecodedUrl(decoded, hasUnmapped);

    if (isValid) {
      logger.debug(`✅ URL decodificada válida: ${decoded.substring(0, 40)}...`);

      // Guardar en cache (con límite de tamaño)
      if (decodeCache.size >= DECODE_CACHE_SIZE) {
        const firstKey = decodeCache.keys().next().value;
        decodeCache.delete(firstKey);
      }
      decodeCache.set(encodedUrl, decoded);

      return decoded;
    } else {
      logger.debug(`❌ URL decodificada inválida`);
      decodeCache.set(encodedUrl, null); // Cache también fallos
      return null;
    }
  } catch (error) {
    logger.error(`❌ ERROR decodificando: ${error.message}`);
    return null;
  }
}

/**
 * 🚀 NUEVA FUNCIÓN: Valida URLs decodificadas de manera más eficiente
 */
function validateDecodedUrl(decoded, hasUnmapped) {
  // Verificaciones básicas rápidas
  if (!decoded || decoded.length < 5) return false;
  if (hasUnmapped && decoded.includes("[")) return false;
  if (!decoded.includes("/")) return false;

  // Verificar que parezca una URL válida
  const hasValidChars = /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]+$/.test(
    decoded.replace(/\[[0-9a-f]{2}\]/gi, ""),
  );
  if (!hasValidChars) return false;

  // Las URLs de AllAnime son rutas relativas (empiezan con "/") — son válidas
  return decoded.includes("/") && !decoded.endsWith("//");
}

/**
 * 🚀 OPTIMIZACIÓN CRÍTICA: Filtra y procesa providers en paralelo
 * @param {Array} sourceUrls - Array de providers de la API
 * @param {Object} providerMapping - Mapeo de tipos de providers
 * @returns {Array} - Providers filtrados, decodificados y ordenados
 */
export function filterProviders(sourceUrls, providerMapping) {
  logger.debug(
    `🔍 PROCESANDO ${sourceUrls.length} PROVIDERS DISPONIBLES EN API`,
  );

  // Log de providers disponibles
  sourceUrls.forEach((source, index) => {
    logger.debug(
      `   ${index + 1}. ${source.sourceName} (prioridad: ${
        source.priority || 0
      })`,
    );
  });

  // Pre-filtrar providers obviamente inválidos
  const validSources = sourceUrls.filter((source) => {
    const mappedType = providerMapping[source.sourceName];

    if (!mappedType) {
      logger.debug(`🚫 PROVIDER IGNORADO (no mapeado): ${source.sourceName}`);
      return false;
    }

    if (!source.sourceUrl || !source.sourceUrl.includes("--")) {
      logger.debug(`🚫 PROVIDER IGNORADO (URL inválida): ${source.sourceName}`);
      return false;
    }

    return true;
  });

  logger.debug(
    `✅ PROVIDERS VÁLIDOS PARA PROCESAR: ${validSources.length}/${sourceUrls.length}`,
  );

  // Procesar decodificación en paralelo usando Promise.all
  const decodingPromises = validSources.map(async (source, index) => {
    try {
      const encodedUrl = source.sourceUrl.replace("--", "");
      const decodedUrl = decodeUrl(encodedUrl);

      if (decodedUrl) {
        const provider = {
          name: source.sourceName,
          url: decodedUrl,
          type: providerMapping[source.sourceName],
          priority: source.priority || 0,
          originalSourceUrl: source.sourceUrl,
        };

        logger.debug(
          `✅ [${index + 1}] PROVIDER MAPEADO: ${source.sourceName} -> ${
            provider.type
          }`,
        );
        return provider;
      } else {
        logger.debug(
          `❌ [${index + 1}] DECODIFICACIÓN FALLÓ: ${source.sourceName}`,
        );
        return null;
      }
    } catch (error) {
      logger.debug(
        `❌ [${index + 1}] ERROR PROCESANDO: ${source.sourceName} - ${
          error.message
        }`,
      );
      return null;
    }
  });

  // Ejecutar todas las decodificaciones en paralelo
  return Promise.all(decodingPromises)
    .then((results) => {
      // Filtrar resultados nulos y ordenar por prioridad
      const providers = results
        .filter((provider) => provider !== null)
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

      logger.debug(`📈 PROVIDERS FINALES ORDENADOS: ${providers.length}`);
      providers.forEach((provider, index) => {
        logger.debug(
          `   ${index + 1}. ${provider.name} (${provider.type}) - prioridad: ${
            provider.priority
          }`,
        );
      });

      return providers;
    })
    .catch((error) => {
      logger.error(
        `❌ ERROR en procesamiento paralelo de providers: ${error.message}`,
      );
      return [];
    });
}

/**
 * 🚀 NUEVA FUNCIÓN: Filtra providers de manera síncrona para compatibilidad
 * Esta función mantiene la interfaz original pero con optimizaciones
 */
export function filterProvidersSync(sourceUrls, providerMapping) {
  logger.debug(`🔍 PROCESANDO ${sourceUrls.length} PROVIDERS (modo síncrono)`);

  const providers = [];

  for (const source of sourceUrls) {
    const mappedType = providerMapping[source.sourceName];

    if (!mappedType) {
      logger.debug(`🚫 PROVIDER IGNORADO: ${source.sourceName}`);
      continue;
    }

    if (source.sourceUrl && source.sourceUrl.includes("--")) {
      const encodedUrl = source.sourceUrl.replace("--", "");
      const decodedUrl = decodeUrl(encodedUrl);

      if (decodedUrl) {
        providers.push({
          name: source.sourceName,
          url: decodedUrl,
          type: mappedType,
          priority: source.priority || 0,
        });
        logger.debug(
          `✅ PROVIDER MAPEADO: ${source.sourceName} -> ${mappedType}`,
        );
      }
    }
  }

  // Ordenar por prioridad
  const sortedProviders = providers.sort(
    (a, b) => (b.priority || 0) - (a.priority || 0),
  );

  logger.debug(`📈 PROVIDERS FINALES: ${sortedProviders.length}`);
  return sortedProviders;
}

/**
 * 🚀 NUEVA FUNCIÓN: Batch decoder para múltiples URLs
 * Útil cuando se necesita decodificar muchas URLs de una vez
 */
export function batchDecodeUrls(encodedUrls) {
  logger.debug(`🔄 DECODIFICACIÓN POR LOTES: ${encodedUrls.length} URLs`);

  const results = encodedUrls.map((encodedUrl, index) => {
    try {
      const decoded = decodeUrl(encodedUrl);
      logger.debug(
        `   ${decoded ? "✅" : "❌"} [${index + 1}] ${encodedUrl.substring(
          0,
          20,
        )}...`,
      );
      return { original: encodedUrl, decoded, success: !!decoded };
    } catch (error) {
      logger.debug(`   ❌ [${index + 1}] ERROR: ${error.message}`);
      return {
        original: encodedUrl,
        decoded: null,
        success: false,
        error: error.message,
      };
    }
  });

  const successful = results.filter((r) => r.success).length;
  logger.debug(
    `📊 DECODIFICACIÓN COMPLETADA: ${successful}/${encodedUrls.length} exitosas`,
  );

  return results;
}

/**
 * Utilidades de cache
 */
export function clearDecodeCache() {
  decodeCache.clear();
  logger.debug("🧹 Cache de decodificación limpiado");
}

export function getDecodeCacheStats() {
  return {
    size: decodeCache.size,
    maxSize: DECODE_CACHE_SIZE,
    usage: ((decodeCache.size / DECODE_CACHE_SIZE) * 100).toFixed(1) + "%",
  };
}

/**
 * 🚀 NUEVA FUNCIÓN: Validador rápido de URLs encodadas
 * Permite filtrar URLs obviamente inválidas antes de intentar decodificar
 */
export function isValidEncodedUrl(encodedUrl) {
  if (!encodedUrl || typeof encodedUrl !== "string") return false;
  if (encodedUrl.length < 10 || encodedUrl.length > 2000) return false;
  if (encodedUrl.length % 2 !== 0) return false;

  // Verificar que solo contiene caracteres hexadecimales válidos
  return /^[0-9a-f]+$/i.test(encodedUrl);
}

// Exportar también como default para compatibilidad
export default {
  decodeUrl,
  filterProviders,
  filterProvidersSync,
  batchDecodeUrls,
  clearDecodeCache,
  getDecodeCacheStats,
  isValidEncodedUrl,
};
