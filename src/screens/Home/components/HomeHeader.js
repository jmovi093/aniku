// screens/Home/components/HomeHeader.js
// Header del Home con título y navegación

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, typography, spacing } from "../../../styles";

const HomeHeader = ({
  title = "ANIKU",
  style,
  titleStyle,
  subtitleStyle,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, titleStyle]}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.layout.headerTop,
    paddingHorizontal: spacing.layout.horizontal,
    paddingBottom: spacing[5],
    alignItems: "center",
  },

  title: {
    fontSize: typography.fontSizes["4xl"],
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

export default HomeHeader;
