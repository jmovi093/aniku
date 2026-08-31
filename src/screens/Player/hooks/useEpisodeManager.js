const logger = createLogger("player");
import { createLogger } from "../../../utils/logger";
// screens/Player/hooks/useEpisodeManager.js
// Hook para la gestión de episodios y navegación

import { useState, useEffect } from "react";
import { AnimeSource as AnimeService } from "../../../services/source";
import VideoStreamService from "../../../services/VideoStreamService";
import { pickPreferredQualityIndex } from "../../../utils/videoQuality";
import { appConfig } from "../../../config";

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

  // ⚠️ Antes esto comparaba el NÚMERO de episodio contra la CANTIDAD:
  //     parseInt(episodeNumber) < totalEpisodes
  // Con anidb la numeración continúa entre temporadas (Slime S2 va del 25 al
  // 36, pero son 12 episodios), así que "25 < 12" daba false y el botón de
  // siguiente desaparecía. Con AllAnime funcionaba de casualidad porque casi
  // siempre empezaba en 1.
  // Ahora se usa la LISTA real de episodios, que además soporta numeración no
  // contigua (especiales tipo 26.5).
  const episodeList = (route.params?.episodeList || []).map(String);

  const indexOfEpisode = (episode) =>
    episodeList.indexOf(String(episode));

  const nextEpisodeAfter = (episode) => {
    const index = indexOfEpisode(episode);
    if (index === -1 || index >= episodeList.length - 1) return null;
    return episodeList[index + 1];
  };

  const [hasNextEpisode, setHasNextEpisode] = useState(
    () => nextEpisodeAfter(initialEpisodeNumber) !== null,
  );

  // 🎬 Cargar próximo episodio
  const handleNextEpisode = async (
    setIsPlaying,
    setSelectedQuality,
    setCurrentTime,
    setDuration,
    setHasInitialLoad,
  ) => {
    // El siguiente sale de la lista, no de sumar 1: puede haber saltos o
    // especiales decimales.
    const nextEpisodeNum = nextEpisodeAfter(currentEpisodeNumber);
    if (!nextEpisodeNum) {
      logger.debug("⛔ No hay episodio siguiente en la lista");
      setHasNextEpisode(false);
      return;
    }

    setIsLoadingNextEpisode(true);
    setShowLoadingAlert(true);
    // No pausar — el video debe buffer/transicionar sin interrupción visible

    try {
      logger.debug(`🎬 CARGANDO PRÓXIMO EPISODIO: ${nextEpisodeNum} (pipeline optimizado)`);

      const videoLinks = await AnimeService.getOptimizedVideoLinks(
        route.params.animeId,
        String(nextEpisodeNum),
        "sub",
      );

      if (videoLinks && videoLinks.length > 0) {
        setCurrentEpisodeNumber(nextEpisodeNum);
        setCurrentVideoLinks(videoLinks);
        // Respetar la calidad preferida también al pasar de episodio; antes
        // volvía siempre al índice 0 (la más alta).
        setSelectedQuality(
          pickPreferredQualityIndex(videoLinks, appConfig.video.defaultQuality),
        );
        setCurrentTime(0);
        setDuration(0);
        setHasInitialLoad(false);
        setHasNextEpisode(nextEpisodeAfter(nextEpisodeNum) !== null);
        logger.debug(`✅ PRÓXIMO EPISODIO ${nextEpisodeNum} LISTO: ${videoLinks.length} enlaces`);
        setTimeout(() => { setIsPlaying(true); }, 500);
      } else {
        logger.debug("❌ No se encontraron enlaces para el próximo episodio");
        setHasNextEpisode(false);
      }
    } catch (error) {
      logger.error("❌ Error cargando próximo episodio:", error);
      setHasNextEpisode(false);
    } finally {
      setIsLoadingNextEpisode(false);
      setShowLoadingAlert(false);
    }
  };

  // 🔮 Pre-fetch silencioso del siguiente episodio: calienta la caché de
  // providers 10 s después de arrancar. No bloquea nada.
  //
  // ⚠️ Antes este efecto hacía `.then(setHasNextEpisode(true))` /
  // `.catch(setHasNextEpisode(false))`, así que un fallo de red del prefetch
  // hacía DESAPARECER el botón de "siguiente" a mitad de la reproducción,
  // aunque el episodio existiera. Que exista o no lo decide la LISTA; el
  // prefetch es solo una optimización y ya no toca ese estado.
  useEffect(() => {
    const animeId = route.params?.animeId;
    if (!currentEpisodeNumber || !animeId) return;

    const nextEp = nextEpisodeAfter(currentEpisodeNumber);
    if (!nextEp) return;

    const timer = setTimeout(() => {
      logger.debug(`🔮 Pre-fetch background: ep ${nextEp}`);
      VideoStreamService.getVideoLinksForEpisode(animeId, String(nextEp), "sub", {
        silent: true,
      }).catch(() => {});
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
    // El siguiente REAL según la lista (no currentEpisode + 1)
    nextEpisodeNumber: nextEpisodeAfter(currentEpisodeNumber),

    // Setters
    setCurrentEpisodeNumber,
    setCurrentVideoLinks,
    setIsLoadingNextEpisode,
    setShowLoadingAlert,

    // Handlers
    handleNextEpisode,
  };
};
