const logger = createLogger("app");
import { createLogger } from "../../utils/logger";
// hooks/api/useApi.js
// Hook para manejar llamadas API de forma consistente

import { useState, useEffect, useCallback, useRef } from "react";
import useLoading from "../ui/useLoading";
import useNetworkStatus from "./useNetworkStatus";

const useApi = (apiFunction, options = {}) => {
  const {
    immediate = false,
    dependencies = [],
    retries = 1,
    retryDelay = 1000,
    onSuccess,
    onError,
    transformData = (data) => data,
  } = options;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const { isLoading, startLoading, stopLoading } = useLoading();
  const { isOnline } = useNetworkStatus();

  const retryCountRef = useRef(0);
  const abortControllerRef = useRef(null);

  // 🎯 Función principal para ejecutar la API
  const execute = useCallback(
    async (...args) => {
      // Verificar conexión
      if (!isOnline) {
        const offlineError = new Error("No hay conexión a internet");
        offlineError.code = "OFFLINE";
        setError(offlineError);
        onError?.(offlineError);
        return { data: null, error: offlineError };
      }

      try {
        startLoading();
        setError(null);

        // Cancelar request anterior si existe
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Crear nuevo AbortController
        abortControllerRef.current = new AbortController();

        const response = await apiFunction(...args, {
          signal: abortControllerRef.current.signal,
        });

        const transformedData = transformData(response);
        setData(transformedData);

        retryCountRef.current = 0; // Reset retry count on success
        onSuccess?.(transformedData);

        return { data: transformedData, error: null };
      } catch (err) {
        // Ignorar errores de abort
        if (err.name === "AbortError") {
          return { data: null, error: null };
        }

        logger.error("API Error:", err);

        // Intentar retry si es necesario
        if (retryCountRef.current < retries && shouldRetry(err)) {
          retryCountRef.current++;

          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * retryCountRef.current)
          );

          return execute(...args);
        }

        setError(err);
        onError?.(err);
        retryCountRef.current = 0;

        return { data: null, error: err };
      } finally {
        stopLoading();
        abortControllerRef.current = null;
      }
    },
    [
      apiFunction,
      isOnline,
      startLoading,
      stopLoading,
      retries,
      retryDelay,
      transformData,
      onSuccess,
      onError,
    ]
  );

  // 🎯 Función para refetch
  const refetch = useCallback(
    (...args) => {
      retryCountRef.current = 0;
      return execute(...args);
    },
    [execute]
  );

  // 🎯 Función para reset del estado
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    retryCountRef.current = 0;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // 🎯 Función para cancelar request
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // 🎯 Ejecutar automáticamente si immediate = true
  useEffect(() => {
    if (immediate && isOnline) {
      execute();
    }
  }, [immediate, isOnline, ...dependencies]);

  // 🎯 Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // Estados
    data,
    error,
    isLoading,

    // Operaciones
    execute,
    refetch,
    reset,
    cancel,

    // Estado calculado
    isSuccess: !isLoading && !error && data !== null,
    isError: !isLoading && error !== null,
    isEmpty: !isLoading && !error && (data === null || data === undefined),

    // Información adicional
    retryCount: retryCountRef.current,
    canRetry: retryCountRef.current < retries,
  };
};

// 🎯 Helper para determinar si se debe hacer retry
const shouldRetry = (error) => {
  // No retry en errores de cliente (4xx)
  if (error.status >= 400 && error.status < 500) {
    return false;
  }

  // Retry en errores de servidor (5xx) y errores de red
  return true;
};

// 🎯 Hook especializado para listas paginadas
export const useApiList = (apiFunction, options = {}) => {
  const { pageSize = 20, initialPage = 1, ...apiOptions } = options;

  const [items, setItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const {
    execute: executeApi,
    isLoading,
    error,
    reset: resetApi,
  } = useApi(apiFunction, {
    ...apiOptions,
    transformData: (response) => {
      const { data, pagination } = response;
      return {
        items: data || [],
        hasNextPage: pagination?.hasNextPage ?? false,
        totalCount: pagination?.totalCount ?? 0,
      };
    },
  });

  const loadPage = useCallback(
    async (page = currentPage, append = false) => {
      const result = await executeApi({ page, pageSize });

      if (result.data) {
        const {
          items: newItems,
          hasNextPage: hasNext,
          totalCount: total,
        } = result.data;

        setItems((prev) => (append ? [...prev, ...newItems] : newItems));
        setHasNextPage(hasNext);
        setTotalCount(total);
        setCurrentPage(page);
      }

      return result;
    },
    [executeApi, currentPage, pageSize]
  );

  const loadNextPage = useCallback(() => {
    if (hasNextPage && !isLoading) {
      return loadPage(currentPage + 1, true);
    }
  }, [hasNextPage, isLoading, loadPage, currentPage]);

  const refresh = useCallback(() => {
    setCurrentPage(initialPage);
    return loadPage(initialPage, false);
  }, [loadPage, initialPage]);

  const reset = useCallback(() => {
    setItems([]);
    setCurrentPage(initialPage);
    setHasNextPage(true);
    setTotalCount(0);
    resetApi();
  }, [resetApi, initialPage]);

  return {
    // Estados
    items,
    isLoading,
    error,
    currentPage,
    hasNextPage,
    totalCount,

    // Operaciones
    loadPage,
    loadNextPage,
    refresh,
    reset,

    // Estado calculado
    isEmpty: items.length === 0 && !isLoading && !error,
    isFirstPage: currentPage === initialPage,
    canLoadMore: hasNextPage && !isLoading,
  };
};

export default useApi;
