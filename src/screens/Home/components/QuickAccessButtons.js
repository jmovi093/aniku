// screens/Home/components/QuickAccessButtons.js
// Botones de acceso rápido del Home

import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, typography, spacing, shadows } from "../../../styles";

const QuickAccessButtons = ({
  onWatchingPress,
  onAdvancedSearchPress,
  style,
}) => {
  const buttons = [
    {
      id: "watching",
      icon: "tv",
      title: "Continuar Viendo",
      onPress: onWatchingPress,
      color: colors.primary[500],
    },
    {
      id: "advanced-search",
      icon: "tune",
      title: "Búsqueda Avanzada",
      onPress: onAdvancedSearchPress,
      color: colors.primary[500],
    },
  ];

  return (
    <View style={[styles.container, style]}>
      {buttons.map((button) => (
        <TouchableOpacity
          key={button.id}
          style={[styles.button, { borderLeftColor: button.color }]}
          onPress={button.onPress}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name={button.icon}
            size={16}
            color={colors.text.primary}
          />
          <Text style={styles.buttonText}>{button.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.layout.horizontal,
    marginBottom: spacing[6],
    gap: spacing[4],
  },

  button: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
    borderRadius: spacing.borderRadius.medium,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderLeftWidth: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    ...shadows.components.button,
  },

  buttonText: {
    color: colors.text.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    textAlign: "center",
    fontFamily: typography.fontFamilies.sans,
  },
});

export default QuickAccessButtons;
