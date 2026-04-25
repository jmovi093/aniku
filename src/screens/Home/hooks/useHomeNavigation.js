const logger = createLogger("home");
import { createLogger } from "../../../utils/logger";
// screens/Home/hooks/useHomeNavigation.js
// Hook para gestión de navegación del Home

import { useCallback } from "react";

const useHomeNavigation = (navigation) => {
  // 🎬 Navegar a detalles del anime
  const handleAnimeSelect = useCallback(
    (anime) => {
      logger.debug("🎬 ANIME SELECCIONADO:", anime.name);
      navigation.navigate("Episodes", {
        animeId: anime.id,
        animeName: anime.name,
        totalEpisodes: anime.episodes,
      });
    },
    [navigation],
  );

  // 📺 Navegar a "Continuar Viendo"
  const navigateToWatching = useCallback(() => {
    navigation.jumpTo("Watching");
  }, [navigation]);

  // 🔍 Navegar a búsqueda
  const navigateToSearch = useCallback(() => {
    navigation.navigate("Search");
  }, [navigation]);

  // 📅 Navegar a schedule
  const navigateToSchedule = useCallback(() => {
    navigation.navigate("Schedule");
  }, [navigation]);

  // 📥 Navegar a descargas
  const navigateToDownloads = useCallback(() => {
    navigation.navigate("Downloads");
  }, [navigation]);

  // 🎯 Navegar a categoría específica
  const navigateToCategory = useCallback(
    (category, title) => {
      navigation.navigate("CategoryList", {
        category,
        title,
      });
    },
    [navigation],
  );

  // 🔙 Navegar hacia atrás
  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return {
    // 🎬 Navegación principal
    handleAnimeSelect,

    // 🧭 Navegación por secciones
    navigateToWatching,
    navigateToSearch,
    navigateToSchedule,
    navigateToDownloads,
    navigateToCategory,

    // 🔙 Navegación general
    goBack,

    // 🎯 Helpers
    canGoBack: navigation.canGoBack(),
  };
};

export default useHomeNavigation;
