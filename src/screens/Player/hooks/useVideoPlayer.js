const logger = createLogger("player");
import { createLogger } from "../../../utils/logger";
// screens/Player/hooks/useVideoPlayer.js
// Hook para la gestión del reproductor de video

import { useState, useRef, useEffect } from "react";
import { StatusBar } from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
import HybridHistoryService from "../../../services/HybridHistoryService";

export const useVideoPlayer = (route, animeName, currentEpisodeNumber) => {
  // Estados del reproductor
  const [selectedQuality, setSelectedQuality] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(0);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Referencias
  const videoRef = useRef(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const currentEpisodeRef = useRef(currentEpisodeNumber);
  const resumeTimeRef = useRef(route.params.resumeTime || 0);

  // 📱 Configurar orientación inicial (portrait)
  useEffect(() => {
    const setupOrientation = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );
        logger.debug("📱 Orientación inicial: portrait");
      } catch (error) {
        logger.debug("⚠️ No se pudo bloquear orientación:", error.message);
      }
    };

    setupOrientation();

    return () => {
      // Al salir del player, volver a portrait
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      ).catch(() => {});
    };
  }, []);

  // � Resetear estado cuando cambia el episodio (desde fuera)
  const resetForNewEpisode = (newEpisodeNum) => {
    currentEpisodeRef.current = newEpisodeNum;
    resumeTimeRef.current = 0;
    currentTimeRef.current = 0;
    durationRef.current = 0;
    setIsPlaying(false);
    setHasInitialLoad(false);
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(false);
    logger.debug(`🔄 Reset para episodio ${newEpisodeNum}: resume=0`);
  };

  // 💾 Guardar progreso al salir
  useEffect(() => {
    return () => {
      const finalCurrentTime = currentTimeRef.current;
      const finalDuration = durationRef.current;

      if (finalDuration > 0 && finalCurrentTime > 0) {
        logger.debug("💾 Saliendo de PlayerScreen, guardando progreso");
        HybridHistoryService.updateWatching(
          route.params.animeId,
          route.params.animeName || animeName,
          currentEpisodeRef.current,
          finalCurrentTime,
          finalDuration,
          route.params.thumbnail || null,
        );
      }
    };
  }, [animeName, route.params.animeId]); // currentEpisodeRef es mutable, no hace falta en deps

  // 💾 Función para guardar progreso
  const saveProgress = (currentTime, totalDuration, force = false) => {
    const now = Date.now();
    if (force || now - lastSaveTime > 10000) {
      logger.debug("💾 GUARDANDO PROGRESO:", {
        animeId: route.params.animeId,
        animeName: route.params.animeName || animeName,
        episode: currentEpisodeNumber,
        currentTime: Math.round(currentTime),
        totalDuration: Math.round(totalDuration),
        percentage: Math.round((currentTime / totalDuration) * 100),
        thumbnail: route.params.thumbnail
          ? `✅ SÍ (${route.params.thumbnail.substring(0, 50)}...)`
          : "❌ NO",
        forced: force,
      });

      HybridHistoryService.updateWatching(
        route.params.animeId,
        route.params.animeName || animeName,
        currentEpisodeRef.current,
        currentTime,
        totalDuration,
        route.params.thumbnail || null,
      );
      setLastSaveTime(now);
    }
  };

  // 🎬 Handlers del video
  const handlePlayVideo = (link, index) => {
    setSelectedQuality(index);
    setIsPlaying(true);
    logger.debug(`🎬 Reproduciendo calidad ${index}: ${link.quality}`);
  };

  const onProgress = (data) => {
    currentTimeRef.current = data.currentTime;
    setCurrentTime(data.currentTime); // para la barra de progreso
    if (durationRef.current > 0) {
      saveProgress(data.currentTime, durationRef.current, false);
    }
  };

  const onLoad = (data) => {
    setDuration(data.duration);
    durationRef.current = data.duration;
    setHasInitialLoad(true);
    // Arrancar reproducción: único lugar donde isPlaying pasa a true (además de handlePlayVideo)
    setIsPlaying(true);

    const resumeTime = resumeTimeRef.current;
    currentTimeRef.current = resumeTime;

    if (resumeTime > 10) {
      saveProgress(resumeTime, data.duration, true);
      logger.debug(`🔄 RESUMIENDO desde: ${resumeTime}s`);
      setTimeout(() => {
        videoRef.current?.seek(resumeTime);
      }, 500);
    }
  };

  const onSeek = (data) => {
    currentTimeRef.current = data.currentTime;
    setCurrentTime(data.currentTime);
    if (durationRef.current > 0) {
      saveProgress(data.currentTime, durationRef.current, true);
    }
  };

  // Saltar a una posición exacta (seekbar tap)
  const seekTo = (time) => {
    const clamped = Math.max(0, Math.min(time, durationRef.current));
    videoRef.current?.seek(clamped);
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);
  };

  // ▶️ Toggle play/pause
  const togglePlayPause = () => setIsPlaying((prev) => !prev);

  // 🌍 Toggle fullscreen (landscape ↔ portrait)
  const toggleFullscreen = async () => {
    try {
      if (isFullscreen) {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );
        StatusBar.setHidden(false);
        setIsFullscreen(false);
      } else {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        );
        StatusBar.setHidden(true);
        setIsFullscreen(true);
      }
    } catch (e) {
      logger.debug("⚠️ toggleFullscreen error:", e.message);
    }
  };

  // Avanzar/retroceder X segundos (doble tap)
  const seekBy = (seconds) => seekTo(currentTimeRef.current + seconds);

  const onBuffer = ({ isBuffering }) => setIsBuffering(isBuffering);

  const onEnd = () => {
    setIsPlaying(false);
    currentTimeRef.current = 0;
    setCurrentTime(0);
  };

  return {
    selectedQuality,
    isPlaying,
    currentTime,
    duration,
    isBuffering,
    hasInitialLoad,
    isFullscreen,
    videoRef,
    setSelectedQuality,
    setHasInitialLoad,
    setDuration,
    resetForNewEpisode,
    togglePlayPause,
    toggleFullscreen,
    onProgress,
    onLoad,
    onSeek,
    seekTo,
    seekBy,
    onBuffer,
    onEnd,
    saveProgress,
  };
};
