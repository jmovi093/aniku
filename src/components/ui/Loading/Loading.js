// components/ui/Loading/Loading.js
// Componente Loading base reutilizable

import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { colors, typography, spacing } from "../../../styles";

const Loading = ({
  size = "medium",
  color = colors.primary[500],
  text,
  variant = "default",
  style,
  textStyle,
  ...props
}) => {
  return (
    <View style={[styles.container, styles[variant], style]} {...props}>
      <ActivityIndicator size={getActivityIndicatorSize(size)} color={color} />
      {text && (
        <Text style={[styles.text, styles[`text_${variant}`], textStyle]}>
          {text}
        </Text>
      )}
    </View>
  );
};

// 🎯 Helper function para mapear tamaños
const getActivityIndicatorSize = (size) => {
  const sizeMap = {
    small: "small",
    medium: "large",
    large: "large",
  };
  return sizeMap[size] || "large";
};

// 🎨 Componentes especializados
export const LoadingOverlay = ({ visible, children, ...props }) => {
  if (!visible) return children;

  return (
    <View style={styles.overlay}>
      {children}
      <View style={styles.overlayContent}>
        <Loading variant="overlay" {...props} />
      </View>
    </View>
  );
};

export const LoadingButton = ({ loading, children, ...props }) => {
  return (
    <View style={styles.buttonContainer}>
      {loading && (
        <View style={styles.buttonLoading}>
          <Loading size="small" color={colors.text.primary} />
        </View>
      )}
      <View
        style={[styles.buttonContent, loading && styles.buttonContentLoading]}
      >
        {children}
      </View>
    </View>
  );
};

export const LoadingScreen = ({ text = "Cargando...", ...props }) => {
  return (
    <View style={styles.screen}>
      <Loading variant="screen" text={text} size="large" {...props} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },

  // 🎨 Variantes
  default: {
    padding: spacing[4],
  },

  overlay: {
    backgroundColor: colors.background.overlay,
    padding: spacing[6],
    borderRadius: 12,
  },

  screen: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  inline: {
    flexDirection: "row",
    padding: spacing[2],
  },

  // 📝 Texto
  text: {
    marginTop: spacing[3],
    textAlign: "center",
    fontSize: typography.fontSizes.base,
  },

  text_default: {
    color: colors.text.secondary,
  },

  text_overlay: {
    color: colors.text.primary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.medium,
  },

  text_screen: {
    color: colors.text.secondary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.medium,
  },

  text_inline: {
    color: colors.text.secondary,
    marginTop: 0,
    marginLeft: spacing[2],
  },

  // 🌊 Overlay específico
  overlay: {
    position: "relative",
  },

  overlayContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background.overlay,
    alignItems: "center",
    justifyContent: "center",
  },

  // 🔘 Button Loading específico
  buttonContainer: {
    position: "relative",
  },

  buttonLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },

  buttonContent: {
    opacity: 1,
  },

  buttonContentLoading: {
    opacity: 0.3,
  },

  // 📱 Screen específico
  screen: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Loading;
