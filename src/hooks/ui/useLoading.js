// hooks/ui/useLoading.js
// Hook para manejar estados de loading

import { useState, useCallback } from "react";

const useLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  const [loadingStates, setLoadingStates] = useState({});

  // 🎯 Control básico de loading
  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const toggleLoading = useCallback(() => {
    setIsLoading((prev) => !prev);
  }, []);

  // 🎯 Control de loading con identificadores
  const startLoadingById = useCallback((id) => {
    setLoadingStates((prev) => ({
      ...prev,
      [id]: true,
    }));
  }, []);

  const stopLoadingById = useCallback((id) => {
    setLoadingStates((prev) => ({
      ...prev,
      [id]: false,
    }));
  }, []);

  const isLoadingById = useCallback(
    (id) => {
      return !!loadingStates[id];
    },
    [loadingStates]
  );

  // 🎯 Wrapper para funciones asíncronas
  const withLoading = useCallback(
    async (asyncFunction, loadingId = null) => {
      try {
        if (loadingId) {
          startLoadingById(loadingId);
        } else {
          startLoading();
        }

        const result = await asyncFunction();
        return result;
      } catch (error) {
        throw error;
      } finally {
        if (loadingId) {
          stopLoadingById(loadingId);
        } else {
          stopLoading();
        }
      }
    },
    [startLoading, stopLoading, startLoadingById, stopLoadingById]
  );

  // 🎯 Reset todos los estados
  const resetLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingStates({});
  }, []);

  return {
    // Estados
    isLoading,
    loadingStates,

    // Controles básicos
    startLoading,
    stopLoading,
    toggleLoading,

    // Controles por ID
    startLoadingById,
    stopLoadingById,
    isLoadingById,

    // Utilidades
    withLoading,
    resetLoading,

    // Helpers
    hasAnyLoading: isLoading || Object.values(loadingStates).some(Boolean),
  };
};

export default useLoading;
