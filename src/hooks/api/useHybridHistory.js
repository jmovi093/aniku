const logger = createLogger("history");
import { createLogger } from "../../utils/logger";
// src/hooks/api/useHybridHistory.js
// Hook React para manejar historial híbrido (local + cloud)

import { useState, useEffect, useCallback } from "react";
import HybridHistoryService from "../../services/HybridHistoryService";
import AuthService from "../../services/AuthService";

export const useHybridHistory = () => {
  const [watching, setWatching] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [error, setError] = useState(null);

  // 📋 Cargar historial
  const loadHistory = useCallback(async (forceSync = false) => {
    try {
      setLoading(true);
      setError(null);

      if (forceSync) {
        setSyncing(true);
      }

      const history = await HybridHistoryService.getWatching(forceSync);
      setWatching(history);

      if (forceSync) {
        setSyncStatus("success");
        setTimeout(() => setSyncStatus(null), 3000);
      }
    } catch (err) {
      logger.error("❌ Error cargando historial:", err);
      setError(err.message);
      setSyncStatus("error");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  // 📝 Actualizar historial
  const updateHistory = useCallback(
    async (
      animeId,
      animeName,
      episodeNo,
      currentTime,
      totalDuration,
      thumbnail
    ) => {
      try {
        setError(null);

        await HybridHistoryService.updateWatching(
          animeId,
          animeName,
          episodeNo,
          currentTime,
          totalDuration,
          thumbnail
        );

        // Recargar historial local (sin sync forzado para performance)
        await loadHistory(false);

        return { success: true };
      } catch (err) {
        logger.error("❌ Error actualizando historial:", err);
        setError(err.message);
        return { success: false, error: err.message };
      }
    },
    [loadHistory]
  );

  // 🗑️ Remover del historial
  const removeFromHistory = useCallback(async (animeId) => {
    try {
      setError(null);

      await HybridHistoryService.removeFromWatching(animeId);

      // Actualizar estado local inmediatamente
      setWatching((prev) => prev.filter((item) => item.animeId !== animeId));

      return { success: true };
    } catch (err) {
      logger.error("❌ Error removiendo del historial:", err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // 🔄 Forzar sincronización
  const forceSync = useCallback(async () => {
    try {
      setSyncing(true);
      setError(null);

      const result = await HybridHistoryService.forceSyncNow();

      if (result.success) {
        setWatching(result.data);
        setSyncStatus("success");
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      logger.error("❌ Error en sync forzado:", err);
      setError(err.message);
      setSyncStatus("error");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus(null), 3000);
    }
  }, []);

  // 🧪 Obtener información de debug
  const getDebugInfo = useCallback(async () => {
    try {
      return await HybridHistoryService.getDebugInfo();
    } catch (err) {
      logger.error("❌ Error obteniendo debug info:", err);
      return null;
    }
  }, []);

  // 🔄 Configurar auto-sync
  const setAutoSync = useCallback((enabled) => {
    HybridHistoryService.setAutoSync(enabled);
  }, []);

  // ⚡ Inicializar al montar el hook
  useEffect(() => {
    const initializeService = async () => {
      try {
        await HybridHistoryService.init();
        await loadHistory(false);
      } catch (err) {
        logger.error("❌ Error inicializando servicio híbrido:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    initializeService();
  }, [loadHistory]);

  // 👂 Escuchar cambios en autenticación
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChange(async (user) => {
      if (user) {
        logger.debug("👤 Usuario autenticado, iniciando sync...");
        // Delay para permitir que la UI se actualice
        setTimeout(() => loadHistory(true), 1000);
      } else {
        logger.debug("👤 Usuario desautenticado, modo solo local");
        setSyncStatus(null);
      }
    });

    return () => unsubscribe();
  }, [loadHistory]);

  return {
    // Estados
    watching,
    loading,
    syncing,
    syncStatus, // 'success' | 'error' | null
    error,

    // Acciones
    updateHistory,
    removeFromHistory,
    forceSync,
    refreshHistory: () => loadHistory(false),
    syncAndRefresh: () => loadHistory(true),

    // Configuración
    setAutoSync,

    // Utilidades
    getDebugInfo,

    // Estados derivados
    isEmpty: !loading && watching.length === 0,
    hasData: watching.length > 0,
    isAuthenticated: AuthService.isAuthenticated(),
    canSync: AuthService.isAuthenticated(),
  };
};

export default useHybridHistory;
