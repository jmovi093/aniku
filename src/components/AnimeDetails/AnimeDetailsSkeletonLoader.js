// AnimeDetailsSkeletonLoader.js
// Componente skeleton loader para AnimeDetails

import React from "react";
import { View, ScrollView } from "react-native";
import AnimeDetailsStyles from "./styles/AnimeDetailsStyles";

const AnimeDetailsSkeletonLoader = () => {
  return (
    <ScrollView style={AnimeDetailsStyles.container}>
      {/* Skeleton Header */}
      <View style={AnimeDetailsStyles.headerSection}>
        {/* Skeleton Thumbnail */}
        <View style={AnimeDetailsStyles.thumbnailContainer}>
          <View style={AnimeDetailsStyles.skeletonThumbnail} />
        </View>

        {/* Skeleton Información Básica */}
        <View style={AnimeDetailsStyles.basicInfo}>
          {/* Skeleton Título */}
          <View style={[AnimeDetailsStyles.skeletonTitle, { width: "95%" }]} />
          <View
            style={[
              AnimeDetailsStyles.skeletonTitle,
              { width: "80%", marginBottom: 12 },
            ]}
          />

          {/* Skeleton Estado y Score */}
          <View style={AnimeDetailsStyles.statusRow}>
            <View style={AnimeDetailsStyles.skeletonBadge} />
            <View style={[AnimeDetailsStyles.skeletonBadge, { width: 50 }]} />
          </View>

          {/* Skeleton Descripción */}
          <View style={AnimeDetailsStyles.skeletonDescription} />
          <View style={AnimeDetailsStyles.skeletonDescription} />
          <View style={AnimeDetailsStyles.skeletonDescriptionShort} />

          {/* Skeleton Botón Expandir */}
          <View style={AnimeDetailsStyles.skeletonButton} />
        </View>
      </View>

      {/* Skeleton Sección de Episodios */}
      <View style={AnimeDetailsStyles.episodesSection}>
        {/* Skeleton Header de Episodios */}
        <View style={AnimeDetailsStyles.episodesHeader}>
          <View style={AnimeDetailsStyles.episodesTitleContainer}>
            <View style={AnimeDetailsStyles.skeletonEpisodesTitle} />
            <View
              style={[AnimeDetailsStyles.skeletonIcon, { marginLeft: 8 }]}
            />
          </View>
          <View style={AnimeDetailsStyles.skeletonDownloadButton} />
        </View>

        {/* Skeleton Grid de Episodios */}
        <View style={AnimeDetailsStyles.episodesList}>
          {Array(12)
            .fill(null)
            .map((_, index) => (
              <View
                key={`skeleton-episode-${index}`}
                style={AnimeDetailsStyles.episodeItemContainer}
              >
                <View style={AnimeDetailsStyles.skeletonEpisodeItem}>
                  <View style={AnimeDetailsStyles.skeletonEpisodeText} />
                </View>
              </View>
            ))}
        </View>
      </View>

      {/* Footer espaciado */}
      <View style={AnimeDetailsStyles.footer} />
    </ScrollView>
  );
};

/**
 * Skeleton loader compacto para usar en otros componentes
 */
export const CompactSkeletonLoader = () => (
  <View style={AnimeDetailsStyles.headerSection}>
    <View style={AnimeDetailsStyles.thumbnailContainer}>
      <View style={AnimeDetailsStyles.skeletonThumbnail} />
    </View>
    <View style={AnimeDetailsStyles.basicInfo}>
      <View style={[AnimeDetailsStyles.skeletonTitle, { width: "90%" }]} />
      <View style={AnimeDetailsStyles.statusRow}>
        <View style={AnimeDetailsStyles.skeletonBadge} />
        <View style={[AnimeDetailsStyles.skeletonBadge, { width: 40 }]} />
      </View>
      <View style={AnimeDetailsStyles.skeletonDescription} />
      <View style={AnimeDetailsStyles.skeletonDescriptionShort} />
    </View>
  </View>
);

/**
 * Skeleton loader solo para episodios
 */
export const EpisodesSkeletonLoader = ({ episodeCount = 12 }) => (
  <View style={AnimeDetailsStyles.episodesSection}>
    <View style={AnimeDetailsStyles.episodesHeader}>
      <View style={AnimeDetailsStyles.episodesTitleContainer}>
        <View style={AnimeDetailsStyles.skeletonEpisodesTitle} />
      </View>
      <View style={AnimeDetailsStyles.skeletonDownloadButton} />
    </View>

    <View style={AnimeDetailsStyles.episodesList}>
      {Array(episodeCount)
        .fill(null)
        .map((_, index) => (
          <View
            key={`skeleton-ep-${index}`}
            style={AnimeDetailsStyles.episodeItemContainer}
          >
            <View style={AnimeDetailsStyles.skeletonEpisodeItem}>
              <View style={AnimeDetailsStyles.skeletonEpisodeText} />
            </View>
          </View>
        ))}
    </View>
  </View>
);

export default AnimeDetailsSkeletonLoader;
