# Firebase Setup (Open Source Contributors)

This project uses Expo public environment variables for Firebase.

## 1. Create your local env file

Copy `.env.example` to `.env` and fill it with your own Firebase project values.

Required variables:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

Optional:

- `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`

## 2. Restart Expo after env changes

Expo reads env vars at startup, so restart the dev server after editing `.env`.

## 3. Security notes

- `EXPO_PUBLIC_*` values are visible in client builds. This is expected.
- Protect your Firebase project with strict Firestore/Storage rules.
- Restrict Firebase API key usage in Google Cloud Console.
- Enable App Check for stronger abuse protection.

## 4. Troubleshooting

If env vars are missing, app startup throws a clear Firebase config error from `firebaseConfig.js`.
