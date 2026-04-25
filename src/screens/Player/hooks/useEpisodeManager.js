const logger = createLogger("player");
import { createLogger } from "../../../utils/logger";
// screens/Player/hooks/useEpisodeManager.js
// Hook para la gestión de episodios y navegación

import { useState, useEffect } from "react";
import AnimeService from "../../../services/AnimeService";
import VideoService from "../../../services/VideoService";
import VideoStreamService from "../../../services/VideoStreamService";

export const useEpisodeManager = (
  initialEpisodeNumber,
  initialVideoLinks,
  route,
) => {
  // Estados del episodio
  const [currentEpisodeNumber, setCurrentEpisodeNumber] =
    useState(initialEpisodeNumber);
  const [currentVideoLinks, setCurrentVideoLinks] = useState(initialVideoLinks);
  const [isLoadingNextEpisode, setIsLoadingNextEpisode] = useState(false);
  const [showLoadingAlert, setShowLoadingAlert] = useState(false);

  // true  = existe    (mostrar sección "Siguiente")
  // false = no existe / desconocido (ocultar — mejor no mostrar que mostrar de más)
  const totalEpisodes = route.params?.totalEpisodes;
  const [hasNextEpisode, setHasNextEpisode] = useState(
    totalEpisodes ? parseInt(initialEpisodeNumber, 10) < totalEpisodes : false,
  );

  // 🎬 Cargar próximo episodio
  const handleNextEpisode = async (
    setIsPlaying,
    setSelectedQuality,
    setCurrentTime,
    setDuration,
    setHasInitialLoad,
  ) => {
    const nextEpisodeNum = parseInt(currentEpisodeNumber) + 1;

    logger.debug(`🎬 CARGANDO PRÓXIMO EPISODIO: ${nextEpisodeNum}`);
    setIsLoadingNextEpisode(true);
    setShowLoadingAlert(true);
    // No pausar — el video debe buffer/transicionar sin interrupción visible

    try {
      // Obtener providers para el próximo episodio
      const providers = await AnimeService.getEpisodeUrl(
        route.params.animeId,
        nextEpisodeNum.toString(),
      );

      if (providers && providers.length > 0) {
        let allVideoLinks = [];

        // Procesar cada provider para obtener enlaces de video
        for (const provider of providers) {
          try {
            const videoLinks = await VideoService.getVideoLinks(provider.url);
            if (videoLinks.length > 0) {
              allVideoLinks = allVideoLinks.concat(
                videoLinks.map((link) => ({
                  ...link,
                  provider: provider.name,
                })),
              );
              logger.debug(
                `✅ Provider ${provider.name}: ${videoLinks.length} enlaces encontrados`,
              );
            }
          } catch (error) {
            logger.debug(`⚠️ Provider ${provider.name} falló (normal)`);
          }
        }

        if (allVideoLinks.length > 0) {
          // Actualizar el estado con el nuevo episodio
          setCurrentEpisodeNumber(nextEpisodeNum);
          setCurrentVideoLinks(allVideoLinks);
          setSelectedQuality(0);
          setCurrentTime(0);
          setDuration(0);
          setHasInitialLoad(false);
          // Re-evaluar si el nuevo episodio tiene siguiente
          setHasNextEpisode(
            totalEpisodes ? nextEpisodeNum < totalEpisodes : false,
          );

          logger.debug(
            `✅ PRÓXIMO EPISODIO ${nextEpisodeNum} CARGADO CON ${allVideoLinks.length} FUENTES`,
          );

          // Reproducir automáticamente después de un pequeño delay
          setTimeout(() => {
            setIsPlaying(true);
          }, 500);
        } else {
          logger.debug(
            "❌ No se encontraron enlaces válidos para el próximo episodio",
          );
          setHasNextEpisode(false);
        }
      } else {
        logger.debug("❌ No se encontraron providers para el próximo episodio");
        setHasNextEpisode(false);
      }
    } catch (error) {
      logger.error("❌ Error cargando próximo episodio:", error);
    } finally {
      setIsLoadingNextEpisode(false);
      setShowLoadingAlert(false);
    }
  };

  // 🔮 Pre-fetch silencioso del siguiente episodio
  // Se activa 10s después de que arranque cada episodio para calentar
  // la caché de providers. No bloquea nada; los errores se ignoran.
  useEffect(() => {
    const animeId = route.params?.animeId;
    if (!currentEpisodeNumber || !animeId) return;

    const nextEp = String(parseInt(currentEpisodeNumber, 10) + 1);

    const timer = setTimeout(() => {
      logger.debug(`🔮 Pre-fetch background: ep ${nextEp}`);
      VideoStreamService.getVideoLinksForEpisode(animeId, nextEp, "sub", {
        silent: true,
      })
        .then(() => setHasNextEpisode(true))
        .catch(() => setHasNextEpisode(false));
    }, 10_000);

    return () => clearTimeout(timer);
  }, [currentEpisodeNumber, route.params?.animeId]);

  return {
    // Estados
    currentEpisodeNumber,
    currentVideoLinks,
    isLoadingNextEpisode,
    showLoadingAlert,
    hasNextEpisode,

    // Setters
    setCurrentEpisodeNumber,
    setCurrentVideoLinks,
    setIsLoadingNextEpisode,
    setShowLoadingAlert,

    // Handlers
    handleNextEpisode,
  };
};
