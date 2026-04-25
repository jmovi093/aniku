import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const AnimeCard = ({
  anime,
  onPress,
  size = "medium",
  showLastEpisode = false,
  style,
}) => {
  const cardStyles = size === "large" ? styles.cardLarge : styles.cardMedium;
  const imageStyles = size === "large" ? styles.imageLarge : styles.imageMedium;

  const getEpisodeInfo = () => {
    if (showLastEpisode && anime.lastEpisodeInfo?.sub) {
      return `Ep ${anime.lastEpisodeInfo.sub.episodeString}`;
    }

    const episodes = anime.episodes || anime.availableEpisodes?.sub;
    return episodes ? `${episodes} eps` : "N/A";
  };

  const getLastEpisodeTime = () => {
    if (!showLastEpisode || !anime.lastEpisodeDate?.sub) return null;

    const date = anime.lastEpisodeDate.sub;
    const time = `${date.hour?.toString().padStart(2, "0")}:${date.minute
      ?.toString()
      .padStart(2, "0")}`;
    return time !== "undefined:undefined" ? time : null;
  };

  return (
    <TouchableOpacity
      style={[cardStyles, style]}
      onPress={() => onPress(anime)}
    >
      {anime.thumbnail ? (
        <Image source={{ uri: anime.thumbnail }} style={imageStyles} />
      ) : (
        <View style={[imageStyles, styles.placeholderImage]}>
          <MaterialIcons name="movie" size={32} color="#666" />
        </View>
      )}

      <View style={styles.animeInfo}>
        <Text style={styles.animeName} numberOfLines={2}>
          {anime.name}
        </Text>

        <View style={styles.episodeRow}>
          <Text style={styles.episodeCount}>{getEpisodeInfo()}</Text>
          {anime.score && (
            <View style={styles.scoreContainer}>
              <MaterialIcons name="star" size={12} color="#ffc107" />
              <Text style={styles.animeScore}>{anime.score}</Text>
            </View>
          )}
        </View>

        {showLastEpisode && getLastEpisodeTime() && (
          <View style={styles.lastEpisodeRow}>
            <MaterialIcons name="access-time" size={12} color="#28a745" />
            <Text style={styles.lastEpisodeTime}>{getLastEpisodeTime()}</Text>
          </View>
        )}

        {size === "large" && anime.description && (
          <Text style={styles.animeDescription} numberOfLines={3}>
            {anime.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardMedium: {
    width: 160,
    marginRight: 12,
    backgroundColor: "#2a2a2a",
    borderRadius: 0,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#333333",
  },
  cardLarge: {
    width: 180,
    marginRight: 15,
    backgroundColor: "#2a2a2a",
    borderRadius: 0,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#333333",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  imageMedium: {
    width: "100%",
    height: 200,
    backgroundColor: "#333333",
    resizeMode: "cover",
  },
  imageLarge: {
    width: "100%",
    height: 240,
    backgroundColor: "#333333",
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 32,
    opacity: 0.5,
  },
  animeInfo: {
    padding: 10,
  },
  animeName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 6,
    minHeight: 32,
  },
  episodeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  episodeCount: {
    color: "#007bff",
    fontSize: 11,
    fontWeight: "500",
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  animeScore: {
    color: "#ffc107",
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 2,
  },
  lastEpisodeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  lastEpisodeTime: {
    color: "#28a745",
    fontSize: 10,
    fontWeight: "500",
    marginLeft: 4,
  },
  animeDescription: {
    color: "#cccccc",
    fontSize: 11,
    marginTop: 6,
    lineHeight: 14,
  },
});

export default AnimeCard;
