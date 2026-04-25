// screens/Player/PlayerScreen.js

import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Image, BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { VideoPlayer } from "./components";
import { useVideoPlayer, useEpisodeManager } from "./hooks";
import { playerStyles as styles } from "./styles/PlayerStyles";

const PlayerScreen = ({ route, navigation }) => {
  const {
    episodeNumber: initialEpisodeNumber,
    animeName,
    videoLinks: initialVideoLinks,
  } = route.params;

  const {
    selectedQuality,
    isPlaying,
    currentTime,
    duration,
    isBuffering,
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
    seekBy,
    seekTo,
    onBuffer,
    onEnd,
  } = useVideoPlayer(route, animeName, initialEpisodeNumber);

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
        onProgress={onProgress}
        onLoad={onLoad}
        onSeek={onSeek}
        onBuffer={onBuffer}
        onEnd={onEnd}
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
