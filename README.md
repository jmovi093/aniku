# Aniku Mobile

Aniku Mobile is an Expo/React Native app for browsing anime, viewing details, playing episodes, tracking watching history, managing lists, and downloading content on Android.

## Features

- Browse trending, catalog, and search results.
- View anime details, episodes, and related metadata.
- Play streaming links through the built-in player flow.
- Track watching progress and local/cloud history.
- Manage user lists and downloads.
- Firebase-backed auth, Firestore, and sync support.

## Tech Stack

- Expo SDK 53
- React Native 0.79
- Firebase client SDK
- React Navigation
- Axios

## Requirements

- Node.js and npm
- Expo CLI or `npx expo`
- Android Studio / emulator or a physical Android device
- Your own Firebase project if you want auth/sync features

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your environment file:

   ```bash
   copy .env.example .env
   ```

3. Fill `.env` with your own Firebase values.

4. Start the app:

   ```bash
   npm start
   ```

5. Run on Android:

   ```bash
   npm run android
   ```

## Available Scripts

- `npm start` - start Expo dev server.
- `npm run android` - build and run on Android.
- `npm run ios` - run on iOS.
- `npm run web` - run the web build.

## Firebase Configuration

This project uses Expo public environment variables for Firebase.

Required variables:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

Optional:

- `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for the full setup guide.

## Android Folder

The `android/` folder is intentionally ignored in git in this repository.
That means contributors should regenerate native Android files locally when needed.

Typical command if you need native files locally:

```bash
npx expo run:android
```

If you do not need to modify native Android code, keeping this folder ignored is fine for a clean Expo-driven workflow.

## Project Structure

- `src/screens` - app screens
- `src/services` - API, Firebase, downloads, history, and player services
- `src/components` - reusable UI and feature components
- `src/hooks` - shared hooks
- `src/utils` - helpers and config

## Notes

- Do not commit `.env`.
- Use your own Firebase project for development or releases.
- Keep Firestore and Storage rules strict before publishing.

## License

This project is licensed under the [MIT License](LICENSE).
