// AnimeDetailsEpisodes.js
// Componente para mostrar y manejar la lista de episodios

import React from "react";
import { View, Text, TouchableOpacity, FlatList, Alert } from "react-native";
import AnimeDetailsStyles from "./styles/AnimeDetailsStyles";
import {
  isEpisodeDownloaded,
  hasEpisodesToDownload,
  getEpisodeStatusText,
  canPlayEpisode,
} from "./utils/animeDetailsUtils";

const AnimeDetailsEpisodes = ({
  episodes,
  downloadedEpisodes,
  isOffline,
  loadingEpisodeId,
  processingMessage,
  isDownloadingAll,
  onEpisodeSelect,
  onEpisodeDownload,
  onDownloadAll,
  onDeleteEpisode,
}) => {
  /**
   * Renderiza un item de episodio individual
   */
  const renderEpisodeItem = ({ item }) => {
    const episodeNumber = item.episode;
    const isDownloaded = isEpisodeDownloaded(episodeNumber, downloadedEpisodes);
    const isCurrentlyLoading = loadingEpisodeId === episodeNumber;
    const canPlay = canPlayEpisode(
      episodeNumber,
      downloadedEpisodes,
      isOffline
    );
    const statusText = getEpisodeStatusText(
      episodeNumber,
      downloadedEpisodes,
      isOffline
    );

    // Estilos dinámicos para el episodio
    const episodeStyle = [
      AnimeDetailsStyles.episodeItem,
      isDownloaded && AnimeDetailsStyles.episodeItemDownloaded,
      isCurrentlyLoading && AnimeDetailsStyles.episodeItemLoading,
      !canPlay && { opacity: 0.5 },
    ];

    return (
      <View style={AnimeDetailsStyles.episodeItemContainer}>
        {/* Botón principal del episodio */}
        <TouchableOpacity
          style={episodeStyle}
          onPress={() => handleEpisodePress(episodeNumber, canPlay)}
          onLongPress={() =>
            handleEpisodeLongPress(episodeNumber, isDownloaded)
          }
          disabled={isCurrentlyLoading || !canPlay}
        >
          <View style={AnimeDetailsStyles.episodeNumberContainer}>
            <Text style={AnimeDetailsStyles.episodeNumber}>
              {episodeNumber}
            </Text>

            {/* Indicador de carga específico */}
            {isCurrentlyLoading && (
              <Text style={AnimeDetailsStyles.loadingIndicator}>●</Text>
            )}

            {/* Indicador de descarga */}
            {isDownloaded && !isCurrentlyLoading && (
              <Text style={AnimeDetailsStyles.offlineText}>✓</Text>
            )}
          </View>

          {/* Mensaje de estado */}
          {isCurrentlyLoading && processingMessage && (
            <Text style={AnimeDetailsStyles.loadingIndicator}>
              {processingMessage}
            </Text>
          )}

          {/* Texto de estado del episodio */}
          {statusText && !isCurrentlyLoading && (
            <Text
              style={
                isDownloaded
                  ? AnimeDetailsStyles.offlineText
                  : AnimeDetailsStyles.progressText
              }
            >
              {statusText}
            </Text>
          )}
        </TouchableOpacity>

        {/* Botón de descarga */}
        {!isDownloaded && !isOffline && (
          <TouchableOpacity
            style={AnimeDetailsStyles.downloadButton}
            onPress={() => onEpisodeDownload(episodeNumber)}
            disabled={isCurrentlyLoading}
          >
            <Text
              style={[AnimeDetailsStyles.downloadIcon, { color: "#ffffff" }]}
            >
              ⬇
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /**
   * Maneja el press normal en un episodio (reproducir)
   */
  const handleEpisodePress = (episodeNumber, canPlay) => {
    if (!canPlay) {
      Alert.alert(
        "Episodio no disponible",
        "Este episodio no está disponible offline. Conéctate a internet para verlo.",
        [{ text: "OK" }]
      );
      return;
    }

    if (onEpisodeSelect) {
      onEpisodeSelect(episodeNumber);
    }
  };

  /**
   * Maneja el long press en un episodio (opciones)
   */
  const handleEpisodeLongPress = (episodeNumber, isDownloaded) => {
    const options = [];

    // Opción de reproducir
    options.push({
      text: "Reproducir",
      onPress: () => handleEpisodePress(episodeNumber, true),
    });

    // Opción de descargar (si no está descargado)
    if (!isDownloaded && !isOffline) {
      options.push({
        text: "Descargar",
        onPress: () => onEpisodeDownload && onEpisodeDownload(episodeNumber),
      });
    }

    // Opción de eliminar (si está descargado)
    if (isDownloaded) {
      options.push({
        text: "Eliminar descarga",
        style: "destructive",
        onPress: () => onDeleteEpisode && onDeleteEpisode(episodeNumber),
      });
    }

    options.push({ text: "Cancelar", style: "cancel" });

    Alert.alert(`Episodio ${episodeNumber}`, "Selecciona una acción:", options);
  };

  /**
   * Renderiza el header de la sección de episodios
   */
  const renderEpisodesHeader = () => (
    <View style={AnimeDetailsStyles.episodesHeader}>
      <View style={AnimeDetailsStyles.episodesTitleContainer}>
        <Text style={AnimeDetailsStyles.episodesTitle}>
          Episodios ({episodes.length})
        </Text>

        {/* Indicador de modo offline */}
        {isOffline && (
          <View style={AnimeDetailsStyles.offlineBanner}>
            <Text style={AnimeDetailsStyles.offlineBannerText}>
              📴 Modo Offline
            </Text>
          </View>
        )}
      </View>

      {/* Botón de descargar todos */}
      {!isOffline && hasEpisodesToDownload(episodes, downloadedEpisodes) && (
        <TouchableOpacity
          style={AnimeDetailsStyles.downloadAllButton}
          onPress={onDownloadAll}
          disabled={isDownloadingAll}
        >
          <Text style={AnimeDetailsStyles.downloadAllText}>
            {isDownloadingAll ? "Descargando..." : "⬇ Todos"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  /**
   * Renderiza el skeleton loader para episodios
   */
  const renderEpisodesSkeleton = () => (
    <View style={AnimeDetailsStyles.episodesSection}>
      {/* Skeleton Header */}
      <View style={AnimeDetailsStyles.episodesHeader}>
        <View style={AnimeDetailsStyles.episodesTitleContainer}>
          <View style={AnimeDetailsStyles.skeletonEpisodesTitle} />
        </View>
        <View style={AnimeDetailsStyles.skeletonDownloadButton} />
      </View>

      {/* Skeleton Episodios */}
      <FlatList
        data={Array(12).fill({})} // 12 episodios skeleton
        numColumns={3}
        renderItem={() => (
          <View style={AnimeDetailsStyles.episodeItemContainer}>
            <View style={AnimeDetailsStyles.skeletonEpisodeItem}>
              <View style={AnimeDetailsStyles.skeletonEpisodeText} />
            </View>
          </View>
        )}
        keyExtractor={(_, index) => `skeleton-${index}`}
        contentContainerStyle={AnimeDetailsStyles.episodesList}
        scrollEnabled={false}
      />
    </View>
  );

  // Si no hay episodios, mostrar skeleton
  if (!episodes || episodes.length === 0) {
    return renderEpisodesSkeleton();
  }

  return (
    <View style={AnimeDetailsStyles.episodesSection}>
      {/* Header de episodios */}
      {renderEpisodesHeader()}

      {/* Lista de episodios */}
      <FlatList
        data={episodes}
        renderItem={renderEpisodeItem}
        keyExtractor={(item) => `episode-${item.episode}`}
        numColumns={3}
        contentContainerStyle={AnimeDetailsStyles.episodesList}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        getItemLayout={(data, index) => ({
          length: 80, // Altura aproximada del item
          offset: 80 * Math.floor(index / 3), // 3 columnas
          index,
        })}
      />
    </View>
  );
};

export default AnimeDetailsEpisodes;
