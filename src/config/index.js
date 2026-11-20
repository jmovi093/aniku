// src/config/index.js
// Configuración centralizada de la aplicación

export const appConfig = {
  // 🌐 Fuente de anime
  //
  // "mkissa"  → AllAnime/mkissa (api.allanime.day + api.mkissa.net). Requiere
  //   la cripto del esquema bootstrap (ver src/services/AnimeService.js);
  //   si mkissa hace un deploy nuevo hay que actualizar sus constantes AA_*.
  // "hianime" → hianime, la misma fuente que usa ani-cli (HianimeService.js).
  //   Sin cripto rotativa; el video exige Referer (lo manda cada link).
  // (anidb.app murió y AnidbService.js quedó solo como referencia.)
  //
  // El ruteo vive en src/services/source/index.js.
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
    // Calidad preferida al abrir un episodio. Si no existe entre los enlaces
    // disponibles, se cae a la más cercana hacia abajo y, si no hay, a la mejor.
    // Ver pickPreferredQualityIndex() en src/utils/videoQuality.js
    defaultQuality: "720p",
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
