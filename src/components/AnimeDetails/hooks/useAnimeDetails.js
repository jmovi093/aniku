const logger = createLogger("player");
import { createLogger } from "../../../utils/logger";
// hooks/useAnimeDetails.js
// Custom hook para manejar la lógica de detalles del anime

import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import AnimeService from "../../../services/AnimeService";
import DownloadService from "../../../services/DownloadService";
import {
  isAnimeDataComplete,
  generateEpisodesList,
  calculateDownloadProgress,
} from "../utils/animeDetailsUtils";

/**
 * Custom hook para manejar la lógica de detalles del anime
 * @param {string} animeId - ID del anime
 * @param {string} animeTitle - Título del anime
 * @returns {Object} Estado y funciones del hook
 */
export const useAnimeDetails = (animeId, animeTitle) => {
  // 📊 Estados principales
  const [animeDetails, setAnimeDetails] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [downloadedEpisodes, setDownloadedEpisodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({
    downloaded: 0,
    total: 0,
    percentage: 0,
    remaining: 0,
  });

  // 🌐 Monitoreo de conectividad
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  /**
   * 📥 Carga los detalles del anime desde la API
   */
  const loadAnimeDetails = useCallback(async () => {
    if (!animeId) return;

    try {
      setIsLoading(true);

      // Intentar cargar desde cache primero
      const cachedData = await loadFromCache();
      if (cachedData && isAnimeDataComplete(cachedData)) {
        setAnimeDetails(cachedData);
        if (cachedData.episodes) {
          const episodesList = generateEpisodesList(cachedData.episodes);
          setEpisodes(episodesList);
        }
      }

      // Si no hay cache o estamos online, cargar desde API
      if (!isOffline && (!cachedData || !isAnimeDataComplete(cachedData))) {
        const details = await AnimeService.getAnimeDetails(animeId);
        if (details && isAnimeDataComplete(details)) {
          setAnimeDetails(details);
          await saveToCache(details);

          if (details.episodes) {
            const episodesList = generateEpisodesList(details.episodes);
            setEpisodes(episodesList);
          }
        }
      }
    } catch (error) {
      logger.error("Error loading anime details:", error);

      // Si falla la carga online, intentar usar cache
      const cachedData = await loadFromCache();
      if (cachedData && isAnimeDataComplete(cachedData)) {
        setAnimeDetails(cachedData);
        if (cachedData.episodes) {
          const episodesList = generateEpisodesList(cachedData.episodes);
          setEpisodes(episodesList);
        }
      } else if (!isOffline) {
        Alert.alert(
          "Error",
          "No se pudieron cargar los detalles del anime. Verifica tu conexión.",
          [{ text: "OK" }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [animeId, isOffline]);

  /**
   * 💾 Carga datos desde cache local
   */
  const loadFromCache = useCallback(async () => {
    try {
      const cacheKey = `anime_details_${animeId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      logger.error("Error loading from cache:", error);
      return null;
    }
  }, [animeId]);

  /**
   * 💾 Guarda datos en cache local
   */
  const saveToCache = useCallback(
    async (data) => {
      try {
        const cacheKey = `anime_details_${animeId}`;
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            ...data,
            cachedAt: Date.now(),
          })
        );
      } catch (error) {
        logger.error("Error saving to cache:", error);
      }
    },
    [animeId]
  );

  /**
   * 📥 Carga episodios descargados desde DownloadService
   */
  const loadDownloadedEpisodes = useCallback(async () => {
    try {
      const downloaded = await DownloadService.getDownloadedEpisodes(animeId);
      setDownloadedEpisodes(downloaded || []);

      // Calcular progreso de descarga
      const totalEpisodes = animeDetails?.episodes || episodes.length;
      const progress = calculateDownloadProgress(downloaded, totalEpisodes);
      setDownloadProgress(progress);
    } catch (error) {
      logger.error("Error loading downloaded episodes:", error);
      setDownloadedEpisodes([]);
    }
  }, [animeId, animeDetails?.episodes, episodes.length]);

  /**
   * 🔄 Refresca los datos del anime
   */
  const refreshAnimeData = useCallback(async () => {
    await Promise.all([loadAnimeDetails(), loadDownloadedEpisodes()]);
  }, [loadAnimeDetails, loadDownloadedEpisodes]);

  /**
   * 📖 Toggle del estado expandido de descripción
   */
  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  /**
   * 🗑️ Limpia el cache del anime
   */
  const clearCache = useCallback(async () => {
    try {
      const cacheKey = `anime_details_${animeId}`;
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      logger.error("Error clearing cache:", error);
    }
  }, [animeId]);

  /**
   * 🔍 Verifica si hay datos válidos
   */
  const hasValidData = useCallback(() => {
    return isAnimeDataComplete(animeDetails);
  }, [animeDetails]);

  // 🚀 Efecto de inicialización
  useEffect(() => {
    if (animeId) {
      refreshAnimeData();
    }
  }, [animeId]);

  // 🔄 Efecto para recargar descargas cuando cambian los detalles
  useEffect(() => {
    if (animeDetails && animeId) {
      loadDownloadedEpisodes();
    }
  }, [animeDetails, animeId, loadDownloadedEpisodes]);

  return {
    // Estados
    animeDetails,
    episodes,
    downloadedEpisodes,
    isLoading,
    isExpanded,
    isOffline,
    downloadProgress,

    // Funciones
    loadAnimeDetails,
    loadDownloadedEpisodes,
    refreshAnimeData,
    toggleExpanded,
    clearCache,
    hasValidData,

    // Setters (para casos especiales)
    setAnimeDetails,
    setEpisodes,
    setDownloadedEpisodes,
    setIsLoading,
  };
};

export default useAnimeDetails;
