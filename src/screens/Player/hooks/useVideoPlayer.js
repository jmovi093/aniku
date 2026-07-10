// screens/Player/hooks/useVideoPlayer.js
// Hook para la gestión del reproductor de video

import { useState, useRef, useEffect } from "react";
import { StatusBar } from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
import * as NavigationBar from "expo-navigation-bar";
import { createLogger } from "../../../utils/logger";
import HybridHistoryService from "../../../services/HybridHistoryService";

const logger = createLogger("player");

// Reintentos automáticos de la misma fuente antes de probar otro provider.
const MAX_SOURCE_RETRIES = 2;

export const useVideoPlayer = (
  route,
  animeName,
  currentEpisodeNumber,
  { onProviderExhausted } = {},
) => {
  // Estados del reproductor
  const [selectedQuality, setSelectedQuality] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(0);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playableDuration, setPlayableDuration] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [playerError, setPlayerError] = useState(null);
  const retryCountRef = useRef(0);

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
      NavigationBar.setVisibilityAsync('visible').catch(() => {}); // restaurar al salir del player
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
    setPlayableDuration(0);
    retryCountRef.current = 0;
    setPlayerError(null);
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
    if (data.playableDuration != null) {
      setPlayableDuration(data.playableDuration);
    }
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

  // Re-aplica immersive cuando isFullscreen cambia (resuelve timing en primera entrada)
  useEffect(() => {
    if (isFullscreen) {
      NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
    } else {
      NavigationBar.setVisibilityAsync('visible').catch(() => {});
    }
  }, [isFullscreen]);

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
        await NavigationBar.setVisibilityAsync('visible');
        setIsFullscreen(false);
      } else {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        );
        StatusBar.setHidden(true);
        await NavigationBar.setBehaviorAsync('overlay-swipe');
        await NavigationBar.setVisibilityAsync('hidden');
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

  // Fuerza al <Video> a recrear el reproductor nativo desde currentTimeRef.
  // Necesario porque re-asignar el mismo `source` no siempre reconecta tras
  // un error fatal (token vencido, drop de red, 403 del CDN).
  const reloadSource = () => {
    resumeTimeRef.current = currentTimeRef.current;
    setIsBuffering(true);
    setReloadToken((t) => t + 1);
  };

  // ❌ Recuperación de errores fatales del player.
  // 1) Reintenta la misma fuente (recarga nativa) hasta MAX_SOURCE_RETRIES.
  // 2) Si sigue fallando, pide un provider distinto (excluye el actual).
  // 3) Si tampoco hay alternativa, muestra error visible — antes se quedaba
  //    congelado en silencio y el usuario tenía que cerrar y reabrir.
  const onError = (error) => {
    logger.error("❌ ERROR EN VIDEO:", error);

    if (retryCountRef.current < MAX_SOURCE_RETRIES) {
      retryCountRef.current += 1;
      logger.debug(
        `🔁 Reintentando fuente (${retryCountRef.current}/${MAX_SOURCE_RETRIES})`,
      );
      setTimeout(reloadSource, 700 * retryCountRef.current);
      return;
    }

    if (onProviderExhausted) {
      logger.debug("🔀 Fuente agotada, probando con otro provider...");
      resumeTimeRef.current = currentTimeRef.current;
      onProviderExhausted()
        .then((switched) => {
          if (switched) {
            retryCountRef.current = 0;
            setIsBuffering(true);
            setReloadToken((t) => t + 1);
          } else {
            setPlayerError(
              "No se pudo reproducir este episodio. Intenta de nuevo más tarde.",
            );
          }
        })
        .catch(() => {
          setPlayerError(
            "No se pudo reproducir este episodio. Intenta de nuevo más tarde.",
          );
        });
      return;
    }

    setPlayerError("Ocurrió un error reproduciendo el video.");
  };

  // Reintento manual desde la UI (botón en el overlay de error)
  const retryPlayback = () => {
    retryCountRef.current = 0;
    setPlayerError(null);
    reloadSource();
  };

  return {
    selectedQuality,
    isPlaying,
    currentTime,
    duration,
    isBuffering,
    hasInitialLoad,
    isFullscreen,
    playableDuration,
    reloadToken,
    playerError,
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
    onError,
    retryPlayback,
    saveProgress,
  };
};
