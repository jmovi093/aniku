const logger = createLogger("app");
import { createLogger } from "../../utils/logger";
// hooks/storage/useAsyncStorage.js
// Hook para manejar AsyncStorage con React

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const useAsyncStorage = (key, defaultValue = null) => {
  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🎯 Leer datos del storage
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const storedValue = await AsyncStorage.getItem(key);

      if (storedValue !== null) {
        const parsedValue = JSON.parse(storedValue);
        setData(parsedValue);
      } else {
        setData(defaultValue);
      }
    } catch (err) {
      logger.error(`Error loading data for key ${key}:`, err);
      setError(err);
      setData(defaultValue);
    } finally {
      setLoading(false);
    }
  }, [key, defaultValue]);

  // 🎯 Guardar datos en el storage
  const saveData = useCallback(
    async (value) => {
      try {
        setError(null);

        if (value === null || value === undefined) {
          await AsyncStorage.removeItem(key);
          setData(defaultValue);
        } else {
          const stringValue = JSON.stringify(value);
          await AsyncStorage.setItem(key, stringValue);
          setData(value);
        }

        return true;
      } catch (err) {
        logger.error(`Error saving data for key ${key}:`, err);
        setError(err);
        return false;
      }
    },
    [key, defaultValue]
  );

  // 🎯 Eliminar datos del storage
  const removeData = useCallback(async () => {
    try {
      setError(null);
      await AsyncStorage.removeItem(key);
      setData(defaultValue);
      return true;
    } catch (err) {
      logger.error(`Error removing data for key ${key}:`, err);
      setError(err);
      return false;
    }
  }, [key, defaultValue]);

  // 🎯 Actualizar datos (merge con objeto existente)
  const updateData = useCallback(
    async (updater) => {
      try {
        setError(null);

        const currentData = data || {};
        const newData =
          typeof updater === "function"
            ? updater(currentData)
            : { ...currentData, ...updater };

        return await saveData(newData);
      } catch (err) {
        logger.error(`Error updating data for key ${key}:`, err);
        setError(err);
        return false;
      }
    },
    [data, saveData, key]
  );

  // 🎯 Recargar datos desde storage
  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  // 🎯 Cargar datos inicialmente
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // Estados
    data,
    loading,
    error,

    // Operaciones
    save: saveData,
    remove: removeData,
    update: updateData,
    refresh,

    // Utilidades
    isReady: !loading && !error,
    hasData: data !== null && data !== undefined,
  };
};

// 🎯 Hook especializado para arrays
export const useAsyncStorageArray = (key, defaultValue = []) => {
  const { data, save, update, ...rest } = useAsyncStorage(key, defaultValue);

  const addItem = useCallback(
    async (item) => {
      const currentArray = Array.isArray(data) ? data : [];
      return await save([...currentArray, item]);
    },
    [data, save]
  );

  const removeItem = useCallback(
    async (predicate) => {
      const currentArray = Array.isArray(data) ? data : [];
      const filteredArray = currentArray.filter(
        typeof predicate === "function"
          ? (item) => !predicate(item)
          : (item) => item !== predicate
      );
      return await save(filteredArray);
    },
    [data, save]
  );

  const updateItem = useCallback(
    async (predicate, updater) => {
      const currentArray = Array.isArray(data) ? data : [];
      const updatedArray = currentArray.map((item) => {
        const shouldUpdate =
          typeof predicate === "function"
            ? predicate(item)
            : item === predicate;

        if (shouldUpdate) {
          return typeof updater === "function" ? updater(item) : updater;
        }
        return item;
      });
      return await save(updatedArray);
    },
    [data, save]
  );

  const clearArray = useCallback(async () => {
    return await save([]);
  }, [save]);

  return {
    data: Array.isArray(data) ? data : [],
    save,
    update,
    ...rest,

    // Operaciones específicas de array
    addItem,
    removeItem,
    updateItem,
    clearArray,

    // Utilidades
    length: Array.isArray(data) ? data.length : 0,
    isEmpty: !Array.isArray(data) || data.length === 0,
  };
};

export default useAsyncStorage;
