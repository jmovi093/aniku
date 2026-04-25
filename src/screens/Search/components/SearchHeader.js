// screens/Search/components/SearchHeader.js
// Header de la pantalla de búsqueda

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, typography, spacing } from "../../../styles";

const SearchHeader = ({
  title = "Buscar Anime",
  subtitle = "Encuentra tu próximo anime favorito",
  style,
  titleStyle,
  subtitleStyle,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, titleStyle]}>{title}</Text>
      <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.layout.horizontal,
    paddingBottom: spacing[5],
    alignItems: "center",
  },

  title: {
    fontSize: typography.fontSizes["2xl"],
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
    marginBottom: spacing[1],
    fontFamily: typography.fontFamilies.display,
  },

  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    opacity: 0.8,
    fontFamily: typography.fontFamilies.sans,
  },
});

export default SearchHeader;
