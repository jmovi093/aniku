// screens/Watching/ListDetailScreen.js
// Pantalla que muestra los animes de una lista personalizada

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Loading } from "../../components/ui";
import { watchingStyles as styles } from "./styles/WatchingStyles";
import ListsService from "../../services/ListsService";

const ListDetailScreen = ({ route, navigation }) => {
  const { listId, listName } = route.params;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const data = await ListsService.getListItems(listId);
    setItems(data);
    setLoading(false);
  }, [listId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    navigation.setOptions({ title: listName, headerShown: true });
  }, [listName, navigation]);

  const handleRemove = (animeId, animeName) => {
    Alert.alert("Quitar de la lista", `¿Quitar "${animeName}" de esta lista?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar",
        style: "destructive",
        onPress: async () => {
          await ListsService.removeAnimeFromList(listId, animeId);
          await loadItems();
        },
      },
    ]);
  };

  const handleViewDetails = (item) => {
    navigation.navigate("Episodes", {
      animeId: item.animeId,
      animeTitle: item.animeName,
    });
  };

  const renderItem = ({ item }) => (
    <View style={styles.listAnimeCard}>
      {/* Thumbnail */}
      {item.thumbnail ? (
        <Image
          source={{ uri: item.thumbnail }}
          style={styles.listAnimeThumbnail}
        />
      ) : (
        <View style={styles.listAnimePlaceholder}>
          <MaterialIcons name="movie" size={24} color="#666" />
        </View>
      )}

      {/* Contenido */}
      <View style={styles.listAnimeContent}>
        <View style={styles.listAnimeHeader}>
          <Text style={styles.listAnimeName} numberOfLines={2}>
            {item.animeName}
          </Text>
          <TouchableOpacity
            style={styles.listCardDeleteBtn}
            onPress={() => handleRemove(item.animeId, item.animeName)}
          >
            <MaterialIcons name="close" size={18} color="#ff4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.listAnimeActions}>
          <TouchableOpacity
            style={[styles.listAnimeBtn, styles.listAnimeBtnPrimary]}
            onPress={() => handleViewDetails(item)}
          >
            <MaterialIcons name="list" size={14} color="#fff" />
            <Text
              style={[styles.listAnimeBtnText, styles.listAnimeBtnTextPrimary]}
            >
              Ver episodios
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons
        name="playlist-add"
        size={64}
        color="#666"
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyTitle}>Lista vacía</Text>

    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading text="Cargando lista..." size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.animeId}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContainer,
          items.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default ListDetailScreen;
