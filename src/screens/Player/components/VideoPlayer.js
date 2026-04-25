const logger = createLogger("player");
import { createLogger } from "../../../utils/logger";
// screens/Player/components/VideoPlayer.js
// Reproductor con controles personalizados

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import Video from "react-native-video";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { playerStyles as styles } from "../styles/PlayerStyles";

const formatTime = (secs) => {
  const s = Math.floor(secs || 0);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0)
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};

const VideoPlayer = ({
  currentLink,
  videoRef,
  isPlaying,
  isFullscreen,
  currentTime,
  duration,
  isBuffering,
  onProgress,
  onLoad,
  onSeek,
  onBuffer,
  onEnd,
  seekBy,
  seekTo,
  togglePlayPause,
  toggleFullscreen,
  animeName,
  currentEpisodeNumber,
  nextEpisodeNum,
  hasNextEpisode,
  handleNextEpisode,
  isLoadingNextEpisode,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [controlsVisible, setControlsVisible] = useState(true);
  const [seekBarWidth, setSeekBarWidth] = useState(1);
  const [videoAspectRatio, setVideoAspectRatio] = useState(16 / 9);
  const hideTimerRef = useRef(null);

  // Left seek session
  const lastTapLeft = useRef(0);
  const leftSessionActive = useRef(false);
  const leftSessionTimer = useRef(null);
  const leftSingleTapTimer = useRef(null);

  // Right seek session
  const lastTapRight = useRef(0);
  const rightSessionActive = useRef(false);
  const rightSessionTimer = useRef(null);
  const rightSingleTapTimer = useRef(null);

  useEffect(
    () => () => {
      clearTimeout(hideTimerRef.current);
      clearTimeout(leftSessionTimer.current);
      clearTimeout(leftSingleTapTimer.current);
      clearTimeout(rightSessionTimer.current);
      clearTimeout(rightSingleTapTimer.current);
    },
    [],
  );

  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  useEffect(() => {
    if (isPlaying) showControls();
  }, [isPlaying]);

  const toggleControls = useCallback(() => {
    setControlsVisible((prev) => {
      clearTimeout(hideTimerRef.current);

      if (prev) {
        return false;
      }

      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
      return true;
    });
  }, []);

  const handleCenterTap = () => {
    toggleControls();
  };

  const SESSION_TIMEOUT = 600; // ms — ventana para tap adicional dentro de la sesión
  const DOUBLE_TAP_WINDOW = 300; // ms — ventana para detectar el doble tap inicial

  const handleTapLeft = () => {
    const now = Date.now();

    if (leftSessionActive.current) {
      // Ya estamos en sesión: cualquier tap dentro de la ventana suma -10
      if (now - lastTapLeft.current < SESSION_TIMEOUT) {
        seekBy(-10);
        lastTapLeft.current = now;
        // Reiniciar el timer de expiración de sesión
        clearTimeout(leftSessionTimer.current);
        leftSessionTimer.current = setTimeout(() => {
          leftSessionActive.current = false;
        }, SESSION_TIMEOUT);

        if (controlsVisible) showControls();
        return;
      } else {
        // Pasó demasiado tiempo, terminar sesión y empezar detección nueva
        leftSessionActive.current = false;
        lastTapLeft.current = now;
      }
    } else {
      // Fuera de sesión: buscar doble tap
      if (now - lastTapLeft.current < DOUBLE_TAP_WINDOW) {
        // ¡Doble tap! Activar sesión y hacer primer seek
        clearTimeout(leftSingleTapTimer.current);
        seekBy(-10);
        leftSessionActive.current = true;
        lastTapLeft.current = now;
        clearTimeout(leftSessionTimer.current);
        leftSessionTimer.current = setTimeout(() => {
          leftSessionActive.current = false;
        }, SESSION_TIMEOUT);

        if (controlsVisible) showControls();
        return;
      } else {
        // Primer tap: solo guardar timestamp
        lastTapLeft.current = now;
      }
    }

    clearTimeout(leftSingleTapTimer.current);
    leftSingleTapTimer.current = setTimeout(() => {
      toggleControls();
    }, DOUBLE_TAP_WINDOW);
  };

  const handleTapRight = () => {
    const now = Date.now();

    if (rightSessionActive.current) {
      if (now - lastTapRight.current < SESSION_TIMEOUT) {
        seekBy(10);
        lastTapRight.current = now;
        clearTimeout(rightSessionTimer.current);
        rightSessionTimer.current = setTimeout(() => {
          rightSessionActive.current = false;
        }, SESSION_TIMEOUT);

        if (controlsVisible) showControls();
        return;
      } else {
        rightSessionActive.current = false;
        lastTapRight.current = now;
      }
    } else {
      if (now - lastTapRight.current < DOUBLE_TAP_WINDOW) {
        clearTimeout(rightSingleTapTimer.current);
        seekBy(10);
        rightSessionActive.current = true;
        lastTapRight.current = now;
        clearTimeout(rightSessionTimer.current);
        rightSessionTimer.current = setTimeout(() => {
          rightSessionActive.current = false;
        }, SESSION_TIMEOUT);

        if (controlsVisible) showControls();
        return;
      } else {
        lastTapRight.current = now;
      }
    }

    clearTimeout(rightSingleTapTimer.current);
    rightSingleTapTimer.current = setTimeout(() => {
      toggleControls();
    }, DOUBLE_TAP_WINDOW);
  };

  const handleSeekBarPress = (event) => {
    const { locationX } = event.nativeEvent;
    if (seekBarWidth > 0 && duration > 0) {
      seekTo(
        Math.max(0, Math.min((locationX / seekBarWidth) * duration, duration)),
      );
    }
    showControls();
  };

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  const source = {
    uri: currentLink.url,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
      Referer: currentLink.requiresReferer
        ? "https://allanime.day/"
        : "https://allmanga.to",
    },
  };

  const dynamicPlayerHeight = Math.min(
    screenWidth / Math.max(videoAspectRatio, 0.5),
    screenHeight * 0.58,
  );

  const handleVideoLoad = (data) => {
    const rawWidth = parseFloat(data?.naturalSize?.width || 0);
    const rawHeight = parseFloat(data?.naturalSize?.height || 0);

    if (rawWidth > 0 && rawHeight > 0) {
      setVideoAspectRatio(rawWidth / rawHeight);
    }

    onLoad(data);
  };

  return (
    <View
      style={[
        isFullscreen
          ? styles.playerContainerFullscreen
          : styles.playerContainer,
        !isFullscreen && {
          height: dynamicPlayerHeight,
          maxHeight: screenHeight * 0.58,
        },
      ]}
    >
      {currentLink?.url ? (
        <>
          <Video
            ref={videoRef}
            source={source}
            style={styles.videoPlayer}
            controls={false}
            paused={!isPlaying}
            resizeMode="contain"
            onProgress={onProgress}
            onLoad={handleVideoLoad}
            onSeek={onSeek}
            onBuffer={onBuffer}
            onEnd={onEnd}
            onError={(error) => logger.error("❌ ERROR EN VIDEO:", error)}
            progressUpdateInterval={1000}
            volume={1.0}
            muted={false}
            repeat={false}
            playWhenInactive={false}
            playInBackground={false}
            ignoreSilentSwitch="ignore"
          />

          {/* Buffering — visible cuando no hay controles */}
          {isBuffering && !controlsVisible && (
            <View style={styles.bufferingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}

          {/* Zonas táctiles: izquierda | centro | derecha */}
          <View style={styles.tapOverlay} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.tapZone}
              onPress={handleTapLeft}
              activeOpacity={1}
            />
            <TouchableOpacity
              style={styles.tapZoneCenter}
              onPress={handleCenterTap}
              activeOpacity={1}
            />
            <TouchableOpacity
              style={styles.tapZone}
              onPress={handleTapRight}
              activeOpacity={1}
            />
          </View>

          {/* Controles visibles */}
          {controlsVisible && (
            <View style={styles.controlsOverlay} pointerEvents="box-none">
              {/* Top */}
              <View
                style={[
                  styles.controlsTop,
                  {
                    paddingTop: isFullscreen
                      ? 12
                      : Math.max(12, insets.top + 4),
                  },
                ]}
                pointerEvents="none"
              >
                <Text style={styles.controlsTitle} numberOfLines={1}>
                  {animeName}
                </Text>
                <Text style={styles.controlsEpisode}>
                  Ep. {currentEpisodeNumber}
                </Text>
              </View>

              {/* Centro: play/pause + buffering */}
              <View style={styles.controlsCenter} pointerEvents="box-none">
                {isBuffering ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <TouchableOpacity
                    onPress={togglePlayPause}
                    style={styles.playPauseBtn}
                    pointerEvents="auto"
                  >
                    <MaterialIcons
                      name={isPlaying ? "pause" : "play-arrow"}
                      size={52}
                      color="#fff"
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Bottom: seekbar + botones */}
              <View style={styles.controlsBottom} pointerEvents="box-none">
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={handleSeekBarPress}
                  style={styles.seekBarContainer}
                  onLayout={(e) => setSeekBarWidth(e.nativeEvent.layout.width)}
                  pointerEvents="auto"
                >
                  <View style={styles.seekBarTrack}>
                    <View
                      style={[
                        styles.seekBarFill,
                        { width: `${progress * 100}%` },
                      ]}
                    />
                  </View>
                  <View
                    style={[
                      styles.seekBarThumb,
                      { left: `${Math.min(progress * 100, 96)}%` },
                    ]}
                  />
                </TouchableOpacity>

                <View style={styles.controlsRow} pointerEvents="box-none">
                  <TouchableOpacity
                    onPress={togglePlayPause}
                    style={styles.controlBtn}
                    pointerEvents="auto"
                  >
                    <MaterialIcons
                      name={isPlaying ? "pause" : "play-arrow"}
                      size={26}
                      color="#fff"
                    />
                  </TouchableOpacity>

                  <Text style={styles.timeText} pointerEvents="none">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </Text>

                  <View style={styles.controlsRight} pointerEvents="box-none">
                    {hasNextEpisode !== false && (
                      <TouchableOpacity
                        onPress={handleNextEpisode}
                        style={styles.controlBtn}
                        disabled={isLoadingNextEpisode}
                        pointerEvents="auto"
                      >
                        {isLoadingNextEpisode ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <MaterialIcons
                            name="skip-next"
                            size={26}
                            color="#fff"
                          />
                        )}
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={toggleFullscreen}
                      style={styles.controlBtn}
                      pointerEvents="auto"
                    >
                      <MaterialIcons
                        name={isFullscreen ? "fullscreen-exit" : "fullscreen"}
                        size={26}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
        </>
      ) : (
        <View style={styles.playerPlaceholder}>
          <MaterialIcons
            name="movie"
            size={32}
            color="#666"
            style={{ marginBottom: 8 }}
          />
          <Text style={styles.placeholderText}>No hay enlaces disponibles</Text>
        </View>
      )}
    </View>
  );
};

export default VideoPlayer;
