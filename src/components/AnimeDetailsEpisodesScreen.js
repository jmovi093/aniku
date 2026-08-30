import React, { useEffect, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AddToListModal from "../screens/Watching/components/AddToListModal";
import {
  AnimeOverflowMenu,
  DetailsSection,
  EpisodesSection,
  RelatedAnimeModal,
  styles,
  useAnimeDetailsEpisodes,
} from "./AnimeDetailsEpisodes";

const AnimeDetailsEpisodesScreen = ({ route, navigation }) => {
  const { animeId, animeName, fromDownloads = false } = route.params;
  const [listModalVisible, setListModalVisible] = useState(false);
  // El botón de los tres puntos abre un menú (antes iba directo a las listas):
  // desde ahí se llega a Temporadas y Relacionados sin ocupar espacio fijo.
  const [menuVisible, setMenuVisible] = useState(false);
  const [seasonsVisible, setSeasonsVisible] = useState(false);
  const [relationsVisible, setRelationsVisible] = useState(false);

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

  const relationsCount = Object.values(details?.relations || {}).reduce(
    (total, list) => total + (list?.length || 0),
    0,
  );

  // Navegar a otro anime: `push` (no `navigate`) para poder encadenar
  // temporada → precuela → … y que el back vuelva paso a paso.
  const openAnime = (anime) => {
    setSeasonsVisible(false);
    setRelationsVisible(false);
    navigation.push("Episodes", {
      animeId: anime.id,
      animeName: anime.name,
    });
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
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

      <AnimeOverflowMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        seasonsCount={details?.seasons?.length || 0}
        relationsCount={relationsCount}
        onAddToList={() => {
          setMenuVisible(false);
          setListModalVisible(true);
        }}
        onShowSeasons={() => {
          setMenuVisible(false);
          setSeasonsVisible(true);
        }}
        onShowRelations={() => {
          setMenuVisible(false);
          setRelationsVisible(true);
        }}
      />

      <RelatedAnimeModal
        visible={seasonsVisible}
        onClose={() => setSeasonsVisible(false)}
        title="Temporadas"
        items={details?.seasons || []}
        onSelect={openAnime}
      />

      <RelatedAnimeModal
        visible={relationsVisible}
        onClose={() => setRelationsVisible(false)}
        title="Relacionados"
        groups={details?.relations || {}}
        onSelect={openAnime}
      />

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
