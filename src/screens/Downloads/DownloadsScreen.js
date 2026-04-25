// screens/Downloads/DownloadsScreen.js
// Pantalla de descargas - Refactorizada

import React from "react";
import { View, FlatList, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Loading } from "../../components/ui";
import { DownloadCard } from "./components";
import { useDownloadsData } from "./hooks";
import { downloadsStyles as styles } from "./styles/DownloadsStyles";

const DownloadsScreen = ({ navigation }) => {
  const { groupedDownloads, loading, loadDownloads } = useDownloadsData();

  // Recargar al volver a esta pestaña
  useFocusEffect(
    React.useCallback(() => {
      loadDownloads();
    }, []),
  );

  // Ver episodios en modo offline
  const handleViewAnime = (animeGroup) => {
    navigation.navigate("Episodes", {
      animeId: animeGroup.animeId,
      animeName: animeGroup.animeName,
      fromDownloads: true,
    });
  };

  const renderDownloadItem = ({ item }) => (
    <DownloadCard animeGroup={item} onViewAnime={handleViewAnime} />
  );

  // 📭 Renderizar estado vacío
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons
        name="download"
        size={64}
        color="#666"
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyTitle}>No tienes episodios descargados</Text>
    </View>
  );

  // 🔄 Mostrar loading
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading text="Cargando descargas..." size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={groupedDownloads}
        keyExtractor={(item) => item.animeId}
        renderItem={renderDownloadItem}
        contentContainerStyle={[
          styles.listContainer,
          groupedDownloads.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default DownloadsScreen;
