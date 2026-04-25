import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_LOG_LEVEL,
  DEFAULT_LOGGING_ENABLED,
  DEFAULT_LOG_TAGS,
  KNOWN_LOG_TAGS as KNOWN_LOG_TAGS_FROM_SETTINGS,
} from "../config/loggerSettings";

const STORAGE_KEY = "app_logger_config_v1";

const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 99,
};

const KNOWN_LOG_TAGS = KNOWN_LOG_TAGS_FROM_SETTINGS;

let loggerConfig = {
  enabled: DEFAULT_LOGGING_ENABLED,
  minLevel: DEFAULT_LOG_LEVEL,
  tags: { ...DEFAULT_LOG_TAGS },
};

let initialized = false;
let consolePatched = false;

const nativeConsole = {
  log: console.log.bind(console),
  info: (console.info || console.log).bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

const safeStringify = (value) => {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch (_) {
    return String(value);
  }
};

const normalizeLevel = (level) => {
  if (!level) return "info";
  return LOG_LEVELS[level] ? level : "info";
};

const shouldLog = (level, tag) => {
  // Nunca emitir logs JS en release.
  if (!__DEV__) return false;
  if (!loggerConfig.enabled) return false;

  const normalizedLevel = normalizeLevel(level);
  const minLevel = normalizeLevel(loggerConfig.minLevel);
  if (LOG_LEVELS[normalizedLevel] < LOG_LEVELS[minLevel]) return false;

  const tagEnabled = loggerConfig.tags?.[tag];
  if (typeof tagEnabled === "boolean") return tagEnabled;

  return true;
};

const emit = (level, tag, args) => {
  if (!shouldLog(level, tag)) return;

  const time = new Date().toISOString().slice(11, 19);
  const prefix = `[${time}] [${tag}] [${level.toUpperCase()}]`;

  if (level === "error") {
    nativeConsole.error(prefix, ...args);
    return;
  }
  if (level === "warn") {
    nativeConsole.warn(prefix, ...args);
    return;
  }
  if (level === "info") {
    nativeConsole.info(prefix, ...args);
    return;
  }

  nativeConsole.log(prefix, ...args);
};

const patchConsole = () => {
  if (consolePatched) return;
  consolePatched = true;

  console.log = (...args) => emit("debug", "console", args);
  console.info = (...args) => emit("info", "console", args);
  console.warn = (...args) => emit("warn", "console", args);
  console.error = (...args) => emit("error", "console", args);
};

const persistConfig = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loggerConfig));
  } catch (_) {
    // No bloquear la app por errores de persistencia.
  }
};

export const initializeLogger = async () => {
  if (initialized) return;

  if (!__DEV__) {
    loggerConfig = {
      ...loggerConfig,
      enabled: false,
      minLevel: "silent",
      tags: Object.fromEntries(KNOWN_LOG_TAGS.map((tag) => [tag, false])),
    };
    patchConsole();
    initialized = true;
    return;
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      loggerConfig = {
        ...loggerConfig,
        ...parsed,
        minLevel: normalizeLevel(parsed?.minLevel),
        tags: {
          ...loggerConfig.tags,
          ...(parsed?.tags || {}),
        },
      };
    }
  } catch (_) {
    // Mantener defaults si falla la lectura.
  }

  patchConsole();
  initialized = true;
};

export const getLoggerConfig = () => ({
  ...loggerConfig,
  tags: { ...loggerConfig.tags },
});

export const setLoggingEnabled = async (enabled) => {
  loggerConfig.enabled = Boolean(enabled);
  await persistConfig();
  return getLoggerConfig();
};

export const setLoggerLevel = async (level) => {
  loggerConfig.minLevel = normalizeLevel(level);
  await persistConfig();
  return getLoggerConfig();
};

export const setTagEnabled = async (tag, enabled) => {
  loggerConfig.tags = {
    ...loggerConfig.tags,
    [tag]: Boolean(enabled),
  };
  await persistConfig();
  return getLoggerConfig();
};

export const setMultipleTags = async (tagMap) => {
  loggerConfig.tags = {
    ...loggerConfig.tags,
    ...tagMap,
  };
  await persistConfig();
  return getLoggerConfig();
};

export const resetLoggerConfig = async () => {
  loggerConfig = {
    enabled: DEFAULT_LOGGING_ENABLED,
    minLevel: DEFAULT_LOG_LEVEL,
    tags: { ...DEFAULT_LOG_TAGS },
  };
  await persistConfig();
  return getLoggerConfig();
};

export const createLogger = (tag = "app") => ({
  debug: (...args) => emit("debug", tag, args),
  info: (...args) => emit("info", tag, args),
  warn: (...args) => emit("warn", tag, args),
  error: (...args) => emit("error", tag, args),
});

export const logger = createLogger("app");
export { KNOWN_LOG_TAGS };
export const loggerLevels = Object.keys(LOG_LEVELS);
export const serializeLoggerConfig = () => safeStringify(getLoggerConfig());
