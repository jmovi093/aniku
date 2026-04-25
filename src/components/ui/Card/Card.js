// components/ui/Card/Card.js
// Componente Card base reutilizable

import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { colors, spacing, shadows } from "../../../styles";

const Card = ({
  children,
  onPress,
  variant = "default",
  padding = "medium",
  margin = "none",
  style,
  shadowLevel = "medium",
  borderRadius = "medium",
  ...props
}) => {
  const Component = onPress ? TouchableOpacity : View;

  const cardStyles = [
    styles.base,
    styles[variant],
    styles[`padding_${padding}`],
    styles[`margin_${margin}`],
    styles[`shadow_${shadowLevel}`],
    styles[`radius_${borderRadius}`],
    style,
  ];

  return (
    <Component
      style={cardStyles}
      onPress={onPress}
      activeOpacity={onPress ? 0.9 : 1}
      {...props}
    >
      {children}
    </Component>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.background.secondary,
    overflow: "hidden",
  },

  // 🎨 Variantes
  default: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },

  elevated: {
    backgroundColor: colors.background.secondary,
  },

  outlined: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border.default,
  },

  transparent: {
    backgroundColor: "transparent",
  },

  anime: {
    backgroundColor: colors.anime.card,
    borderWidth: 1,
    borderColor: colors.anime.accent,
  },

  // 📏 Padding
  padding_none: {
    padding: 0,
  },

  padding_small: {
    padding: spacing[2],
  },

  padding_medium: {
    padding: spacing[4],
  },

  padding_large: {
    padding: spacing[6],
  },

  // 📐 Margin
  margin_none: {
    margin: 0,
  },

  margin_small: {
    margin: spacing[2],
  },

  margin_medium: {
    margin: spacing[4],
  },

  margin_large: {
    margin: spacing[6],
  },

  // 🌊 Sombras
  shadow_none: {
    ...shadows.none,
  },

  shadow_small: {
    ...shadows.components.card_small,
  },

  shadow_medium: {
    ...shadows.components.card,
  },

  shadow_large: {
    ...shadows.components.modal,
  },

  // 🔘 Border Radius
  radius_none: {
    borderRadius: 0,
  },

  radius_small: {
    borderRadius: 4,
  },

  radius_medium: {
    borderRadius: 8,
  },

  radius_large: {
    borderRadius: 16,
  },

  radius_full: {
    borderRadius: 9999,
  },
});

export default Card;
