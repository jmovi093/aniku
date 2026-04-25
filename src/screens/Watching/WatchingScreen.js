// screens/Watching/WatchingScreen.js
// Pantalla con sub-tabs: Viendo | Mis Listas

import React, { useState } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Loading } from "../../components/ui";
import { WatchingCard, ListCard } from "./components";
import { useWatchingData, useWatchingNavigation, useListsData } from "./hooks";
import { watchingStyles as styles } from "./styles/WatchingStyles";
import ListsService from "../../services/ListsService";

const WatchingScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("watching");
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState("");

  // Hooks
  const {
    watching,
    loading: loadingWatching,
    loadWatching,
  } = useWatchingData(navigation);
  const { continueWatching, removeFromWatching, viewAnimeEpisodes } =
    useWatchingNavigation(navigation);
  const {
    lists,
    loading: loadingLists,
    loadLists,
    deleteList,
  } = useListsData(navigation);

  // ▶️ Continuar viendo
  const handleContinueWatching = async (anime) => {
    await continueWatching(anime);
  };

  // 🗑️ Eliminar de viendo
  const handleRemove = async (animeId) => {
    await removeFromWatching(animeId, loadWatching);
  };

  // ➕ Crear nueva lista
  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    await ListsService.createList(newListName.trim());
    setNewListName("");
    setShowNewListInput(false);
    await loadLists();
  };

  // 📂 Abrir lista
  const handleOpenList = (list) => {
    navigation.navigate("ListDetail", { listId: list.id, listName: list.name });
  };

  // ─── Render items ─────────────────────────────────────
  const renderWatchingItem = ({ item }) => (
    <WatchingCard
      anime={item}
      onContinueWatching={handleContinueWatching}
      onRemove={handleRemove}
      onViewEpisodes={viewAnimeEpisodes}
    />
  );

  const renderListItem = ({ item }) => (
    <ListCard list={item} onPress={handleOpenList} onDelete={deleteList} />
  );

  // ─── Empty states ──────────────────────────────────────
  const renderWatchingEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons
        name="tv-off"
        size={64}
        color="#666"
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyTitle}>No tienes animes en progreso</Text>
    </View>
  );

  const renderListsEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons
        name="playlist-add"
        size={64}
        color="#666"
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyTitle}>Sin listas todavía</Text>
      <Text style={styles.emptySubtitle}>
        Crea listas para organizar tus animes favoritos.
      </Text>
    </View>
  );

  // ─── Header de listas: botón nueva lista ──────────────
  const renderListsHeader = () =>
    showNewListInput ? (
      <View style={styles.modalCreateInput}>
        <TextInput
          style={styles.modalInput}
          placeholder="Nombre de la lista..."
          placeholderTextColor="#666"
          value={newListName}
          onChangeText={setNewListName}
          autoFocus
          onSubmitEditing={handleCreateList}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={styles.modalInputConfirm}
          onPress={handleCreateList}
        >
          <Text style={styles.modalInputConfirmText}>OK</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <TouchableOpacity
        style={styles.newListButton}
        onPress={() => setShowNewListInput(true)}
      >
        <MaterialIcons name="add" size={22} color="#007bff" />
        <Text style={styles.newListButtonText}>Nueva lista</Text>
      </TouchableOpacity>
    );

  const isLoading =
    (activeTab === "watching" && loadingWatching) ||
    (activeTab === "lists" && loadingLists);

  return (
    <SafeAreaView style={styles.container}>
      {/* ─── Sub-tabs ─── */}
      <View style={styles.subTabsContainer}>
        <TouchableOpacity
          style={[
            styles.subTab,
            activeTab === "watching" && styles.subTabActive,
          ]}
          onPress={() => setActiveTab("watching")}
        >
          <Text
            style={[
              styles.subTabText,
              activeTab === "watching" && styles.subTabTextActive,
            ]}
          >
            Viendo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, activeTab === "lists" && styles.subTabActive]}
          onPress={() => setActiveTab("lists")}
        >
          <Text
            style={[
              styles.subTabText,
              activeTab === "lists" && styles.subTabTextActive,
            ]}
          >
            Mis Listas
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── Contenido ─── */}
      {isLoading ? (
        <Loading text="Cargando..." size="large" />
      ) : activeTab === "watching" ? (
        <FlatList
          data={watching}
          keyExtractor={(item) => item.animeId}
          renderItem={renderWatchingItem}
          contentContainerStyle={[
            styles.listContainer,
            watching.length === 0 && { flex: 1 },
          ]}
          ListEmptyComponent={renderWatchingEmpty}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {renderListsHeader()}
          <FlatList
            data={lists}
            keyExtractor={(item) => item.id}
            renderItem={renderListItem}
            contentContainerStyle={[
              styles.listContainer,
              lists.length === 0 && { flex: 1 },
            ]}
            ListEmptyComponent={lists.length === 0 ? renderListsEmpty : null}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

export default WatchingScreen;
