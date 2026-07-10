// screens/Player/PlayerScreen.js

import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Image, BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { VideoPlayer } from "./components";
import { useVideoPlayer, useEpisodeManager } from "./hooks";
import { playerStyles as styles } from "./styles/PlayerStyles";
import AnimeService from "../../services/AnimeService";
import { createLogger } from "../../utils/logger";

const logger = createLogger("player");

const PlayerScreen = ({ route, navigation }) => {
  const {
    episodeNumber: initialEpisodeNumber,
    animeName,
    videoLinks: initialVideoLinks,
  } = route.params;

  const {
    currentEpisodeNumber,
    currentVideoLinks,
    isLoadingNextEpisode,
    hasNextEpisode,
    setCurrentEpisodeNumber,
    setCurrentVideoLinks,
    setIsLoadingNextEpisode,
    setShowLoadingAlert,
    handleNextEpisode: baseHandleNextEpisode,
  } = useEpisodeManager(initialEpisodeNumber, initialVideoLinks, route);

  // Cuando el player agota los reintentos con la fuente actual: pide una
  // carrera nueva excluyendo ese provider y actualiza los links si hay éxito.
  const handleProviderExhausted = async () => {
    const failedProvider = currentVideoLinks[0]?.provider;
    if (!failedProvider) return false;

    try {
      const freshLinks = await AnimeService.getOptimizedVideoLinks(
        route.params.animeId,
        currentEpisodeNumber.toString(),
        "sub",
        { excludeProviders: [failedProvider] },
      );

      if (freshLinks && freshLinks.length > 0) {
        logger.debug(
          `🔀 Cambiando de provider tras fallo: ${failedProvider} → ${freshLinks[0].provider}`,
        );
        setCurrentVideoLinks(freshLinks);
        setSelectedQuality(0);
        return true;
      }
      return false;
    } catch (error) {
      logger.debug("❌ No se encontró provider alternativo:", error.message);
      return false;
    }
  };

  const {
    selectedQuality,
    isPlaying,
    currentTime,
    duration,
    isBuffering,
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
    seekBy,
    seekTo,
    onBuffer,
    onEnd,
    onError,
    retryPlayback,
  } = useVideoPlayer(route, animeName, initialEpisodeNumber, {
    onProviderExhausted: handleProviderExhausted,
  });

  const nextEpisodeNum = parseInt(currentEpisodeNumber) + 1;
  const animeIdForNav = route.params.animeId;
  const currentLink =
    currentVideoLinks[selectedQuality] || currentVideoLinks[0];

  const handleNextEpisode = async () => {
    resetForNewEpisode(parseInt(currentEpisodeNumber) + 1);
    await baseHandleNextEpisode(
      () => {},
      setSelectedQuality,
      () => {},
      setDuration,
      setHasInitialLoad,
    );
  };

  // 🔙 Interceptar botón back de Android: si está en fullscreen, salir de fullscreen
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (isFullscreen) {
          toggleFullscreen();
          return true; // consumir el evento, no navegar atrás
        }
        return false; // comportamiento normal
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [isFullscreen, toggleFullscreen]),
  );

  return (
    <View style={styles.container}>
      <VideoPlayer
        currentLink={currentLink}
        videoRef={videoRef}
        isPlaying={isPlaying}
        isFullscreen={isFullscreen}
        currentTime={currentTime}
        duration={duration}
        isBuffering={isBuffering}
        playableDuration={playableDuration}
        reloadToken={reloadToken}
        playerError={playerError}
        onProgress={onProgress}
        onLoad={onLoad}
        onSeek={onSeek}
        onBuffer={onBuffer}
        onEnd={onEnd}
        onError={onError}
        retryPlayback={retryPlayback}
        seekBy={seekBy}
        seekTo={seekTo}
        togglePlayPause={togglePlayPause}
        toggleFullscreen={toggleFullscreen}
        animeName={animeName}
        currentEpisodeNumber={currentEpisodeNumber}
        nextEpisodeNum={nextEpisodeNum}
        hasNextEpisode={hasNextEpisode}
        handleNextEpisode={handleNextEpisode}
        isLoadingNextEpisode={isLoadingNextEpisode}
      />

      {/* Info + navegación (solo visible fuera de fullscreen) */}
      {!isFullscreen && (
        <>
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {animeName}
            </Text>
            <Text style={styles.episode}>Episodio {currentEpisodeNumber}</Text>
          </View>

          {/* Siguiente episodio — solo si existe o aún no se sabe */}
          {hasNextEpisode !== false && (
            <View style={styles.nextSection}>
              <Text style={styles.nextSectionLabel}>Siguiente</Text>
              <TouchableOpacity
                style={styles.episodeRow}
                onPress={handleNextEpisode}
                disabled={isLoadingNextEpisode}
              >
                <View style={styles.episodeRowThumb}>
                  {route.params.thumbnail ? (
                    <Image
                      source={{ uri: route.params.thumbnail }}
                      style={styles.episodeRowThumbImg}
                    />
                  ) : (
                    <View style={styles.episodeRowThumbPlaceholder}>
                      <MaterialIcons
                        name="play-circle-outline"
                        size={32}
                        color="#444"
                      />
                    </View>
                  )}
                </View>
                <View style={styles.episodeRowInfo}>
                  <Text style={styles.episodeRowTitle}>
                    Episodio {nextEpisodeNum}
                  </Text>
                  {isLoadingNextEpisode && (
                    <Text style={styles.episodeRowStatus}>Cargando...</Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.allEpisodesLink}
                onPress={() =>
                  navigation.navigate("Episodes", {
                    animeId: animeIdForNav,
                    animeName,
                  })
                }
              >
                <MaterialIcons name="list" size={20} color="#ffffff" />
                <Text style={styles.allEpisodesText}>Todos los episodios</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
};

export default PlayerScreen;
