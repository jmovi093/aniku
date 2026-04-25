// screens/Watching/components/AddToListModal.js
// Modal para añadir/quitar un anime de listas personalizadas

import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { watchingStyles as styles } from "../styles/WatchingStyles";
import ListsService from "../../../services/ListsService";

const AddToListModal = ({ visible, onClose, anime }) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInput, setShowInput] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [toggling, setToggling] = useState(null);

  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
      if (anime) loadLists();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const loadLists = async ({ withLoading = true } = {}) => {
    if (withLoading) setLoading(true);
    try {
      const data = await ListsService.getListsForAnime(anime.animeId);
      setLists(data);
    } finally {
      if (withLoading) setLoading(false);
    }
  };

  const handleToggle = async (list) => {
    setToggling(list.id);

    const wasInList = list.inList;
    const previousCount = list.animeCount ?? 0;
    setLists((prev) =>
      prev.map((item) =>
        item.id !== list.id
          ? item
          : {
              ...item,
              inList: !wasInList,
              animeCount: Math.max(0, previousCount + (wasInList ? -1 : 1)),
            },
      ),
    );

    try {
      if (wasInList) {
        await ListsService.removeAnimeFromList(list.id, anime.animeId);
      } else {
        await ListsService.addAnimeToList(list.id, anime);
      }
      await loadLists({ withLoading: false });
    } catch (error) {
      setLists((prev) =>
        prev.map((item) =>
          item.id !== list.id
            ? item
            : {
                ...item,
                inList: wasInList,
                animeCount: previousCount,
              },
        ),
      );
    } finally {
      setToggling(null);
    }
  };

  const handleCreate = async () => {
    if (!newListName.trim()) return;
    const newList = await ListsService.createList(newListName);
    await ListsService.addAnimeToList(newList.id, anime);
    setNewListName("");
    setShowInput(false);
    await loadLists({ withLoading: false });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.modalListItem}
      onPress={() => handleToggle(item)}
      activeOpacity={0.7}
    >
      <View style={styles.modalListItemThumbnail}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.modalListItemThumbnailImg}
          />
        ) : (
          <MaterialIcons
            name="playlist-play"
            size={24}
            color="#666"
            style={{ alignSelf: "center", marginTop: 8 }}
          />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.modalListItemName}>{item.name}</Text>
        <Text style={styles.modalListItemCount}>
          {item.animeCount === 1 ? "1 anime" : `${item.animeCount ?? 0} animes`}
        </Text>
      </View>

      {toggling === item.id ? (
        <ActivityIndicator size="small" color="#007bff" />
      ) : (
        <MaterialIcons
          name={item.inList ? "check-circle" : "radio-button-unchecked"}
          size={24}
          color={item.inList ? "#007bff" : "#666"}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Fondo oscuro fijo con fade */}
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Panel que sube desde abajo */}
      <Animated.View
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Añadir a lista</Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#007bff"
            style={{ margin: 24 }}
          />
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={
              <Text
                style={[
                  styles.listCardCount,
                  { textAlign: "center", margin: 16 },
                ]}
              >
                No tienes listas todavía
              </Text>
            }
            ListFooterComponent={
              <View>
                {showInput ? (
                  <View style={styles.modalCreateInput}>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Nombre de la lista..."
                      placeholderTextColor="#666"
                      value={newListName}
                      onChangeText={setNewListName}
                      autoFocus
                      onSubmitEditing={handleCreate}
                    />
                    <TouchableOpacity
                      style={styles.modalInputConfirm}
                      onPress={handleCreate}
                    >
                      <Text style={styles.modalInputConfirmText}>OK</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.modalNewList}
                    onPress={() => setShowInput(true)}
                  >
                    <MaterialIcons
                      name="add-circle-outline"
                      size={24}
                      color="#007bff"
                    />
                    <Text style={styles.modalNewListText}>Nueva lista</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
      </Animated.View>
    </Modal>
  );
};

export default AddToListModal;
