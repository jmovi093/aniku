const logger = createLogger("app");
import { createLogger } from "../../utils/logger";
// hooks/api/useNetworkStatus.js
// Hook para monitorear el estado de la red

import { useState, useEffect, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";

const useNetworkStatus = () => {
  const [networkState, setNetworkState] = useState({
    isConnected: null,
    isInternetReachable: null,
    type: null,
    details: null,
  });

  const [connectionHistory, setConnectionHistory] = useState([]);

  // 🎯 Actualizar estado de red
  const updateNetworkState = useCallback((state) => {
    setNetworkState({
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      details: state.details,
    });

    // Guardar historial de conexiones
    setConnectionHistory((prev) => {
      const newEntry = {
        timestamp: Date.now(),
        isConnected: state.isConnected,
        type: state.type,
      };

      // Mantener solo los últimos 10 cambios
      return [newEntry, ...prev.slice(0, 9)];
    });
  }, []);

  // 🎯 Verificar conectividad manualmente
  const checkConnection = useCallback(async () => {
    try {
      const state = await NetInfo.fetch();
      updateNetworkState(state);
      return state;
    } catch (error) {
      logger.error("Error checking network status:", error);
      return null;
    }
  }, [updateNetworkState]);

  // 🎯 Configurar listener de red
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(updateNetworkState);

    // Verificar estado inicial
    checkConnection();

    return unsubscribe;
  }, [updateNetworkState, checkConnection]);

  // 🎯 Helpers para diferentes tipos de conexión
  const connectionHelpers = {
    isOffline: networkState.isConnected === false,
    isOnline: networkState.isConnected === true,
    hasInternet: networkState.isInternetReachable === true,

    // Tipos de conexión
    isWifi: networkState.type === NetInfo.NetInfoStateType.wifi,
    isCellular: networkState.type === NetInfo.NetInfoStateType.cellular,
    isEthernet: networkState.type === NetInfo.NetInfoStateType.ethernet,

    // Calidad de conexión (basado en tipo)
    isHighSpeed: ["wifi", "ethernet"].includes(networkState.type),
    isLowSpeed:
      networkState.type === "cellular" &&
      networkState.details?.cellularGeneration === "2g",

    // Estado de carga
    isLoading: networkState.isConnected === null,
  };

  // 🎯 Estadísticas de conexión
  const getConnectionStats = useCallback(() => {
    const recent = connectionHistory.slice(0, 5);
    const disconnections = recent.filter((entry) => !entry.isConnected).length;
    const avgConnectionTime =
      connectionHistory.length > 1
        ? (Date.now() -
            connectionHistory[connectionHistory.length - 1]?.timestamp) /
          1000
        : 0;

    return {
      recentDisconnections: disconnections,
      avgConnectionTime: Math.round(avgConnectionTime),
      totalStateChanges: connectionHistory.length,
      connectionStability:
        disconnections === 0
          ? "stable"
          : disconnections < 3
          ? "moderate"
          : "unstable",
    };
  }, [connectionHistory]);

  return {
    // Estado básico
    ...networkState,

    // Helpers de conexión
    ...connectionHelpers,

    // Historial y estadísticas
    connectionHistory,
    connectionStats: getConnectionStats(),

    // Operaciones
    refresh: checkConnection,

    // Utilidades
    getConnectionQuality: () => {
      if (!networkState.isConnected) return "offline";
      if (connectionHelpers.isHighSpeed) return "excellent";
      if (connectionHelpers.isLowSpeed) return "poor";
      return "good";
    },

    shouldShowOfflineMessage: connectionHelpers.isOffline,
    shouldLimitDataUsage: connectionHelpers.isCellular,
  };
};

export default useNetworkStatus;
