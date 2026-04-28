const logger = createLogger("app");
import { createLogger } from "./logger";
// utils/apiConfig.js
// Configuración centralizada para la API de AllAnime

logger.debug("🔧 INICIALIZANDO API_CONFIG...");

export const API_CONFIG = {
  // URLs base
  BASE_URL: "https://api.allanime.day",
  ALLANIME_BASE: "allanime.day",
  REFERER: "https://allmanga.to",

  // Headers comunes
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",

  getHeaders() {
    return {
      "User-Agent": this.USER_AGENT,
      Referer: this.REFERER,
      Origin: this.REFERER,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
    };
  },

  getGetHeaders() {
    return {
      "User-Agent": this.USER_AGENT,
      Referer: this.REFERER,
      Origin: this.REFERER,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
    };
  },
};

// Géneros disponibles (ordenados alfabéticamente para múltiples géneros)
export const GENRES = [
  "Action",
  "Adventure",
  "Cars",
  "Comedy",
  "Dementia",
  "Demons",
  "Mystery",
  "Drama",
  "Ecchi",
  "Fantasy",
  "Game",
  "Historical",
  "Horror",
  "Isekai",
  "Kids",
  "Magic",
  "Martial Arts",
  "Mecha",
  "Music",
  "Parody",
  "Samurai",
  "Romance",
  "School",
  "Sci-Fi",
  "Shoujo",
  "Shoujo Ai",
  "Shounen",
  "Shounen Ai",
  "Space",
  "Sports",
  "Super Power",
  "Vampire",
  "Yaoi",
  "Yuri",
  "Harem",
  "Slice of Life",
  "Supernatural",
  "Military",
  "Police",
  "Psychological",
  "Thriller",
  "Seinen",
  "Josei",
  "Unknown",
];

// Temporadas disponibles
export const SEASONS = ["Winter", "Spring", "Summer", "Fall"];

// Provider mapping (para filtrar providers problemáticos)
export const PROVIDER_MAPPING = {
  Default: "wixmp",
  "Yt-mp4": "youtube",
  "S-mp4": "sharepoint",
  "Luf-Mp4": "hianime",
  // Providers adicionales que estaban funcionando antes
  Vg: "vidguard",
  "Fm-Hls": "fembed",
  Ok: "okru",
  Mp4: "mp4upload",
  Sw: "streamwish",
  // "Ak" NO está mapeado = se ignora automáticamente
};

logger.debug("✅ API_CONFIG INICIALIZADO:");
logger.debug("   BASE_URL:", API_CONFIG.BASE_URL);
logger.debug("   ALLANIME_BASE:", API_CONFIG.ALLANIME_BASE);
logger.debug("   REFERER:", API_CONFIG.REFERER);
logger.debug("   GENRES count:", GENRES.length);
logger.debug("   SEASONS count:", SEASONS.length);
logger.debug("   PROVIDER_MAPPING keys:", Object.keys(PROVIDER_MAPPING));
