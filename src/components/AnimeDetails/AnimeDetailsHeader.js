// AnimeDetailsHeader.js
// Componente para mostrar la información del header del anime

import React from "react";
import { View, Text, Image, TouchableOpacity, Animated } from "react-native";
import AnimeDetailsStyles from "./styles/AnimeDetailsStyles";
import {
  getStatusColor,
  formatScore,
  truncateText,
  processGenres,
  getAnimeStats,
} from "./utils/animeDetailsUtils";

const AnimeDetailsHeader = ({
  animeDetails,
  isExpanded,
  onToggleExpanded,
  isLoading = false,
}) => {
  if (isLoading || !animeDetails) {
    return <AnimeDetailsHeaderSkeleton />;
  }

  const stats = getAnimeStats(animeDetails);
  const genres = processGenres(animeDetails.genres);
  const statusColor = getStatusColor(animeDetails.status);
  const formattedScore = formatScore(animeDetails.score);

  return (
    <View>
      {/* Header Principal */}
      <View style={AnimeDetailsStyles.headerSection}>
        {/* Thumbnail */}
        <View style={AnimeDetailsStyles.thumbnailContainer}>
          <Image
            source={{ uri: animeDetails.thumbnail }}
            style={AnimeDetailsStyles.thumbnail}
            resizeMode="cover"
          />
        </View>

        {/* Información Básica */}
        <View style={AnimeDetailsStyles.basicInfo}>
          {/* Título */}
          <Text style={AnimeDetailsStyles.title} numberOfLines={3}>
            {animeDetails.title}
          </Text>

          {/* Estado y Score */}
          <View style={AnimeDetailsStyles.statusRow}>
            {animeDetails.status && (
              <View
                style={[
                  AnimeDetailsStyles.statusBadge,
                  { backgroundColor: statusColor },
                ]}
              >
                <Text style={AnimeDetailsStyles.statusText}>
                  {animeDetails.status}
                </Text>
              </View>
            )}

            {formattedScore !== "N/A" && (
              <View style={AnimeDetailsStyles.scoreBadge}>
                <Text style={AnimeDetailsStyles.scoreText}>
                  ⭐ {formattedScore}
                </Text>
              </View>
            )}
          </View>

          {/* Descripción corta */}
          {animeDetails.description && (
            <Text style={AnimeDetailsStyles.description} numberOfLines={3}>
              {truncateText(animeDetails.description, 150)}
            </Text>
          )}

          {/* Botón Expandir */}
          <TouchableOpacity
            style={AnimeDetailsStyles.expandButton}
            onPress={onToggleExpanded}
          >
            <Text style={AnimeDetailsStyles.expandButtonText}>
              {isExpanded ? "Ver menos" : "Ver más"}
            </Text>
            <Text style={AnimeDetailsStyles.expandArrow}>
              {isExpanded ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sección Expandible */}
      {isExpanded && (
        <Animated.View style={AnimeDetailsStyles.expandableSection}>
          <View style={AnimeDetailsStyles.fullDetails}>
            {/* Descripción Completa */}
            {animeDetails.description && (
              <View style={AnimeDetailsStyles.descriptionContainer}>
                <Text style={AnimeDetailsStyles.sectionTitle}>Sinopsis</Text>
                <Text style={AnimeDetailsStyles.fullDescription}>
                  {animeDetails.description}
                </Text>
              </View>
            )}

            {/* Géneros */}
            {genres.length > 0 && (
              <View style={AnimeDetailsStyles.genresContainer}>
                <Text style={AnimeDetailsStyles.sectionTitle}>Géneros</Text>
                <View style={AnimeDetailsStyles.genresRow}>
                  {genres.map((genre, index) => (
                    <View key={index} style={AnimeDetailsStyles.genreTag}>
                      <Text style={AnimeDetailsStyles.genreText}>{genre}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Información Adicional */}
            <View style={AnimeDetailsStyles.additionalInfo}>
              <Text style={AnimeDetailsStyles.sectionTitle}>Información</Text>

              {animeDetails.type && (
                <View style={AnimeDetailsStyles.infoRow}>
                  <Text style={AnimeDetailsStyles.infoLabel}>Tipo:</Text>
                  <Text style={AnimeDetailsStyles.infoValue}>
                    {animeDetails.type}
                  </Text>
                </View>
              )}

              {animeDetails.studio && (
                <View style={AnimeDetailsStyles.infoRow}>
                  <Text style={AnimeDetailsStyles.infoLabel}>Estudio:</Text>
                  <Text style={AnimeDetailsStyles.infoValue}>
                    {animeDetails.studio}
                  </Text>
                </View>
              )}

              {animeDetails.source && (
                <View style={AnimeDetailsStyles.infoRow}>
                  <Text style={AnimeDetailsStyles.infoLabel}>Fuente:</Text>
                  <Text style={AnimeDetailsStyles.infoValue}>
                    {animeDetails.source}
                  </Text>
                </View>
              )}
            </View>

            {/* Estadísticas */}
            {stats.length > 0 && (
              <View style={AnimeDetailsStyles.statsContainer}>
                <Text style={AnimeDetailsStyles.sectionTitle}>
                  Estadísticas
                </Text>
                <View style={AnimeDetailsStyles.statsGrid}>
                  {stats.map((stat, index) => (
                    <View key={index} style={AnimeDetailsStyles.statItem}>
                      <Text style={AnimeDetailsStyles.statNumber}>
                        {stat.value}
                      </Text>
                      <Text style={AnimeDetailsStyles.statLabel}>
                        {stat.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

/**
 * Componente Skeleton para el header mientras carga
 */
const AnimeDetailsHeaderSkeleton = () => (
  <View style={AnimeDetailsStyles.headerSection}>
    {/* Skeleton Thumbnail */}
    <View style={AnimeDetailsStyles.thumbnailContainer}>
      <View style={AnimeDetailsStyles.skeletonThumbnail} />
    </View>

    {/* Skeleton Información Básica */}
    <View style={AnimeDetailsStyles.basicInfo}>
      {/* Skeleton Título */}
      <View style={[AnimeDetailsStyles.skeletonTitle, { width: "90%" }]} />
      <View
        style={[
          AnimeDetailsStyles.skeletonTitle,
          { width: "70%", marginBottom: 12 },
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

      {/* Skeleton Botón */}
      <View style={AnimeDetailsStyles.skeletonButton} />
    </View>
  </View>
);

export default AnimeDetailsHeader;
