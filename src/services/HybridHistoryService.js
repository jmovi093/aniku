const logger = createLogger("history");
import { createLogger } from "../utils/logger";
// src/services/HybridHistoryService.js
// Servicio híbrido que maneja historial local (AsyncStorage) + cloud (Firestore)
// Mantiene compatibilidad offline y sincronización automática

import HistoryService from "./HistoryService";
import CloudHistoryService from "./CloudHistoryService";
import AuthService from "./AuthService";
import NetInfo from "@react-native-community/netinfo";
import ListsService from "./ListsService";

class HybridHistoryService {
  static isOnline = true;
  static syncInProgress = false;
  static lastSyncTimestamp = null;
  static autoSyncEnabled = true;

  // 🚀 Inicializar el servicio híbrido
  static async init() {
    try {
      logger.debug("🔄 Inicializando HybridHistoryService...");

      // Detectar estado de red
      this.setupNetworkListener();

      // Esperar a que Firebase restaure la sesión (async)
      // getCurrentUser() puede ser null en el primer render aunque haya sesión activa
      AuthService.onAuthStateChange(async (user) => {
        if (user && this.isOnline) {
          logger.debug("🔑 Auth restaurado:", user.email, "- lanzando sync...");
          this.performInitialSync();
          ListsService.syncFromCloud();
        }
      });

      logger.debug("✅ HybridHistoryService inicializado");
    } catch (error) {
      logger.error("❌ Error inicializando HybridHistoryService:", error);
    }
  }

  // 📡 Configurar listener de conectividad
  static setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;

      logger.debug(`📶 Red: ${this.isOnline ? "ONLINE" : "OFFLINE"}`);

      // Si acabamos de conectarnos y hay usuario, hacer sync
      if (!wasOnline && this.isOnline && AuthService.isAuthenticated()) {
        setTimeout(() => {
          this.performAutoSync();
          ListsService.syncFromCloud();
        }, 2000);
      }
    });
  }

  // 📚 Actualizar historial (MÉTODO PRINCIPAL)
  static async updateWatching(
    animeId,
    animeName,
    episodeNo,
    currentTime = 0,
    totalDuration = 0,
    thumbnail = null,
  ) {
    try {
      logger.debug("📝 HybridHistoryService: Actualizando historial...");

      // 1. SIEMPRE actualizar local primero (garantiza offline)
      await HistoryService.updateWatching(
        animeId,
        animeName,
        episodeNo,
        currentTime,
        totalDuration,
        thumbnail,
      );

      // 2. Si hay usuario autenticado y conexión, sync a cloud
      if (AuthService.isAuthenticated() && this.isOnline) {
        try {
          const watchingEntry = {
            animeId,
            animeName,
            currentEpisode: episodeNo,
            progress: Math.round(currentTime),
            totalDuration: Math.round(totalDuration),
            progressPercent:
              totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0,
            thumbnail,
            lastWatched: new Date().toISOString(),
          };

          const result =
            await CloudHistoryService.uploadWatchingEntry(watchingEntry);
          if (result.success) {
            logger.debug("☁️ Sincronizado a cloud exitosamente");
          }
        } catch (cloudError) {
          logger.warn(
            "⚠️ Error sync cloud (continuando offline):",
            cloudError.message,
          );
        }
      }

      return { success: true };
    } catch (error) {
      logger.error("❌ Error en updateWatching híbrido:", error);
      throw error;
    }
  }

  // 📋 Obtener historial (con sync automático)
  static async getWatching(forceSync = false) {
    try {
      // 1. Obtener datos locales
      const localHistory = await HistoryService.getWatching();

      // 2. Si no hay usuario o no hay conexión, retornar solo local
      if (!AuthService.isAuthenticated() || !this.isOnline) {
        logger.debug("📱 Retornando historial solo local");
        return localHistory;
      }

      // 3. Si el sync está en progreso y no es forzado, retornar local
      if (this.syncInProgress && !forceSync) {
        logger.debug("🔄 Sync en progreso, retornando local");
        return localHistory;
      }

      // 4. Hacer sync si es necesario
      if (forceSync || this.shouldAutoSync()) {
        const syncedHistory = await this.performSync(localHistory);
        return syncedHistory || localHistory; // Fallback a local
      }

      return localHistory;
    } catch (error) {
      logger.error("❌ Error en getWatching híbrido:", error);
      // Fallback a local en caso de error
      return await HistoryService.getWatching();
    }
  }

  // 🔄 Realizar sincronización inicial (al login)
  static async performInitialSync() {
    try {
      if (!AuthService.isAuthenticated() || !this.isOnline) {
        return { success: false, reason: "not_ready" };
      }

      this.syncInProgress = true;
      logger.debug("🚀 Iniciando sync inicial...");

      // 1. Obtener datos locales
      const localHistory = await HistoryService.getWatching();

      // 2. Obtener datos de cloud
      const cloudResult = await CloudHistoryService.downloadUserHistory();

      if (!cloudResult.success) {
        logger.warn("⚠️ No se pudo descargar historial cloud");
        this.syncInProgress = false;
        return { success: false, error: cloudResult.error };
      }

      // 3. Merge de datos
      const mergedHistory = CloudHistoryService.mergeHistories(
        localHistory,
        cloudResult.data,
      );

      // 4. Guardar merged data localmente
      await this.saveLocalHistory(mergedHistory);

      // 5. Sync cualquier cambio a cloud
      await CloudHistoryService.syncLocalToCloud(mergedHistory);

      this.lastSyncTimestamp = Date.now();
      this.syncInProgress = false;

      logger.debug(`✅ Sync inicial completado: ${mergedHistory.length} items`);
      return { success: true, items: mergedHistory.length };
    } catch (error) {
      logger.error("❌ Error en sync inicial:", error);
      this.syncInProgress = false;
      return { success: false, error: error.message };
    }
  }

  // 🔄 Realizar sync automático
  static async performAutoSync() {
    if (!this.autoSyncEnabled || this.syncInProgress) {
      return;
    }

    try {
      logger.debug("🔄 Auto-sync iniciado...");
      const localHistory = await HistoryService.getWatching();
      return await this.performSync(localHistory);
    } catch (error) {
      logger.error("❌ Error en auto-sync:", error);
    }
  }

  // 🔄 Sync principal (lógica core)
  static async performSync(localHistory) {
    try {
      if (this.syncInProgress) {
        logger.debug("⚠️ Sync ya en progreso, skipping");
        return localHistory;
      }

      this.syncInProgress = true;

      // 1. Descargar datos cloud
      const cloudResult = await CloudHistoryService.downloadUserHistory();

      if (!cloudResult.success) {
        this.syncInProgress = false;
        return localHistory;
      }

      // 2. Merge
      const mergedHistory = CloudHistoryService.mergeHistories(
        localHistory,
        cloudResult.data,
      );

      // 3. Guardar local
      await this.saveLocalHistory(mergedHistory);

      // 4. Subir cambios a cloud
      await CloudHistoryService.syncLocalToCloud(mergedHistory);

      this.lastSyncTimestamp = Date.now();
      this.syncInProgress = false;

      logger.debug(`🔄 Sync completado: ${mergedHistory.length} items`);
      return mergedHistory;
    } catch (error) {
      logger.error("❌ Error en performSync:", error);
      this.syncInProgress = false;
      return localHistory;
    }
  }

  // 💾 Guardar historial merged localmente
  static async saveLocalHistory(mergedHistory) {
    try {
      // Usar el método interno de AsyncStorage directamente
      await import("@react-native-async-storage/async-storage").then(
        async (AsyncStorage) => {
          await AsyncStorage.default.setItem(
            HistoryService.WATCHING_KEY,
            JSON.stringify(mergedHistory.slice(0, 20)), // Limitar a 20 items
          );
        },
      );

      logger.debug("💾 Historial merged guardado localmente");
    } catch (error) {
      logger.error("❌ Error guardando historial merged:", error);
    }
  }

  // ❓ Determinar si debe hacer auto-sync
  static shouldAutoSync() {
    if (
      !this.autoSyncEnabled ||
      !AuthService.isAuthenticated() ||
      !this.isOnline
    ) {
      return false;
    }

    // Auto-sync cada 5 minutos
    const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutos
    return (
      !this.lastSyncTimestamp ||
      Date.now() - this.lastSyncTimestamp > SYNC_INTERVAL
    );
  }

  // 🗑️ Remover de historial (híbrido)
  static async removeFromWatching(animeId) {
    try {
      // 1. Remover local
      await HistoryService.removeFromWatching(animeId);

      // 2. Si hay usuario y conexión, también remover de cloud
      if (AuthService.isAuthenticated() && this.isOnline) {
        try {
          await CloudHistoryService.deleteWatchingEntry(animeId);
          logger.debug("☁️ Removido de cloud también");
        } catch (cloudError) {
          logger.warn("⚠️ Error removiendo de cloud:", cloudError.message);
        }
      }

      return { success: true };
    } catch (error) {
      logger.error("❌ Error en removeFromWatching híbrido:", error);
      throw error;
    }
  }

  // ⚙️ Configuración
  static setAutoSync(enabled) {
    this.autoSyncEnabled = enabled;
    logger.debug(`⚙️ Auto-sync ${enabled ? "activado" : "desactivado"}`);
  }

  // 🧪 Debug y estadísticas
  static async getDebugInfo() {
    try {
      const localHistory = await HistoryService.getWatching();
      const cloudStats = await CloudHistoryService.getCloudStats();

      return {
        isOnline: this.isOnline,
        isAuthenticated: AuthService.isAuthenticated(),
        syncInProgress: this.syncInProgress,
        lastSyncTimestamp: this.lastSyncTimestamp,
        autoSyncEnabled: this.autoSyncEnabled,
        localItems: localHistory.length,
        cloudStats: cloudStats,
        userEmail: AuthService.getCurrentUserEmail(),
      };
    } catch (error) {
      logger.error("❌ Error obteniendo debug info:", error);
      return null;
    }
  }

  // 🔄 Forzar sync manual
  static async forceSyncNow() {
    try {
      logger.debug("🔄 Forzando sync manual...");
      const localHistory = await HistoryService.getWatching();
      const result = await this.performSync(localHistory);
      await ListsService.syncFromCloud();
      return { success: true, data: result };
    } catch (error) {
      logger.error("❌ Error en sync manual:", error);
      return { success: false, error: error.message };
    }
  }
}

export default HybridHistoryService;
