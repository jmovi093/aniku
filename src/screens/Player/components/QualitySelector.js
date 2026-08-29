// screens/Player/components/QualitySelector.js
// Selector de calidad del episodio en curso.
//
// NOTA: la versión anterior de este archivo era código muerto — nadie lo
// renderizaba y usaba estilos (`styles.qualityButton`, `styles.qualitiesList`…)
// que NO existen en PlayerStyles.js, así que habría salido sin formato. Se
// reescribió autocontenido y se conectó desde PlayerScreen.

import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

/**
 * @param {Array}    currentVideoLinks  enlaces disponibles (ordenados de mayor a menor)
 * @param {number}   selectedQuality    índice activo
 * @param {Function} onSelectQuality    (index) => void
 */
const QualitySelector = ({
  currentVideoLinks = [],
  selectedQuality = 0,
  onSelectQuality,
}) => {
  // Con una sola fuente no hay nada que elegir.
  if (!currentVideoLinks || currentVideoLinks.length < 2) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="hd" size={18} color="#9aa0a6" />
        <Text style={styles.title}>Calidad</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {currentVideoLinks.map((link, index) => {
          const isSelected = selectedQuality === index;
          return (
            <TouchableOpacity
              key={`${link?.url || index}-${index}`}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelectQuality?.(index)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {link?.quality || "Auto"}
              </Text>
              {isSelected && (
                <MaterialIcons name="check" size={14} color="#ffffff" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  title: {
    color: "#9aa0a6",
    fontSize: 13,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#1e1e1e",
    borderWidth: 1,
    borderColor: "#2e2e2e",
  },
  chipSelected: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  chipText: {
    color: "#d0d0d0",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#ffffff",
  },
});

export default QualitySelector;
