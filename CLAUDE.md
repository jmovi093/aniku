# Aniku — Claude Code Guide

## What this is

Aniku is a React Native + Expo anime streaming app for Android. It connects to the AllAnime GraphQL API to browse, search, and stream anime episodes. Users can download episodes offline, track watch history, manage lists, and view schedules.

## Commands

```bash
# Start dev server (Expo Go / web)
npm start

# Run on Android device/emulator (full native build)
npm run android

# Run on iOS
npm run ios

# Install deps (runs patch-package automatically via postinstall)
npm install
```

There is no test suite configured. Type checking is not enforced (plain JS, not TypeScript).

## Architecture

```
src/
  screens/        # One folder per screen: Home, Search, Player, Downloads, Schedule, Watching, Auth
    [Screen]/
      [Screen]Screen.js   # Root component
      components/         # Screen-local components
      hooks/              # Screen-local custom hooks
      styles/             # StyleSheet objects
  components/     # Shared components used across screens
    ui/           # Primitive UI kit: Button, Card, Input, Loading
    AnimeDetails/ # Anime detail panel (header, episodes, skeleton)
  services/       # Static class API clients
  hooks/          # Global hooks: api/, storage/, ui/
  styles/         # Design tokens: colors, typography, spacing, shadows
  config/         # App config (src/config/index.js) and logger settings
  utils/          # logger.js, urlDecoder.js
modules/
  video-proxy/    # Local Expo module (native Android + JS) — acts as HTTP proxy for video streams
android/          # Native Android project (Expo-managed with some manual patches)
```

## Key patterns

**Services** are static classes that call the AllAnime GraphQL API via POST:
```js
const response = await fetch(`${API_CONFIG.BASE_URL}/api`, {
  method: "POST",
  headers: API_CONFIG.getHeaders(),
  body: JSON.stringify({ variables, query }),
});
```

**Hooks per screen**: each screen has its own `hooks/` subfolder with custom hooks. Never put screen-specific logic in a shared hook.

**Logging**: use `createLogger(tag)` from `src/utils/logger.js`. Logs are completely silenced in production (`__DEV__ === false`). In dev, they're configurable per-tag via AsyncStorage.
```js
import { createLogger } from "../utils/logger";
const logger = createLogger("my-tag");
logger.debug("...");
```

**Styles**: always use `StyleSheet.create(...)` objects, never inline objects. Theme tokens live in `src/styles/theme/`.

**Navigation**: React Navigation v7 with a bottom-tab navigator + stack navigators per tab. Screen params are typed via `route.params`.

## Conventions

- **Plain JavaScript** — no TypeScript. No types, no `.ts` files.
- **Named exports** for components; `export default` for screens and services.
- **Index files** re-export siblings to keep imports clean (`import { useHomeData } from "./hooks"`).
- Comment language is **Spanish** in existing code — match it when adding comments.
- No test files exist; don't create them unless asked.

## Native / build notes

- **patch-package** is used to patch several React Native packages. Patches live in `patches/`. Running `npm install` auto-applies them via `postinstall`.
- `modules/video-proxy` is a local Expo module with native Android code. Changes to its `android/` folder require a full `npm run android` rebuild.
- The Android build uses Gradle. NDK is required for some native modules (`react-native-reanimated`, `react-native-video`).
- Firebase is configured for auth. Config lives in `google-services.json` (gitignored).

## Important files

| File | Purpose |
|------|---------|
| `src/config/index.js` | Central app config (timeouts, quality, storage limits) |
| `src/config/loggerSettings.js` | Default log levels and known tags |
| `src/utils/logger.js` | Tagged logger with AsyncStorage persistence |
| `src/utils/urlDecoder.js` | Decodes obfuscated stream URLs |
| `modules/video-proxy/src/index.js` | Video proxy Expo module entry |
| `android/app/build.gradle` | Android build config |
