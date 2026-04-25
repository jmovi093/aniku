const logger = createLogger("app");
import { createLogger } from "../../../utils/logger";
// screens/Watching/hooks/useWatchingNavigation.js
// Hook para navegación y acciones en watching

import AnimeService from "../../../services/AnimeService";
import HybridHistoryService from "../../../services/HybridHistoryService";
import VideoStreamService from "../../../services/VideoStreamService";
import { CustomAlert } from "../../../components/CustomAlert";

/**
 * Calcula el episodio a reproducir sin llamar a la API.
 * Replica la lógica de HistoryService.getNextEpisodeToWatch usando
 * los datos que ya están guardados en el objeto del historial.
 */
const resolveNextEpisode = (anime) => {
  const current = parseInt(anime.currentEpisode, 10);
  const progressPercent =
    anime.progressPercent ??
    (anime.totalDuration > 0
      ? (anime.progress / anime.totalDuration) * 100
      : 0);
  const nearEnd =
    anime.totalDuration > 0 && anime.totalDuration - anime.progress < 120;

  if (progressPercent > 95 || nearEnd) {
    return { episode: String(current + 1), resumeTime: 0, isNextEpisode: true };
  }

  return {
    episode: String(current),
    resumeTime: anime.progress ?? 0,
    isNextEpisode: false,
  };
};

export const useWatchingNavigation = (navigation) => {
  // ▶️ Continuar viendo anime (NAVEGACIÓN DIRECTA AL PLAYER)
  const continueWatching = async (anime) => {
    const nextEpisode = resolveNextEpisode(anime);
    logger.debug(
      "🚀 CONTINUAR VIENDO:",
      anime.animeName,
      "→ ep",
      nextEpisode.episode,
    );

    try {
      if (nextEpisode.isNextEpisode) {
        // Lanzar en paralelo: lista de episodios (para validar que existe)
        // y los enlaces de video. En el happy path no hay latencia extra.
        logger.debug(
          "🎥 Obteniendo enlaces y validando episodio en paralelo...",
        );
        const [videoLinks, episodesList] = await Promise.all([
          VideoStreamService.getVideoLinksForEpisode(
            anime.animeId,
            nextEpisode.episode,
            "sub",
            { silent: true },
          ).catch(() => null), // capturar sin romper Promise.all
          AnimeService.getEpisodesList(anime.animeId),
        ]);

        const episodeExists = episodesList.includes(nextEpisode.episode);

        if (!episodeExists) {
          // Es definitivamente el último episodio disponible
          CustomAlert.show(
            "Sin episodios nuevos",
            "No hay más episodios disponibles por ahora. ¿Quieres ver la lista de episodios?",
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Ver episodios",
                onPress: () =>
                  navigation.navigate("Episodes", {
                    animeId: anime.animeId,
                    animeName: anime.animeName,
                    totalEpisodes: episodesList.length,
                  }),
              },
            ],
            { type: "info" },
          );
          return;
        }

        if (!videoLinks || videoLinks.length === 0) {
          // El episodio existe pero no tiene providers disponibles aún
          Alert.alert(
            "Episodio no disponible",
            "El episodio existe pero las fuentes de video no están disponibles todavía. ¿Quieres ver la lista de episodios?",
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Ver episodios",
                onPress: () =>
                  navigation.navigate("Episodes", {
                    animeId: anime.animeId,
                    animeName: anime.animeName,
                    totalEpisodes: episodesList.length,
                  }),
              },
            ],
          );
          return;
        }

        navigation.navigate("Player", {
          videoLinks,
          animeName: anime.animeName,
          episodeNumber: nextEpisode.episode,
          animeId: anime.animeId,
          thumbnail: anime.thumbnail || null,
          resumeTime: nextEpisode.resumeTime,
          totalEpisodes: episodesList.length,
          fromDirectNavigation: true,
        });
      } else {
        // Continuar en el episodio actual — solo necesitamos los enlaces
        logger.debug("🎥 Obteniendo enlaces de video...");
        const videoLinks = await VideoStreamService.getVideoLinksForEpisode(
          anime.animeId,
          nextEpisode.episode,
        );

        if (!videoLinks || videoLinks.length === 0) {
          throw new Error("NO_LINKS");
        }

        navigation.navigate("Player", {
          videoLinks,
          animeName: anime.animeName,
          episodeNumber: nextEpisode.episode,
          animeId: anime.animeId,
          thumbnail: anime.thumbnail || null,
          resumeTime: nextEpisode.resumeTime,
          fromDirectNavigation: true,
          // totalEpisodes desconocido en este path — pre-fetch lo resolverá
        });
      }
    } catch (error) {
      logger.error("❌ Error en navegación directa:", error.message);
      logger.debug("🔄 Fallback: Navegando a Episodes...");
      navigation.navigate("Episodes", {
        animeId: anime.animeId,
        animeName: anime.animeName,
        autoPlayEpisode: nextEpisode.episode,
        autoPlayResumeTime: nextEpisode.resumeTime,
        fromWatching: true,
      });
    }
  };

  // 🗑️ Eliminar de watching
  const removeFromWatching = async (animeId, loadWatching) => {
    try {
      await HybridHistoryService.removeFromWatching(animeId);
      logger.debug("🗑️ Eliminado de watching (local + cloud):", animeId);
      if (loadWatching) loadWatching();
    } catch (error) {
      logger.error("❌ Error eliminando de watching:", error);
    }
  };

  // 📋 Ver episodios del anime
  const viewAnimeEpisodes = (anime) => {
    navigation.navigate("Episodes", {
      animeId: anime.animeId,
      animeName: anime.animeName,
    });
  };

  return {
    continueWatching,
    removeFromWatching,
    viewAnimeEpisodes,
  };
};
