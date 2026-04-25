// components/ui/Button/Button.js
// Componente Button base reutilizable

import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { colors, typography, spacing, shadows } from "../../../styles";

const Button = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  ...props
}) => {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    loading && styles.loading,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    disabled && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "outline" ? colors.primary[500] : colors.text.primary
          }
        />
      ) : (
        <>
          {icon && icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    flexDirection: "row",
    ...shadows.components.button,
  },

  // 🎨 Variantes
  primary: {
    backgroundColor: colors.primary[500],
  },

  secondary: {
    backgroundColor: colors.background.secondary,
  },

  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary[500],
  },

  ghost: {
    backgroundColor: "transparent",
  },

  success: {
    backgroundColor: colors.status.success,
  },

  warning: {
    backgroundColor: colors.status.warning,
  },

  error: {
    backgroundColor: colors.status.error,
  },

  // 📏 Tamaños
  small: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 32,
  },

  medium: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 40,
  },

  large: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    minHeight: 48,
  },

  // 🎯 Estados
  disabled: {
    opacity: 0.5,
    ...shadows.none,
  },

  loading: {
    opacity: 0.8,
  },

  // 📝 Texto
  text: {
    fontWeight: typography.fontWeights.semibold,
    textAlign: "center",
  },

  text_primary: {
    color: colors.text.primary,
  },

  text_secondary: {
    color: colors.text.primary,
  },

  text_outline: {
    color: colors.primary[500],
  },

  text_ghost: {
    color: colors.primary[500],
  },

  text_success: {
    color: colors.text.primary,
  },

  text_warning: {
    color: colors.text.primary,
  },

  text_error: {
    color: colors.text.primary,
  },

  text_small: {
    fontSize: typography.fontSizes.sm,
  },

  text_medium: {
    fontSize: typography.fontSizes.base,
  },

  text_large: {
    fontSize: typography.fontSizes.lg,
  },

  textDisabled: {
    opacity: 0.7,
  },
});

export default Button;
