const logger = createLogger("history");
import { createLogger } from "../utils/logger";
// src/services/CloudHistoryService.js
// Servicio para sincronizar historial de visualización con Firebase Firestore

import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  enableNetwork,
  disableNetwork,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import AuthService from "./AuthService";

class CloudHistoryService {
  static COLLECTION_NAME = "userWatchHistory";
  static MAX_HISTORY_ITEMS = 100;

  // �️ Eliminar entrada del historial en Firestore
  static async deleteWatchingEntry(animeId) {
    const user = AuthService.getCurrentUser();
    if (!user) return { success: false, reason: "not_authenticated" };

    const docId = `${user.uid}_${animeId}`;
    await deleteDoc(doc(db, this.COLLECTION_NAME, docId));
    logger.debug("☁️ Removido de cloud:", docId);
    return { success: true };
  }

  // �📤 Subir entrada de historial a Firestore
  static async uploadWatchingEntry(watchingEntry) {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) {
        logger.debug("⚠️ No hay usuario autenticado, skipping cloud sync");
        return { success: false, reason: "not_authenticated" };
      }

      const docId = `${user.uid}_${watchingEntry.animeId}`;
      const cloudEntry = {
        userId: user.uid,
        animeId: watchingEntry.animeId ?? null,
        animeName: watchingEntry.animeName ?? null,
        currentEpisode: watchingEntry.currentEpisode ?? null,
        progress: watchingEntry.progress ?? null,
        totalDuration: watchingEntry.totalDuration ?? null,
        progressPercent: watchingEntry.progressPercent ?? null,
        thumbnail: watchingEntry.thumbnail ?? null,
        lastWatched: watchingEntry.lastWatched ?? null,
        updatedAt: serverTimestamp(),
        deviceInfo: {
          platform: "mobile",
          appVersion: "1.0.0",
        },
      };

      await setDoc(doc(db, this.COLLECTION_NAME, docId), cloudEntry, {
        merge: true,
      });

      logger.debug("☁️ Historial subido a Firestore:", watchingEntry.animeName);
      return { success: true };
    } catch (error) {
      logger.error("❌ Error subiendo historial a Firestore:", error);
      return { success: false, error: error.message };
    }
  }

  // 📥 Descargar historial completo del usuario desde Firestore
  static async downloadUserHistory() {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) {
        logger.debug("⚠️ No hay usuario autenticado para descargar historial");
        return { success: false, data: [], reason: "not_authenticated" };
      }

      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("userId", "==", user.uid),
        orderBy("lastWatched", "desc"),
        limit(this.MAX_HISTORY_ITEMS),
      );

      const querySnapshot = await getDocs(q);
      const cloudHistory = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        cloudHistory.push({
          animeId: data.animeId,
          animeName: data.animeName,
          currentEpisode: data.currentEpisode,
          progress: data.progress,
          totalDuration: data.totalDuration,
          progressPercent: data.progressPercent,
          thumbnail: data.thumbnail,
          lastWatched: data.lastWatched,
          // Metadatos cloud (opcional)
          cloudUpdatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
          deviceInfo: data.deviceInfo || null,
        });
      });

      logger.debug(
        `☁️ Descargados ${cloudHistory.length} items del historial cloud`,
      );
      return { success: true, data: cloudHistory };
    } catch (error) {
      logger.error("❌ Error descargando historial de Firestore:", error);
      return { success: false, data: [], error: error.message };
    }
  }

  // 🔄 Sincronizar datos locales con la nube
  static async syncLocalToCloud(localHistory) {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) {
        return { success: false, reason: "not_authenticated", synced: 0 };
      }

      let syncCount = 0;
      const errors = [];

      // Subir cada entrada local a la nube
      for (const entry of localHistory) {
        const result = await this.uploadWatchingEntry(entry);
        if (result.success) {
          syncCount++;
        } else {
          errors.push({ animeId: entry.animeId, error: result.error });
        }
      }

      logger.debug(
        `☁️ Sync completado: ${syncCount}/${localHistory.length} items sincronizados`,
      );

      return {
        success: true,
        synced: syncCount,
        total: localHistory.length,
        errors: errors,
      };
    } catch (error) {
      logger.error("❌ Error en sync local → cloud:", error);
      return { success: false, error: error.message, synced: 0 };
    }
  }

  // 🔗 Merge de datos locales y cloud (resolver conflictos)
  static mergeHistories(localHistory, cloudHistory) {
    try {
      const merged = [];
      const processedAnimeIds = new Set();

      // Crear un mapa de datos cloud por animeId para búsqueda rápida
      const cloudMap = new Map();
      cloudHistory.forEach((item) => {
        cloudMap.set(item.animeId, item);
      });

      // Procesar historial local
      localHistory.forEach((localItem) => {
        const cloudItem = cloudMap.get(localItem.animeId);

        if (cloudItem) {
          // Conflicto: existe en ambos lados
          // Regla 1: si es el mismo episodio, siempre conservar el mayor progreso
          // (el progreso solo debe avanzar, nunca retroceder)
          // Regla 2: si el episodio cambió, usar el más reciente por timestamp
          let winner;
          if (localItem.currentEpisode === cloudItem.currentEpisode) {
            const localProgress = localItem.progress || 0;
            const cloudProgress = cloudItem.progress || 0;
            winner = localProgress >= cloudProgress ? localItem : cloudItem;
            logger.debug(
              `🔄 Conflict resolved for ${localItem.animeName} ep${localItem.currentEpisode}: progress ${localProgress} vs ${cloudProgress} → ${winner === localItem ? "local" : "cloud"} wins`,
            );
          } else {
            const localDate = new Date(localItem.lastWatched);
            const cloudDate = new Date(cloudItem.lastWatched);
            winner = localDate > cloudDate ? localItem : cloudItem;
            logger.debug(
              `🔄 Conflict resolved for ${localItem.animeName} ep changed: ${
                winner === localItem ? "local" : "cloud"
              } wins`,
            );
          }
          merged.push(winner);
        } else {
          // Solo existe localmente
          merged.push(localItem);
        }

        processedAnimeIds.add(localItem.animeId);
      });

      // Agregar items que solo existen en cloud
      cloudHistory.forEach((cloudItem) => {
        if (!processedAnimeIds.has(cloudItem.animeId)) {
          merged.push(cloudItem);
        }
      });

      // Ordenar por fecha de última visualización
      merged.sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched));

      // Limitar a máximo de items
      const finalMerged = merged.slice(0, this.MAX_HISTORY_ITEMS);

      logger.debug(
        `🔗 Merge completado: ${localHistory.length} local + ${cloudHistory.length} cloud = ${finalMerged.length} final`,
      );

      return finalMerged;
    } catch (error) {
      logger.error("❌ Error en merge de historiales:", error);
      return localHistory; // Fallback a local
    }
  }

  // 👁️ Escuchar cambios en tiempo real (opcional)
  static subscribeToHistoryChanges(userId, callback) {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("userId", "==", userId),
        orderBy("lastWatched", "desc"),
        limit(20), // Solo los más recientes para tiempo real
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const realtimeHistory = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          realtimeHistory.push({
            animeId: data.animeId,
            animeName: data.animeName,
            currentEpisode: data.currentEpisode,
            progress: data.progress,
            totalDuration: data.totalDuration,
            progressPercent: data.progressPercent,
            thumbnail: data.thumbnail,
            lastWatched: data.lastWatched,
            cloudUpdatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
          });
        });

        logger.debug(
          `🔴 Tiempo real: ${realtimeHistory.length} items actualizados`,
        );
        callback(realtimeHistory);
      });

      return unsubscribe;
    } catch (error) {
      logger.error("❌ Error configurando listener tiempo real:", error);
      return null;
    }
  }

  // 🌐 Verificar conectividad y habilitar/deshabilitar red
  static async setOfflineMode(offline = false) {
    try {
      if (offline) {
        await disableNetwork(db);
        logger.debug("📴 Firestore: Modo offline activado");
      } else {
        await enableNetwork(db);
        logger.debug("📶 Firestore: Modo online activado");
      }
      return true;
    } catch (error) {
      logger.error("❌ Error cambiando modo de red:", error);
      return false;
    }
  }

  // 🧪 Debug: Obtener estadísticas de sync
  static async getCloudStats() {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) return null;

      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("userId", "==", user.uid),
      );

      const querySnapshot = await getDocs(q);
      const stats = {
        totalItems: querySnapshot.size,
        lastSync: null,
        devices: new Set(),
      };

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.updatedAt && data.updatedAt.toDate) {
          const updateDate = data.updatedAt.toDate();
          if (!stats.lastSync || updateDate > stats.lastSync) {
            stats.lastSync = updateDate;
          }
        }
        if (data.deviceInfo?.platform) {
          stats.devices.add(data.deviceInfo.platform);
        }
      });

      stats.devices = Array.from(stats.devices);

      logger.debug("📊 Cloud stats:", stats);
      return stats;
    } catch (error) {
      logger.error("❌ Error obteniendo stats cloud:", error);
      return null;
    }
  }
}

export default CloudHistoryService;
