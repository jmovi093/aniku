const logger = createLogger("watched");
import { createLogger } from "../utils/logger";
// services/WatchedEpisodesService.js
// Registro de episodios vistos, por anime.
//
// ─── POR QUÉ NO ALCANZABA CON LO QUE YA HABÍA ──────────────────────────────
// `HybridHistoryService` guarda UNA entrada por anime (currentEpisode,
// progress, progressPercent): sabe "vas por el 27 al 62%", pero NO qué
// episodios viste. Para tildar la lista hace falta este conjunto aparte.
//
// ─── ESTRATEGIA: LOCAL PRIMERO, NUBE DESPUÉS ───────────────────────────────
// 1. La escritura LOCAL es inmediata y NUNCA va con debounce. Si el usuario
//    apaga el teléfono un segundo después de marcar, la marca ya está en
//    AsyncStorage. Perder datos del dispositivo no es una opción.
// 2. Lo que se difiere es SOLO la subida a Firestore, y el "hay algo
//    pendiente" se guarda EN DISCO (PENDING_KEY), no en memoria. Si Android
//    mata el proceso, al abrir la app se ve el pendiente y se sincroniza.
// 3. Además se vacía al pasar la app a segundo plano (ver registerAppStateFlush
//    en App.js) y cuando vuelve la red.
//
// Peor caso: una marca llega a la nube unos minutos tarde. Nunca se pierde.
//
// ─── FORMA DE ALMACENAMIENTO ───────────────────────────────────────────────
// UN documento por anime, no uno por episodio:
//   watched:<animeId> -> [25, 26, 27]
// One Piece con 1000 vistos son ~4 KB: irrelevante para AsyncStorage y muy
// por debajo del límite de 1 MiB por documento de Firestore. Marcar 30
// episodios seguidos genera UNA escritura en la nube, no 30.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "../../firebaseConfig";
import AuthService from "./AuthService";

const KEY_PREFIX = "watched_episodes_v1:";
const PENDING_KEY = "watched_episodes_pending_v1";

// Cuánto se espera tras el último cambio antes de subir a la nube.
const CLOUD_DEBOUNCE = 4000;

// Caché en memoria: animeId -> Set(numeros). Evita leer disco en cada render.
const _cache = new Map();
let _flushTimer = null;

const storageKey = (animeId) => `${KEY_PREFIX}${animeId}`;

function toSet(value) {
  return new Set((Array.isArray(value) ? value : []).map((n) => String(n)));
}

// ─── pendientes (persistidos, no en memoria) ────────────────────────────────

async function readPending() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return new Set(JSON.parse(raw || "[]"));
  } catch {
    return new Set();
  }
}

async function markPending(animeId) {
  try {
    const pending = await readPending();
    pending.add(String(animeId));
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify([...pending]));
  } catch (error) {
    logger.warn(`⚠️ No se pudo anotar el pendiente: ${error.message}`);
  }
}

async function clearPending(animeIds) {
  try {
    const pending = await readPending();
    animeIds.forEach((id) => pending.delete(String(id)));
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify([...pending]));
  } catch (error) {
    logger.warn(`⚠️ No se pudo limpiar pendientes: ${error.message}`);
  }
}

class WatchedEpisodesService {
  /** Episodios vistos de un anime, como Set de strings (lookup O(1) por fila). */
  static async getWatched(animeId) {
    if (_cache.has(animeId)) return _cache.get(animeId);
    try {
      const raw = await AsyncStorage.getItem(storageKey(animeId));
      const set = toSet(JSON.parse(raw || "[]"));
      _cache.set(animeId, set);
      return set;
    } catch (error) {
      logger.warn(`⚠️ No se pudo leer vistos de ${animeId}: ${error.message}`);
      const empty = new Set();
      _cache.set(animeId, empty);
      return empty;
    }
  }

  static isWatched(animeId, episode) {
    return _cache.get(animeId)?.has(String(episode)) ?? false;
  }

  /** Guarda YA en disco y agenda la subida a la nube. */
  static async persist(animeId, set) {
    _cache.set(animeId, set);
    try {
      // Inmediato a propósito: si el teléfono se apaga ahora, ya está guardado.
      await AsyncStorage.setItem(
        storageKey(animeId),
        JSON.stringify([...set].sort((a, b) => parseFloat(a) - parseFloat(b))),
      );
      await markPending(animeId);
      this.scheduleCloudFlush();
    } catch (error) {
      logger.error(`❌ No se pudo guardar vistos: ${error.message}`);
    }
  }

  static async markWatched(animeId, episode) {
    const set = new Set(await this.getWatched(animeId));
    set.add(String(episode));
    await this.persist(animeId, set);
    return set;
  }

  static async unmarkWatched(animeId, episode) {
    const set = new Set(await this.getWatched(animeId));
    set.delete(String(episode));
    await this.persist(animeId, set);
    return set;
  }

  static async toggleWatched(animeId, episode) {
    const set = await this.getWatched(animeId);
    return set.has(String(episode))
      ? this.unmarkWatched(animeId, episode)
      : this.markWatched(animeId, episode);
  }

  /**
   * "Marcar hasta acá": marca `episode` y TODOS los anteriores de la lista.
   * Pensado para ponerse al día de golpe (útil ahora, que el historial viejo
   * de AllAnime no resuelve contra los ids de anidb).
   * @param {Array<string>} allEpisodes lista completa, ordenada
   */
  static async markUpTo(animeId, episode, allEpisodes = []) {
    const target = parseFloat(episode);
    const set = new Set(await this.getWatched(animeId));
    allEpisodes.forEach((ep) => {
      if (parseFloat(ep) <= target) set.add(String(ep));
    });
    await this.persist(animeId, set);
    logger.debug(`✅ Marcados hasta el ${episode} (${set.size} en total)`);
    return set;
  }

  /** Desmarca todo el anime. */
  static async clearAnime(animeId) {
    await this.persist(animeId, new Set());
  }

  // ─── sincronización con la nube ──────────────────────────────────────────

  static scheduleCloudFlush() {
    if (_flushTimer) clearTimeout(_flushTimer);
    _flushTimer = setTimeout(() => {
      _flushTimer = null;
      this.flushToCloud().catch(() => {});
    }, CLOUD_DEBOUNCE);
  }

  /**
   * Sube todo lo pendiente. Se llama:
   *  - tras el debounce,
   *  - al pasar la app a segundo plano,
   *  - al arrancar la app (por si el proceso murió con pendientes),
   *  - cuando vuelve la red.
   * Si no hay sesión, NO se limpia el pendiente: queda para cuando entre.
   */
  static async flushToCloud() {
    const pending = await readPending();
    if (pending.size === 0) return;

    if (!AuthService.isAuthenticated()) {
      logger.debug(`💤 ${pending.size} pendientes; sin sesión, quedan para después`);
      return;
    }

    const synced = [];
    for (const animeId of pending) {
      try {
        const set = await this.getWatched(animeId);
        await this.uploadOne(animeId, [...set]);
        synced.push(animeId);
      } catch (error) {
        logger.warn(`⚠️ No se pudo subir ${animeId}: ${error.message}`);
      }
    }

    if (synced.length) {
      await clearPending(synced);
      logger.debug(`☁️ ${synced.length} anime(s) sincronizados`);
    }
  }

  /**
   * Sube UN anime. Aislado a propósito: si mañana se cambia de backend, se
   * toca solo esto. Mismo patrón que CloudHistoryService: `getFirebaseDb()` y
   * el docId `${uid}_${animeId}`.
   */
  static async uploadOne(animeId, episodes) {
    const user = AuthService.getCurrentUser();
    if (!user?.uid) throw new Error("sin usuario autenticado");

    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore no disponible");

    await setDoc(
      doc(db, "watchedEpisodes", `${user.uid}_${animeId}`),
      {
        userId: user.uid,
        animeId,
        episodes,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  /** Limpia la caché en memoria (p. ej. al cerrar sesión). */
  static resetCache() {
    _cache.clear();
  }
}

export default WatchedEpisodesService;
