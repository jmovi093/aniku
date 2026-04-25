// screens/Watching/components/ListCard.js
// Card para mostrar una lista personalizada de anime

import React from "react";
import { View, Text, Image, TouchableOpacity, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { watchingStyles as styles } from "../styles/WatchingStyles";

const ListCard = ({ list, onPress, onDelete }) => {
  const handleDelete = () => {
    Alert.alert(
      "Eliminar lista",
      `¿Eliminar "${list.name}"? Se perderán todos los animes de esta lista.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => onDelete(list.id),
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      style={styles.listCard}
      onPress={() => onPress(list)}
      activeOpacity={0.8}
    >
      {/* 🖼️ Thumbnail */}
      <View style={styles.listCardThumbnail}>
        {list.thumbnail ? (
          <Image
            source={{ uri: list.thumbnail }}
            style={styles.listCardThumbnailImage}
          />
        ) : (
          <View style={styles.listCardPlaceholder}>
            <MaterialIcons name="playlist-play" size={32} color="#666" />
          </View>
        )}
      </View>

      {/* 📝 Contenido */}
      <View style={styles.listCardContent}>
        <View style={styles.listCardHeader}>
          <Text style={styles.listCardName} numberOfLines={2}>
            {list.name}
          </Text>
          <TouchableOpacity
            style={styles.listCardDeleteBtn}
            onPress={handleDelete}
          >
            <MaterialIcons name="close" size={20} color="#ff4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.listCardActions}>
          <Text style={styles.listCardCount}>
            {list.animeCount === 1 ? "1 anime" : `${list.animeCount} animes`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ListCard;
