import React from "react";
import { Animated, Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles";
import {
  getStatusColor,
  getStatusText,
  sanitizeDescription,
} from "../hooks/useAnimeDetailsEpisodes";
import { SkeletonHeader } from "./SkeletonSections";

const DetailsSection = ({
  loadingDetails,
  details,
  animeName,
  showFullDetails,
  animation,
  onToggleFullDetails,
  truncateText,
}) => {
  if (loadingDetails) {
    return <SkeletonHeader />;
  }

  return (
    <>
      <View style={styles.headerSection}>
        {details?.thumbnail && (
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: details.thumbnail }}
              style={styles.thumbnail}
            />
          </View>
        )}

        <View style={styles.basicInfo}>
          <Text style={styles.title}>{details?.name || animeName}</Text>

          {details && (
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(details.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {getStatusText(details.status)}
                </Text>
              </View>

              {details.score && (
                <View style={styles.scoreBadge}>
                  <Ionicons name="star" size={12} color="#ffc107" />
                  <Text style={styles.scoreText}> {details.score}/10</Text>
                </View>
              )}
            </View>
          )}

          {details?.description && (
            <Text style={styles.description}>
              {truncateText(details.description)}
            </Text>
          )}

          <TouchableOpacity
            style={styles.expandButton}
            onPress={onToggleFullDetails}
          >
            <Text style={styles.expandButtonText}>
              {showFullDetails ? "Ver menos" : "Ver mas"}
            </Text>
            <Ionicons
              name={showFullDetails ? "chevron-up" : "chevron-down"}
              size={14}
              color="#007bff"
            />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View
        style={[
          styles.expandableSection,
          {
            maxHeight: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000],
            }),
            opacity: animation,
          },
        ]}
      >
        {details && (
          <View style={styles.fullDetails}>
            {details.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.sectionTitle}>Sinopsis Completa</Text>
                <Text style={styles.fullDescription}>
                  {sanitizeDescription(details.description)}
                </Text>
              </View>
            )}

            {details.genres?.length > 0 && (
              <View style={styles.genresContainer}>
                <Text style={styles.sectionTitle}>Generos</Text>
                <View style={styles.genresRow}>
                  {details.genres.map((genre, index) => (
                    <View key={index} style={styles.genreTag}>
                      <Text style={styles.genreText}>{genre}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.additionalInfo}>
              <Text style={styles.sectionTitle}>Informacion</Text>

              {details.type && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tipo:</Text>
                  <Text style={styles.infoValue}>{details.type}</Text>
                </View>
              )}

              {details.season && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Temporada:</Text>
                  <Text style={styles.infoValue}>
                    {details.season.formatted}
                  </Text>
                </View>
              )}

              {details.studios?.length > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Estudio:</Text>
                  <Text style={styles.infoValue}>
                    {details.studios.join(", ")}
                  </Text>
                </View>
              )}

              {details.episodeDuration && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Duracion:</Text>
                  <Text style={styles.infoValue}>
                    {details.episodeDuration.formatted}
                  </Text>
                </View>
              )}
            </View>

            {details.stats && details.stats.views > 0 && (
              <View style={styles.statsContainer}>
                <Text style={styles.sectionTitle}>Estadisticas</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {details.stats.views.toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>Vistas</Text>
                  </View>
                  {details.stats.userScoreCount > 0 && (
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {details.stats.userScoreAverage.toFixed(1)}
                      </Text>
                      <Text style={styles.statLabel}>
                        Puntuacion ({details.stats.userScoreCount} usuarios)
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </>
  );
};

export default DetailsSection;
