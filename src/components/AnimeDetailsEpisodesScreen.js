import React, { useEffect, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AddToListModal from "../screens/Watching/components/AddToListModal";
import {
  DetailsSection,
  EpisodesSection,
  styles,
  useAnimeDetailsEpisodes,
} from "./AnimeDetailsEpisodes";

const AnimeDetailsEpisodesScreen = ({ route, navigation }) => {
  const { animeId, animeName, fromDownloads = false } = route.params;
  const [listModalVisible, setListModalVisible] = useState(false);

  const {
    episodes,
    loadingEpisodes,
    loadingEpisodeId,
    loadingProgress,
    details,
    loadingDetails,
    showFullDetails,
    animation,
    downloadStates,
    downloadProgress,
    offlineMode,
    episodeInfoMap,
    toggleFullDetails,
    handleEpisodeSelect,
    handleDownloadAction,
    handleDeleteDownload,
    handleDownloadAllEpisodes,
    truncateText,
  } = useAnimeDetailsEpisodes({
    animeId,
    animeName,
    fromDownloads,
    navigation,
    autoPlayEpisode: route.params.autoPlayEpisode,
    autoPlayResumeTime: route.params.autoPlayResumeTime,
  });

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setListModalVisible(true)}
          style={{ padding: 8, marginRight: 4 }}
        >
          <MaterialIcons name="more-vert" size={24} color="#ffffff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <DetailsSection
        loadingDetails={loadingDetails}
        details={details}
        animeName={animeName}
        showFullDetails={showFullDetails}
        animation={animation}
        onToggleFullDetails={toggleFullDetails}
        truncateText={truncateText}
      />

      <EpisodesSection
        loadingEpisodes={loadingEpisodes}
        episodes={episodes}
        offlineMode={offlineMode}
        downloadStates={downloadStates}
        downloadProgress={downloadProgress}
        episodeInfoMap={episodeInfoMap}
        loadingEpisodeId={loadingEpisodeId}
        loadingProgress={loadingProgress}
        onPlayEpisode={handleEpisodeSelect}
        onDeleteEpisode={handleDeleteDownload}
        onDownloadAction={handleDownloadAction}
        onDownloadAll={handleDownloadAllEpisodes}
      />

      <View style={styles.footer} />

      <AddToListModal
        visible={listModalVisible}
        onClose={() => setListModalVisible(false)}
        anime={{
          animeId,
          animeName: details?.name || animeName,
          thumbnail: details?.thumbnail || null,
        }}
      />
    </ScrollView>
  );
};

export default AnimeDetailsEpisodesScreen;
