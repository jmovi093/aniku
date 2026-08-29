// src/config/index.js
// Configuración centralizada de la aplicación

export const appConfig = {
  // 🌐 Fuente de anime
  //
  // "mkissa" → AllAnime/mkissa (api.allanime.day + api.mkissa.net). Es la
  //   fuente histórica y la que está en producción. Requiere la cripto del
  //   esquema bootstrap (ver src/services/AnimeService.js).
  // "anidb"  → anidb.app, la misma fuente que adoptó ani-cli v5 (PR #1830).
  //   Su API está detrás de Cloudflare, así que la metadata pasa por un
  //   WebView oculto (src/utils/cloudflareBridge.js); el video va directo.
  //
  // Se deja en "mkissa" hasta validar el WebView en device. Para probar la
  // fuente nueva basta cambiar esto — ver .claude/ANIDB-SOURCE.md.
  source: "mkissa",

  // 🎨 Tema por defecto
  theme: {
    name: "dark",
    mode: "system", // 'light', 'dark', 'system'
  },

  // ⚡ Performance
  performance: {
    imageCache: true,
    prefetchLimit: 5,
    debounceDelay: 300,
    retryAttempts: 3,
  },

  // 📱 UI/UX
  ui: {
    animationDuration: 200,
    hapticFeedback: true,
    biometricAuth: false,
    autoPlay: false,
  },

  // 💾 Storage
  storage: {
    cacheSize: 100, // MB
    historyLimit: 100,
    downloadLimit: 50,
  },

  // 🌐 API
  api: {
    timeout: 10000, // 10 segundos
    retryDelay: 1000,
    maxRetries: 3,
  },

  // 🎥 Video
  video: {
    autoPlay: false,
    defaultQuality: "auto",
    skipIntroLength: 85, // segundos
    continueWatchingThreshold: 0.9, // 90%
  },

  // 📊 Analytics (placeholder para futuro)
  analytics: {
    enabled: false,
    crashReporting: false,
  },
};

export default appConfig;
