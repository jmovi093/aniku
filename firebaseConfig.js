// firebaseConfig.js
// Configuración de Firebase para Aniku Mobile App

import { initializeApp, getApp, getApps } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const REQUIRED_FIREBASE_ENV_VARS = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
];

function readEnv(name, required = true) {
  const rawValue = process.env[name];
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!required) {
    return value || undefined;
  }

  if (value.length === 0) {
    throw new Error(
      `[firebaseConfig] Missing env var ${name}. Create a .env file based on .env.example.`,
    );
  }

  return value;
}

const missingFirebaseEnvVars = REQUIRED_FIREBASE_ENV_VARS.filter(
  (envName) =>
    !process.env[envName] || process.env[envName].trim().length === 0,
);

if (missingFirebaseEnvVars.length > 0) {
  throw new Error(
    `[firebaseConfig] Missing Firebase env vars: ${missingFirebaseEnvVars.join(
      ", ",
    )}.`,
  );
}

// 🔥 Firebase configuration (customizable via .env)
const firebaseConfig = {
  apiKey: readEnv("EXPO_PUBLIC_FIREBASE_API_KEY"),
  authDomain: readEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: readEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: readEnv("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readEnv("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: readEnv("EXPO_PUBLIC_FIREBASE_APP_ID"),
  measurementId: readEnv("EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID", false),
};

// 🚀 Initialize Firebase
export const app =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createAuth() {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

// 🔐 Initialize Firebase Authentication (con persistencia en AsyncStorage)
export const auth = createAuth();

// 🗄️ Initialize Firestore Database
export const db = getFirestore(app);

// 📊 Initialize Analytics (only on web platform)
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log("📊 Firebase Analytics inicializado");
    }
  });
}
export { analytics };

// 📊 Enable offline persistence (opcional)
// import { enableNetwork, disableNetwork } from 'firebase/firestore';
// export { enableNetwork, disableNetwork };

console.log("🔥 Firebase inicializado correctamente:", app.name);
console.log("🎯 Proyecto ID:", firebaseConfig.projectId);
