const logger = createLogger("player");
import { createLogger } from "../../../utils/logger";
// hooks/useEpisodePlayer.js
// Custom hook para manejar la lógica de reproducción de episodios

import { useState, useCallback } from "react";
import { Alert } from "react-native";
import AnimeService from "../../../services/AnimeService";
import VideoService from "../../../services/VideoService";
import DownloadService from "../../../services/DownloadService";
import HistoryService from "../../../services/HistoryService";
import {
  canPlayEpisode,
  isEpisodeDownloaded,
} from "../utils/animeDetailsUtils";

/**
 * Custom hook para manejar la reproducción y descarga de episodios
 * @param {string} animeId - ID del anime
 * @param {string} animeTitle - Título del anime
 * @param {Function} onNavigateToPlayer - Callback para navegar al reproductor
 * @returns {Object} Estado y funciones del hook
 */
export const useEpisodePlayer = (
  animeId,
  animeTitle,
  animeDetails,
  onNavigateToPlayer,
) => {
  // 📊 Estados de reproducción
  const [loadingEpisodeId, setLoadingEpisodeId] = useState(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [processingMessage] = useState("");

  /**
   * 🎬 Maneja la selección y reproducción de un episodio
   */
  const handleEpisodeSelect = useCallback(
    async (episodeNumber, isOffline, downloadedEpisodes) => {
      // Verificar si el episodio puede reproducirse
      if (!canPlayEpisode(episodeNumber, downloadedEpisodes, isOffline)) {
        Alert.alert(
          "Episodio no disponible",
          "Este episodio no está descargado y necesitas conexión a internet para verlo.",
          [{ text: "OK" }],
        );
        return;
      }

      try {
        setLoadingEpisodeId(episodeNumber);

        let videoUrl = null;
        let isLocal = false;

        // Si el episodio está descargado, usar archivo local
        if (isEpisodeDownloaded(episodeNumber, downloadedEpisodes)) {
          const localPath = await DownloadService.getEpisodeLocalPath(
            animeId,
            episodeNumber,
          );
          if (localPath) {
            videoUrl = localPath;
            isLocal = true;
          }
        }

        // Si no hay archivo local o estamos online, obtener URL de streaming
        if (!videoUrl && !isOffline) {
          // Usar el pipeline optimizado de AnimeService
          const videoData = await AnimeService.getOptimizedVideoLinks(
            animeId,
            episodeNumber,
          );

          if (videoData && videoData.videoUrl) {
            videoUrl = videoData.videoUrl;
          } else {
            throw new Error("No se encontraron fuentes de video válidas");
          }
        }

        if (!videoUrl) {
          throw new Error("No se pudo obtener la URL del video");
        }

        // Guardar en historial
        try {
          await HistoryService.addToHistory({
            animeId,
            animeTitle,
            episodeNumber,
            timestamp: Date.now(),
            isLocal,
          });
        } catch (historyError) {
          logger.warn("Error saving to history:", historyError);
          // No interrumpir la reproducción por errores de historial
        }

        // Navegar al reproductor

        logger.debug("🎬 NAVEGANDO AL PLAYER:");
        logger.debug("   animeDetails:", animeDetails ? "✅ SÍ" : "❌ NO");
        logger.debug(
          "   animeDetails.thumbnail:",
          animeDetails?.thumbnail
            ? `✅ SÍ (${animeDetails.thumbnail.substring(0, 50)}...)`
            : "❌ NO",
        );

        if (onNavigateToPlayer) {
          onNavigateToPlayer("Player", {
            videoUrl,
            animeTitle,
            episodeNumber,
            animeId,
            thumbnail: animeDetails?.thumbnail || null, // ← NUEVO: Incluir thumbnail
            isLocal,
          });
        }
      } catch (error) {
        logger.error("Error selecting episode:", error);

        let errorMessage = "Error al procesar el episodio";

        // Mensajes de error específicos
        if (error.message.includes("No se encontraron fuentes")) {
          errorMessage =
            "No se encontraron fuentes de video para este episodio";
        } else if (error.message.includes("conexión")) {
          errorMessage =
            "Error de conexión. Verifica tu internet e intenta nuevamente.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "La operación tardó demasiado. Intenta nuevamente.";
        }

        Alert.alert("Error", errorMessage, [{ text: "OK" }]);
      } finally {
        setLoadingEpisodeId(null);
      }
    },
    [animeId, animeTitle, animeDetails, onNavigateToPlayer],
  );

  /**
   * 📥 Descarga un episodio individual
   */
  const downloadEpisode = useCallback(
    async (episodeNumber, isOffline, downloadedEpisodes, onDownloadUpdate) => {
      if (isOffline) {
        Alert.alert(
          "Sin conexión",
          "Necesitas conexión a internet para descargar episodios.",
          [{ text: "OK" }],
        );
        return;
      }

      if (isEpisodeDownloaded(episodeNumber, downloadedEpisodes)) {
        Alert.alert(
          "Episodio ya descargado",
          "¿Quieres descargar nuevamente este episodio?",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Reemplazar",
              onPress: () =>
                performDownload(episodeNumber, onDownloadUpdate, true),
            },
          ],
        );
        return;
      }

      await performDownload(episodeNumber, onDownloadUpdate, false);
    },
    [animeId],
  );

  /**
   * 📥 Realiza la descarga de un episodio
   */
  const performDownload = useCallback(
    async (episodeNumber, onDownloadUpdate, isReplace = false) => {
      try {
        // Obtener URL del video usando el pipeline optimizado
        const videoData = await AnimeService.getOptimizedVideoLinks(
          animeId,
          episodeNumber,
        );

        if (!videoData || !videoData.videoUrl) {
          throw new Error("No se pudo obtener la URL del video para descarga");
        }

        // Iniciar descarga
        const downloadResult = await DownloadService.downloadEpisode({
          animeId,
          animeTitle,
          episodeNumber,
          videoUrl: videoData.videoUrl,
          quality: videoData.quality || "HD",
        });

        if (downloadResult.success) {
          Alert.alert(
            "Descarga iniciada",
            `Episodio ${episodeNumber} se está descargando en segundo plano.`,
            [{ text: "OK" }],
          );

          // Actualizar lista de descargas si se proporciona callback
          if (onDownloadUpdate) {
            onDownloadUpdate();
          }
        } else {
          throw new Error(
            downloadResult.error || "Error al iniciar la descarga",
          );
        }
      } catch (error) {
        logger.error("Error downloading episode:", error);
        Alert.alert(
          "Error de descarga",
          error.message || "No se pudo descargar el episodio",
          [{ text: "OK" }],
        );
      }
    },
    [animeId, animeTitle],
  );

  /**
   * 📥 Descarga todos los episodios disponibles
   */
  const downloadAllEpisodes = useCallback(
    async (episodes, isOffline, downloadedEpisodes, onDownloadUpdate) => {
      if (isOffline) {
        Alert.alert(
          "Sin conexión",
          "Necesitas conexión a internet para descargar episodios.",
          [{ text: "OK" }],
        );
        return;
      }

      if (!episodes || episodes.length === 0) {
        Alert.alert(
          "Sin episodios",
          "No hay episodios disponibles para descargar.",
          [{ text: "OK" }],
        );
        return;
      }

      // Filtrar episodios no descargados
      const episodesToDownload = episodes.filter(
        (ep) => !isEpisodeDownloaded(ep.episode, downloadedEpisodes),
      );

      if (episodesToDownload.length === 0) {
        Alert.alert(
          "Todos descargados",
          "Todos los episodios ya están descargados.",
          [{ text: "OK" }],
        );
        return;
      }

      Alert.alert(
        "Descargar todos los episodios",
        `¿Quieres descargar ${episodesToDownload.length} episodios? Esto puede tomar bastante tiempo y usar mucho almacenamiento.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Descargar",
            onPress: () =>
              performBulkDownload(episodesToDownload, onDownloadUpdate),
          },
        ],
      );
    },
    [animeId, animeTitle],
  );

  /**
   * 📥 Realiza descarga masiva de episodios
   */
  const performBulkDownload = useCallback(
    async (episodesToDownload, onDownloadUpdate) => {
      try {
        setIsDownloadingAll(true);
        let successCount = 0;
        let failCount = 0;

        for (const episode of episodesToDownload) {
          try {
            // Obtener URL del video
            const videoData = await AnimeService.getOptimizedVideoLinks(
              animeId,
              episode.episode,
            );

            if (videoData && videoData.videoUrl) {
              // Iniciar descarga
              const downloadResult = await DownloadService.downloadEpisode({
                animeId,
                animeTitle,
                episodeNumber: episode.episode,
                videoUrl: videoData.videoUrl,
                quality: videoData.quality || "HD",
              });

              if (downloadResult.success) {
                successCount++;
              } else {
                failCount++;
              }
            } else {
              failCount++;
            }

            // Pequeña pausa entre descargas para no sobrecargar
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (error) {
            logger.error(
              `Error downloading episode ${episode.episode}:`,
              error,
            );
            failCount++;
          }
        }

        // Mostrar resultado final
        let message = "";
        if (successCount > 0 && failCount === 0) {
          message = `Se iniciaron ${successCount} descargas exitosamente.`;
        } else if (successCount > 0 && failCount > 0) {
          message = `Se iniciaron ${successCount} descargas. ${failCount} episodios fallaron.`;
        } else {
          message = `No se pudo iniciar ninguna descarga.`;
        }

        Alert.alert("Resultado de descarga", message, [{ text: "OK" }]);

        // Actualizar lista de descargas
        if (onDownloadUpdate) {
          onDownloadUpdate();
        }
      } catch (error) {
        logger.error("Error in bulk download:", error);
        Alert.alert(
          "Error de descarga masiva",
          "Ocurrió un error durante la descarga masiva.",
          [{ text: "OK" }],
        );
      } finally {
        setIsDownloadingAll(false);
      }
    },
    [animeId, animeTitle],
  );

  /**
   *  Elimina un episodio descargado
   */
  const deleteDownloadedEpisode = useCallback(
    async (episodeNumber, onDownloadUpdate) => {
      Alert.alert(
        "Eliminar episodio",
        `¿Estás seguro de que quieres eliminar el episodio ${episodeNumber} descargado?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              try {
                const result = await DownloadService.deleteEpisode(
                  animeId,
                  episodeNumber,
                );

                if (result.success) {
                  Alert.alert("Éxito", "Episodio eliminado correctamente.", [
                    { text: "OK" },
                  ]);

                  if (onDownloadUpdate) {
                    onDownloadUpdate();
                  }
                } else {
                  throw new Error(
                    result.error || "Error al eliminar el episodio",
                  );
                }
              } catch (error) {
                logger.error("Error deleting episode:", error);
                Alert.alert("Error", "No se pudo eliminar el episodio.", [
                  { text: "OK" },
                ]);
              }
            },
          },
        ],
      );
    },
    [animeId],
  );

  return {
    // Estados
    loadingEpisodeId,
    isDownloadingAll,
    processingMessage,

    // Funciones principales
    handleEpisodeSelect,
    downloadEpisode,
    downloadAllEpisodes,
    deleteDownloadedEpisode,

    // Funciones auxiliares
    performDownload,
    performBulkDownload,

    // Setters (para casos especiales)
    setLoadingEpisodeId,
    setIsDownloadingAll,
  };
};

export default useEpisodePlayer;
