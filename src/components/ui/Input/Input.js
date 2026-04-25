// components/ui/Input/Input.js
// Componente Input base reutilizable

import React, { useState, forwardRef } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { colors, typography, spacing, shadows } from "../../../styles";

const Input = forwardRef(
  (
    {
      label,
      placeholder,
      value,
      onChangeText,
      error,
      helperText,
      variant = "default",
      size = "medium",
      disabled = false,
      multiline = false,
      secureTextEntry = false,
      leftIcon,
      rightIcon,
      onRightIconPress,
      style,
      inputStyle,
      containerStyle,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const containerStyles = [
      styles.container,
      styles[variant],
      styles[size],
      isFocused && styles.focused,
      error && styles.error,
      disabled && styles.disabled,
      containerStyle,
    ];

    const inputStyles = [
      styles.input,
      styles[`input_${size}`],
      multiline && styles.multiline,
      leftIcon && styles.inputWithLeftIcon,
      rightIcon && styles.inputWithRightIcon,
      inputStyle,
    ];

    return (
      <View style={[styles.wrapper, style]}>
        {label && (
          <Text style={[styles.label, error && styles.labelError]}>
            {label}
          </Text>
        )}

        <View style={containerStyles}>
          {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

          <TextInput
            ref={ref}
            style={inputStyles}
            placeholder={placeholder}
            placeholderTextColor={colors.text.placeholder}
            value={value}
            onChangeText={onChangeText}
            editable={!disabled}
            multiline={multiline}
            secureTextEntry={secureTextEntry}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />

          {rightIcon && (
            <TouchableOpacity
              style={styles.rightIconContainer}
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
            >
              {rightIcon}
            </TouchableOpacity>
          )}
        </View>

        {(error || helperText) && (
          <Text style={[styles.helperText, error && styles.errorText]}>
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: spacing[2],
  },

  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.background.secondary,
    ...shadows.components.input,
  },

  // 🎨 Variantes
  default: {
    borderColor: colors.border.default,
  },

  outline: {
    backgroundColor: "transparent",
    borderColor: colors.border.default,
  },

  filled: {
    backgroundColor: colors.background.tertiary,
    borderColor: "transparent",
  },

  underline: {
    backgroundColor: "transparent",
    borderWidth: 0,
    borderBottomWidth: 1,
    borderRadius: 0,
    borderColor: colors.border.default,
  },

  // 📏 Tamaños
  small: {
    minHeight: 36,
    paddingHorizontal: spacing[3],
  },

  medium: {
    minHeight: 44,
    paddingHorizontal: spacing[4],
  },

  large: {
    minHeight: 52,
    paddingHorizontal: spacing[5],
  },

  // 🎯 Estados
  focused: {
    borderColor: colors.primary[500],
    ...shadows.components.input_focused,
  },

  error: {
    borderColor: colors.status.error,
  },

  disabled: {
    opacity: 0.6,
    backgroundColor: colors.background.disabled,
  },

  // 📝 Input
  input: {
    flex: 1,
    fontSize: typography.fontSizes.base,
    color: colors.text.primary,
    fontFamily: typography.fontFamilies.sans,
  },

  input_small: {
    fontSize: typography.fontSizes.sm,
  },

  input_medium: {
    fontSize: typography.fontSizes.base,
  },

  input_large: {
    fontSize: typography.fontSizes.lg,
  },

  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingVertical: spacing[3],
  },

  inputWithLeftIcon: {
    marginLeft: spacing[1],
  },

  inputWithRightIcon: {
    marginRight: spacing[1],
  },

  // 🔲 Iconos
  leftIconContainer: {
    marginRight: spacing[2],
    alignItems: "center",
    justifyContent: "center",
  },

  rightIconContainer: {
    marginLeft: spacing[2],
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[1],
  },

  // 📝 Labels y textos
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },

  labelError: {
    color: colors.status.error,
  },

  helperText: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.tertiary,
    marginTop: spacing[1],
  },

  errorText: {
    color: colors.status.error,
  },
});

Input.displayName = "Input";

export default Input;
