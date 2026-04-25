const logger = createLogger("search");
import { createLogger } from "../../../utils/logger";
// screens/Search/hooks/useSearchNavigation.js
// Hook para navegación en búsquedas

import { useCallback } from "react";

const useSearchNavigation = (navigation) => {
  // 🎬 Navegar a detalles del anime
  const handleAnimeSelect = useCallback(
    (anime) => {
      logger.debug("🎬 ANIME SELECCIONADO (BÚSQUEDA):", anime.name);
      navigation.navigate("Episodes", {
        animeId: anime.id,
        animeName: anime.name,
        totalEpisodes: anime.episodes,
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

  // 🏠 Navegar al home
  const navigateToHome = useCallback(() => {
    navigation.navigate("Home");
  }, [navigation]);

  return {
    // 🎬 Navegación principal
    handleAnimeSelect,

    // 🧭 Navegación general
    goBack,
    navigateToHome,

    // 🎯 Helpers
    canGoBack: navigation.canGoBack(),
  };
};

export default useSearchNavigation;
