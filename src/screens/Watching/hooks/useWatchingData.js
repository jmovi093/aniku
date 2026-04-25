const logger = createLogger("app");
import { createLogger } from "../../../utils/logger";
// screens/Watching/hooks/useWatchingData.js
// Hook para gestión de datos de animes que se están viendo

import { useState, useEffect } from "react";
import HistoryService from "../../../services/HistoryService";
import AnimeService from "../../../services/AnimeService";

export const useWatchingData = (navigation) => {
  const [watching, setWatching] = useState([]);
  const [loading, setLoading] = useState(true);

  // 📱 Cargar datos iniciales
  useEffect(() => {
    loadWatching();
  }, []);

  // 🔄 Recargar cuando la pantalla recibe foco
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadWatching();
    });
    return unsubscribe;
  }, [navigation]);

  // 📺 Función para cargar lista de watching
  const loadWatching = async () => {
    try {
      setLoading(true);
      const watchingList = await HistoryService.getWatching();
      logger.debug("📺 ANIMES VIENDO:", watchingList.length);

      // Mapear datos para asegurar compatibilidad con el nuevo diseño
      const mappedWatching = watchingList.map((item, index) => {
        logger.debug(`📱 ANIME VIENDO [${index + 1}]:`, {
          animeId: item.animeId,
          animeName: item.animeName,
          thumbnail: item.thumbnail
            ? `✅ SÍ (${item.thumbnail.substring(0, 50)}...)`
            : "❌ NO",
          progress: item.progress,
          totalDuration: item.totalDuration,
        });

        return {
          ...item,
          // Asegurar que tenemos los campos correctos
          currentTime: item.progress || item.currentTime || 0, // Compatibilidad con versiones anteriores
          progressPercent: item.progressPercent || 0,
        };
      });

      setWatching(mappedWatching);
    } catch (error) {
      logger.error('Error cargando "Viendo":', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    watching,
    loading,
    loadWatching,
  };
};
