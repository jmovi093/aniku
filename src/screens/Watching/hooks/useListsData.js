const logger = createLogger("app");
import { createLogger } from "../../../utils/logger";
// screens/Watching/hooks/useListsData.js
// Hook para gestión de datos de listas personalizadas

import { useState, useEffect, useCallback } from "react";
import ListsService from "../../../services/ListsService";

export const useListsData = (navigation) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLists = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ListsService.getListsWithMeta();
      setLists(data);
    } catch (error) {
      logger.error("Error cargando listas:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadLists);
    return unsubscribe;
  }, [navigation, loadLists]);

  const deleteList = async (listId) => {
    await ListsService.deleteList(listId);
    await loadLists();
  };

  return { lists, loading, loadLists, deleteList };
};
