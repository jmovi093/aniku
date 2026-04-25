import { useCallback, useEffect, useState } from "react";
import { Alert, Animated } from "react-native";
import AnimeService from "../../../services/AnimeService";
import AnimeDetailsService from "../../../services/AnimeDetailsService";
import VideoService from "../../../services/VideoService";
import DownloadService from "../../../services/DownloadService";
import { CustomAlert } from "../../CustomAlert";
import { createLogger } from "../../../utils/logger";

const log = createLogger("player");

export const getStatusColor = (status) => {
  switch (status) {
    case "Releasing":
      return "#28a745";
    case "Finished":
      return "#007bff";
    case "Not yet aired":
      return "#ffc107";
    default:
      return "#6c757d";
  }
};

export const getStatusText = (status) => {
  switch (status) {
    case "Releasing":
      return "En emision";
    case "Finished":
      return "Finalizado";
    case "Not yet aired":
      return "Proximamente";
    default:
      return status;
  }
};

export const sanitizeDescription = (text = "") =>
  text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');

export const truncateText = (text, maxLength = 150) => {
  if (!text) return "";
  const cleanText = sanitizeDescription(text);
  if (cleanText.length <= maxLength) return cleanText;
  return cleanText.substring(0, maxLength) + "...";
};

const useAnimeDetailsEpisodes = ({
  animeId,
  animeName,
  fromDownloads = false,
  navigation,
  autoPlayEpisode,
  autoPlayResumeTime = 0,
}) => {
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [loadingEpisodeId, setLoadingEpisodeId] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState("");
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [downloadStates, setDownloadStates] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});
  const [offlineMode] = useState(fromDownloads);
  const [episodeInfoMap, setEpisodeInfoMap] = useState({});

  const loadEpisodeInfos = useCallback(
    async (episodeList) => {
      try {
        const infoMap = await AnimeService.getEpisodeInfos(
          animeId,
          episodeList.length,
        );
        setEpisodeInfoMap(infoMap);
      } catch (error) {
        log.warn("No se pudieron cargar thumbnails de episodios", error);
      }
    },
    [animeId],
  );

  const loadEpisodes = useCallback(async () => {
    try {
      setLoadingEpisodes(true);
      const episodesList = await AnimeService.getEpisodesList(animeId);
      setEpisodes(episodesList);
      loadEpisodeInfos(episodesList);
    } catch (error) {
      CustomAlert.error("Error", "Error al cargar episodios: " + error.message);
    } finally {
      setLoadingEpisodes(false);
    }
  }, [animeId, loadEpisodeInfos]);

  const loadAnimeDetails = useCallback(async () => {
    try {
      setLoadingDetails(true);
      const animeDetails = await AnimeDetailsService.getAnimeDetails(animeId);
      setDetails(animeDetails);
    } catch (error) {
      log.error("Error cargando detalles:", error);
    } finally {
      setLoadingDetails(false);
    }
  }, [animeId]);

  const loadOfflineData = useCallback(async () => {
    try {
      setLoadingEpisodes(true);
      setLoadingDetails(true);

      const downloads = await DownloadService.getDownloads();
      const animeDownloads = downloads.filter((d) => d.animeId === animeId);

      if (animeDownloads.length > 0) {
        const episodeNumbers = [
          ...new Set(animeDownloads.map((d) => d.episodeNo)),
        ].sort((a, b) => a - b);
        setEpisodes(episodeNumbers);

        const statesMap = {};
        animeDownloads.forEach((download) => {
          statesMap[download.episodeNo] =
            DownloadService.DOWNLOAD_STATES.COMPLETED;
        });
        setDownloadStates(statesMap);

        const firstDownload = animeDownloads[0];
        setDetails({
          name: firstDownload.animeName,
          description: "Datos no disponibles en modo offline",
          status: "Unknown",
          genres: [],
          studios: [],
          thumbnail: null,
          score: null,
          type: null,
          season: null,
          episodeDuration: null,
          stats: null,
        });
      }
    } catch (error) {
      log.error("Error cargando datos offline:", error);
    } finally {
      setLoadingEpisodes(false);
      setLoadingDetails(false);
    }
  }, [animeId]);

  const loadDownloadStates = useCallback(async () => {
    const downloads = await DownloadService.getDownloads();
    const animeDownloads = downloads.filter((d) => d.animeId === animeId);

    const stateEntries = await Promise.all(
      animeDownloads.map(async (download) => {
        const exists = await DownloadService.fileExists(download.localPath);
        if (!exists) {
          await DownloadService.removeOrphanMetadata(download);
          return null;
        }
        return [
          String(download.episodeNo),
          DownloadService.DOWNLOAD_STATES.COMPLETED,
        ];
      }),
    );

    const states = {};
    stateEntries.forEach((entry) => {
      if (entry) states[entry[0]] = entry[1];
    });

    for (const episodeNo of episodes) {
      if (!states[episodeNo]) {
        const liveState = await DownloadService.getLiveState(
          animeId,
          episodeNo,
        );
        if (liveState) states[String(episodeNo)] = liveState;
      }
    }

    setDownloadStates(states);
  }, [animeId, episodes]);

  const toggleFullDetails = useCallback(() => {
    const toValue = showFullDetails ? 0 : 1;
    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setShowFullDetails(!showFullDetails);
  }, [animation, showFullDetails]);

  const handleEpisodeSelect = useCallback(
    async (episodeNumber, resumeTime = 0) => {
      if (loadingEpisodeId === episodeNumber) return;

      if (offlineMode) {
        try {
          const downloads = await DownloadService.getDownloads();
          const episodeDownload = downloads.find(
            (download) =>
              download.animeId === animeId &&
              download.episodeNo === episodeNumber,
          );

          if (!episodeDownload) {
            CustomAlert.warning(
              "Episodio no descargado",
              "Este episodio no esta disponible offline",
            );
            return;
          }

          navigation.navigate("Player", {
            episodeNumber,
            animeName: details?.name || animeName,
            animeId,
            thumbnail: details?.thumbnail || null,
            resumeTime,
            totalEpisodes: episodes.length,
            videoLinks: [
              {
                url: episodeDownload.localPath,
                quality: episodeDownload.quality || "Unknown",
                type: "mp4",
                source: "local",
              },
            ],
          });
          return;
        } catch (error) {
          CustomAlert.error(
            "Error",
            "No se pudo acceder al archivo descargado",
          );
          return;
        }
      }

      setLoadingEpisodeId(episodeNumber);
      setLoadingProgress("Procesando fuentes...");

      try {
        const validLinks = await AnimeService.getOptimizedVideoLinks(
          animeId,
          episodeNumber.toString(),
        );

        if (!validLinks || validLinks.length === 0) {
          throw new Error("No se encontraron enlaces validos");
        }

        navigation.navigate("Player", {
          videoLinks: validLinks,
          animeName: details?.name || animeName,
          episodeNumber,
          animeId,
          thumbnail: details?.thumbnail || null,
          resumeTime,
          totalEpisodes: episodes.length,
        });
      } catch (error) {
        Alert.alert(
          "Error",
          `No se pudieron cargar las fuentes: ${error.message}`,
          [
            {
              text: "Reintentar",
              onPress: () => handleEpisodeSelect(episodeNumber, resumeTime),
            },
            { text: "Cancelar", style: "cancel" },
          ],
        );
      } finally {
        setLoadingEpisodeId(null);
        setLoadingProgress("");
      }
    },
    [
      animeId,
      animeName,
      details,
      episodes.length,
      loadingEpisodeId,
      navigation,
      offlineMode,
    ],
  );

  const handleDownloadEpisode = useCallback(
    async (episodeNo) => {
      if (
        downloadStates[episodeNo] === DownloadService.DOWNLOAD_STATES.COMPLETED
      ) {
        return;
      }

      try {
        const videoLink = await AnimeService.getBestDownloadUrl(
          animeId,
          String(episodeNo),
        );
        await DownloadService.enqueueEpisode(
          animeId,
          details?.name || animeName,
          episodeNo,
          videoLink,
        );
      } catch (error) {
        log.error("handleDownloadEpisode fallo:", error?.message || error);
        CustomAlert.warning(
          "Sin enlaces",
          "No se encontraron enlaces validos para descargar",
        );
      }
    },
    [animeId, animeName, details, downloadStates],
  );

  const handleCancelDownload = useCallback(
    async (episodeNo) => {
      const success = await DownloadService.cancelDownload(animeId, episodeNo);
      if (!success) {
        CustomAlert.error("Error", "No se pudo cancelar la descarga");
      }
    },
    [animeId],
  );

  const handleDeleteDownload = useCallback(
    (episodeNo) => {
      CustomAlert.confirm(
        "Eliminar descarga",
        `¿Eliminar descarga del episodio ${episodeNo}?`,
        async () => {
          const downloads = await DownloadService.getDownloads();
          const download = downloads.find(
            (item) =>
              item.animeId === animeId &&
              String(item.episodeNo) === String(episodeNo),
          );

          if (!download) return;

          const success = await DownloadService.deleteDownload(download);
          if (!success) return;

          setDownloadStates((prev) => {
            const next = { ...prev };
            delete next[episodeNo];
            return next;
          });

          if (offlineMode) {
            const remaining = episodes.filter(
              (episode) => episode !== episodeNo,
            );
            setEpisodes(remaining);
            if (remaining.length === 0) {
              navigation.goBack();
            }
          }
        },
      );
    },
    [animeId, episodes, navigation, offlineMode],
  );

  const handleDownloadAllEpisodes = useCallback(async () => {
    CustomAlert.confirm(
      "Descargar todos los episodios",
      `¿Descargar todos los ${episodes.length} episodios?`,
      async () => {
        await DownloadService.downloadAllEpisodes(
          episodes,
          animeId,
          details?.name || animeName,
        );
      },
    );
  }, [animeId, animeName, details, episodes]);

  const handleDownloadAction = useCallback(
    (episodeNo) => {
      const state = downloadStates[episodeNo];

      switch (state) {
        case DownloadService.DOWNLOAD_STATES.COMPLETED:
          handleDeleteDownload(episodeNo);
          break;
        case DownloadService.DOWNLOAD_STATES.DOWNLOADING:
        case DownloadService.DOWNLOAD_STATES.QUEUED:
          handleCancelDownload(episodeNo);
          break;
        default:
          handleDownloadEpisode(episodeNo);
          break;
      }
    },
    [
      downloadStates,
      handleCancelDownload,
      handleDeleteDownload,
      handleDownloadEpisode,
    ],
  );

  useEffect(() => {
    const bootstrap = async () => {
      if (offlineMode) {
        await loadOfflineData();
      } else {
        await Promise.allSettled([loadEpisodes(), loadAnimeDetails()]);
      }
    };

    bootstrap();

    const downloadListener = ({
      animeId: downloadAnimeId,
      episodeNo,
      state,
      progress,
    }) => {
      if (downloadAnimeId === animeId) {
        setDownloadStates((prev) => ({ ...prev, [episodeNo]: state }));
        if (progress !== undefined) {
          setDownloadProgress((prev) => ({ ...prev, [episodeNo]: progress }));
        }
      }
    };

    DownloadService.addDownloadListener(downloadListener);

    if (autoPlayEpisode) {
      setTimeout(() => {
        handleEpisodeSelect(autoPlayEpisode, autoPlayResumeTime || 0);
      }, 300);
    }

    return () => {
      DownloadService.removeDownloadListener(downloadListener);
      VideoService.clearJsonCache();
    };
  }, []);

  useEffect(() => {
    loadDownloadStates();
  }, [animeId, episodes]);

  return {
    episodes,
    loadingEpisodes,
    loadingEpisodeId,
    loadingProgress,
    details,
    loadingDetails,
    showFullDetails,
    animation,
    downloadStates,
    downloadProgress,
    offlineMode,
    episodeInfoMap,
    toggleFullDetails,
    handleEpisodeSelect,
    handleDownloadAction,
    handleDeleteDownload,
    handleDownloadAllEpisodes,
    truncateText,
  };
};

export default useAnimeDetailsEpisodes;
