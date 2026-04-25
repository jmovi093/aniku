// src/config/index.js
// Configuración centralizada de la aplicación

export const appConfig = {
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
