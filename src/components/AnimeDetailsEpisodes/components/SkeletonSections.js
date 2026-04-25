import React from "react";
import { View, FlatList } from "react-native";
import { styles } from "../styles";

export const SkeletonHeader = () => (
  <View style={styles.headerSection}>
    <View style={styles.thumbnailContainer}>
      <View style={styles.skeletonThumbnail} />
    </View>
    <View style={styles.basicInfo}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonStatusRow}>
        <View style={styles.skeletonBadge} />
        <View style={styles.skeletonBadge} />
      </View>
      <View style={styles.skeletonDescription} />
      <View style={styles.skeletonDescriptionShort} />
      <View style={styles.skeletonButton} />
    </View>
  </View>
);

export const SkeletonEpisodes = () => {
  const skeletonEpisodes = Array.from({ length: 12 }, (_, index) => index);

  return (
    <View style={styles.episodesSection}>
      <View style={styles.episodesHeader}>
        <View style={styles.episodesTitleContainer}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonEpisodesTitle} />
        </View>
        <View style={styles.skeletonDownloadButton} />
      </View>

      <FlatList
        data={skeletonEpisodes}
        renderItem={() => (
          <View style={styles.episodeRow}>
            <View style={styles.episodeRowThumb}>
              <View style={styles.skeletonEpisodeItem} />
            </View>
            <View style={styles.episodeRowInfo}>
              <View style={styles.skeletonEpisodeText} />
            </View>
          </View>
        )}
        keyExtractor={(item) => `skeleton-${item}`}
        scrollEnabled={false}
        contentContainerStyle={styles.episodesList}
      />
    </View>
  );
};
