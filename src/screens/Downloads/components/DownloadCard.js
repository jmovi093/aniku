// screens/Downloads/components/DownloadCard.js
// Card de anime descargado - estilo WatchingCard

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { downloadsStyles as styles } from "../styles/DownloadsStyles";

const DownloadCard = ({ animeGroup, onViewAnime }) => {
  return (
    <TouchableOpacity
      style={styles.downloadCard}
      onPress={() => onViewAnime(animeGroup)}
      activeOpacity={0.8}
    >
      {/* Thumbnail placeholder */}
      <View style={styles.thumbnailContainer}>
        <MaterialIcons name="movie" size={36} color="#555" />
      </View>

      {/* Info */}
      <View style={styles.animeContent}>
        <Text style={styles.animeName} numberOfLines={2}>
          {animeGroup.animeName}
        </Text>
        <Text style={styles.episodeCount}>
          {animeGroup.totalEpisodes} episodio
          {animeGroup.totalEpisodes !== 1 ? "s" : ""} descargado
          {animeGroup.totalEpisodes !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Flecha */}
      <View style={styles.viewButton}>
        <MaterialIcons name="chevron-right" size={28} color="#007bff" />
      </View>
    </TouchableOpacity>
  );
};

export default DownloadCard;
