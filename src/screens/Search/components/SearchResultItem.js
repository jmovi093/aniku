// screens/Search/components/SearchResultItem.js
// Item individual de resultado de búsqueda

import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Card } from "../../../components/ui";
import { colors, typography, spacing, shadows } from "../../../styles";

const SearchResultItem = ({ anime, onPress }) => {
  const handlePress = () => {
    onPress?.(anime);
  };

  return (
    <Card
      onPress={handlePress}
      style={styles.container}
      variant="default"
      padding="none"
      shadowLevel="small"
      borderRadius="none"
    >
      <View style={styles.content}>
        {/* 🖼️ Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {anime.thumbnail ? (
            <Image
              source={{ uri: anime.thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnail, styles.placeholderImage]}>
              <MaterialIcons
                name="movie"
                size={32}
                color={colors.text.quaternary}
              />
            </View>
          )}
        </View>

        {/* 📝 Información del anime */}
        <View style={styles.animeInfo}>
          <Text style={styles.animeName} numberOfLines={2}>
            {anime.name}
          </Text>

          <View style={styles.metaInfo}>
            <Text style={styles.episodeCount}>
              {anime.episodes} {anime.episodes === 1 ? "episodio" : "episodios"}
            </Text>

            {anime.type && <Text style={styles.animeMeta}>• {anime.type}</Text>}

            {anime.year && <Text style={styles.animeMeta}>• {anime.year}</Text>}
          </View>

          {anime.score && (
            <View style={styles.scoreContainer}>
              <MaterialIcons
                name="star"
                size={14}
                color={colors.text.primary}
              />
              <Text style={styles.animeScore}>{anime.score.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[3],
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[500],
    height: 100,
  },

  content: {
    flexDirection: "row",
    alignItems: "stretch",
    height: "100%",
  },

  // 🖼️ Thumbnail
  thumbnailContainer: {
    marginRight: spacing[3],
    width: 80,
    height: "100%",
  },

  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
    backgroundColor: colors.background.tertiary,
  },

  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
  },

  // 📝 Información
  animeInfo: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing[2],
    paddingRight: spacing[3],
  },

  animeName: {
    color: colors.text.primary,
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing[2],
    lineHeight: 20,
    fontFamily: typography.fontFamilies.sans,
  },

  metaInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing[1],
    flexWrap: "wrap",
  },

  episodeCount: {
    color: colors.primary[500],
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    fontFamily: typography.fontFamilies.sans,
  },

  animeMeta: {
    color: colors.text.primary,
    fontSize: typography.fontSizes.xs,
    marginLeft: spacing[1],
    fontFamily: typography.fontFamilies.sans,
  },

  // ⭐ Score
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing[1],
  },

  animeScore: {
    color: colors.text.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    marginLeft: spacing[1],
    fontFamily: typography.fontFamilies.sans,
  },
});

export default SearchResultItem;
