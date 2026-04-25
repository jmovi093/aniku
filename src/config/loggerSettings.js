export const DEFAULT_LOG_LEVEL = "debug";
export const DEFAULT_LOGGING_ENABLED = __DEV__;

// Edita estos tags aqui para dejar logs apagados o prendidos por defecto.
export const DEFAULT_LOG_TAGS = {
  app: false,
  auth: false,
  api: true,
  catalog: false,
  player: false,
  downloads: false,
  history: false,
  ui: false,
  search: false,
  home: false,
  console: false,
};

export const KNOWN_LOG_TAGS = Object.keys(DEFAULT_LOG_TAGS);

// Reglas rapidas de release:
// - release = sin logs JS
// - debug = usa estos defaults
export const LOG_SETTINGS_NOTES = {
  release: {
    enabled: false,
    minLevel: "silent",
  },
};
