import React from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import DownloadService from "../../../services/DownloadService";
import { styles } from "../styles";
import { SkeletonEpisodes } from "./SkeletonSections";
import EpisodeRow from "./EpisodeRow";

const EpisodesSection = ({
  loadingEpisodes,
  episodes,
  offlineMode,
  downloadStates,
  downloadProgress,
  episodeInfoMap,
  loadingEpisodeId,
  loadingProgress,
  onPlayEpisode,
  onDeleteEpisode,
  onDownloadAction,
  onDownloadAll,
}) => {
  if (loadingEpisodes) {
    return <SkeletonEpisodes />;
  }

  return (
    <View style={styles.episodesSection}>
      <View style={styles.episodesHeader}>
        <View style={styles.episodesTitleContainer}>
          {offlineMode ? (
            <MaterialIcons name="smartphone" size={18} color="#007bff" />
          ) : (
            <MaterialIcons name="tv" size={18} color="#007bff" />
          )}
          <Text style={styles.episodesTitle}>
            Episodios ({episodes.length}{" "}
            {offlineMode ? "descargados" : "disponibles"})
          </Text>
        </View>

        {!offlineMode && (
          <TouchableOpacity
            style={styles.downloadAllButton}
            onPress={onDownloadAll}
          >
            <MaterialIcons name="download" size={16} color="#ffffff" />
            <Text style={styles.downloadAllText}>Todos</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={episodes}
        renderItem={({ item }) => (
          <EpisodeRow
            item={item}
            offlineMode={offlineMode}
            state={downloadStates[item]}
            progress={downloadProgress[item] || 0}
            info={episodeInfoMap[item]}
            isThisEpisodeLoading={loadingEpisodeId === item}
            onPlay={onPlayEpisode}
            onDelete={onDeleteEpisode}
            onDownloadAction={onDownloadAction}
            loadingProgress={loadingProgress}
          />
        )}
        keyExtractor={(item) => item.toString()}
        scrollEnabled={false}
        contentContainerStyle={styles.episodesList}
      />
    </View>
  );
};

export default EpisodesSection;
