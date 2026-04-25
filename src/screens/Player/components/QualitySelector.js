// screens/Player/components/QualitySelector.js
// Componente para seleccionar calidad y fuentes

import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { playerStyles as styles } from "../styles/PlayerStyles";

const QualitySelector = ({
  currentVideoLinks,
  selectedQuality,
  handlePlayVideo,
  handleNextEpisode,
  currentEpisodeNumber,
}) => {
  const renderQualityOption = (link, index) => {
    const isSelected = selectedQuality === index;

    return (
      <TouchableOpacity
        key={index}
        style={[styles.qualityButton, isSelected && styles.selectedQuality]}
        onPress={() => handlePlayVideo(link, index)}
      >
        <View style={styles.qualityInfo}>
          <Text style={styles.qualityText}>
            {link.quality || "Auto"} ({link.type || "MP4"})
          </Text>
          <Text style={styles.typeText}>
            {link.source || "Fuente desconocida"}
          </Text>
          {link.provider && (
            <Text style={styles.providerText}>Provider: {link.provider}</Text>
          )}
        </View>
        {isSelected && (
          <MaterialIcons name="check-circle" size={24} color="#007bff" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.qualitiesContainer}>
      <Text style={styles.qualityTitle}>
        Fuentes disponibles ({currentVideoLinks.length}):
      </Text>

      <ScrollView style={styles.qualitiesList}>
        {currentVideoLinks.map((link, index) =>
          renderQualityOption(link, index)
        )}
      </ScrollView>

      {/* Botón de próximo episodio */}
      <TouchableOpacity
        style={styles.nextEpisodeButton}
        onPress={handleNextEpisode}
      >
        <MaterialIcons name="skip-next" size={20} color="#ffffff" />
        <Text style={styles.nextEpisodeText}>
          Próximo episodio - Episodio {parseInt(currentEpisodeNumber) + 1}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default QualitySelector;
