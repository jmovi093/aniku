const logger = createLogger("app");
import { createLogger } from "../../../utils/logger";
// screens/Watching/components/WatchingCard.js
// Componente para mostrar un anime en la lista de watching

import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { watchingStyles as styles } from "../styles/WatchingStyles";

const WatchingCard = ({
  anime,
  onContinueWatching,
  onRemove,
  onViewEpisodes, // ← CAMBIO: de onViewDetails a onViewEpisodes
}) => {
  // � DEBUG: Verificar datos del anime
  logger.debug("🎴 WATCHING CARD DEBUG:", {
    animeId: anime.animeId,
    animeName: anime.animeName,
    thumbnail: anime.thumbnail
      ? `✅ SÍ (${anime.thumbnail.substring(0, 50)}...)`
      : "❌ NO",
    progress: anime.progress,
    totalDuration: anime.totalDuration,
  });

  // �📊 Calcular progreso
  const progress =
    anime.totalDuration > 0
      ? (anime.progress / anime.totalDuration) * 100 // ← CORREGIDO: usar anime.progress
      : 0;

  // ⏰ Formatear tiempo
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.watchingCard}>
      {/* 🖼️ THUMBNAIL (izquierda) */}
      <View style={styles.thumbnailContainer}>
        {anime.thumbnail ? (
          <Image source={{ uri: anime.thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
            <MaterialIcons name="movie" size={32} color="#666" />
          </View>
        )}

        {/* 📊 Barra de progreso superpuesta */}
        <View style={styles.progressOverlay}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* � CONTENIDO (derecha) */}
      <View style={styles.animeContent}>
        {/* �📺 Header del anime */}
        <View style={styles.cardHeader}>
          <View style={styles.animeInfo}>
            <Text
              style={styles.animeName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {anime.animeName}
            </Text>
            <Text style={styles.episodeInfo}>
              Episodio {anime.currentEpisode}
            </Text>
            <Text style={styles.timeInfo}>
              {formatTime(anime.progress)} / {formatTime(anime.totalDuration)}
            </Text>
          </View>

          {/* 🗑️ Botón eliminar */}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove(anime.animeId)}
          >
            <MaterialIcons name="close" size={20} color="#ff4444" />
          </TouchableOpacity>
        </View>

        {/* 🎮 Botones de acción */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => onContinueWatching(anime)}
          >
            <Ionicons name="play" size={18} color="#ffffff" />
            <Text style={styles.continueText}>Continuar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => onViewEpisodes(anime)}
          >
            <MaterialIcons name="list" size={18} color="#007bff" />
            <Text style={styles.detailsText}>Episodios</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default WatchingCard;
