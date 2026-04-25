// screens/Search/components/SearchInput.js
// Input de búsqueda con botón

import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Input } from "../../../components/ui";
import { colors, spacing } from "../../../styles";

const SearchInput = ({
  value,
  onChangeText,
  onSearch,
  onClear,
  loading = false,
  placeholder = "Buscar anime...",
  style,
}) => {
  const hasText = value && value.length > 0;

  const rightButton = loading ? (
    <View style={styles.clearButton}>
      <MaterialIcons name="refresh" size={20} color={colors.text.secondary} />
    </View>
  ) : hasText ? (
    <TouchableOpacity
      onPress={onClear}
      style={styles.clearButton}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <MaterialIcons name="close" size={20} color={colors.text.secondary} />
    </TouchableOpacity>
  ) : null;

  return (
    <View style={[styles.container, style]}>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        onSubmitEditing={onSearch}
        returnKeyType="search"
        inputStyle={styles.inputText}
        containerStyle={styles.inputContainer}
        rightIcon={rightButton}
        onRightIconPress={hasText ? onClear : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},

  inputText: {
    fontSize: 22,
    textAlignVertical: "center",
  },

  inputContainer: {
    height: 80,
    justifyContent: "center",
    borderRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    paddingHorizontal: spacing[3],
  },

  clearButton: {
    padding: spacing[2],
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SearchInput;
