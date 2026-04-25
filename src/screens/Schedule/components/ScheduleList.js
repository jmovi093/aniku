// screens/Schedule/components/ScheduleList.js
// Componente de lista de animes programados

import React from "react";
import { FlatList, View, Text, RefreshControl } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Loading } from "../../../components/ui";
import AnimeCard from "../../../components/AnimeCard";
import { scheduleStyles as styles } from "../styles/ScheduleStyles";

const ScheduleList = ({
  animes,
  loading,
  refreshing,
  error,
  onRefresh,
  onAnimePress,
  selectedDay,
}) => {
  // 📋 Renderizar item de anime
  const renderAnimeItem = ({ item }) => (
    <View style={styles.animeItem}>
      <AnimeCard
        anime={item}
        onPress={() => onAnimePress(item)}
        showScheduleInfo={true}
        compact={true}
      />
      {item.airingTime && (
        <View style={styles.timeInfo}>
          <MaterialIcons name="schedule" size={16} color="#007bff" />
          <Text style={styles.airingTime}>{item.airingTime}</Text>
        </View>
      )}
    </View>
  );

  // 📭 Renderizar estado vacío
  const renderEmptyState = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons
            name="error-outline"
            size={64}
            color="#ff4444"
            style={styles.errorIcon}
          />
          <Text style={styles.errorTitle}>Error al cargar</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons
          name="event-busy"
          size={64}
          color="#666"
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyTitle}>No hay animes programados</Text>

      </View>
    );
  };

  // 🔄 Mostrar loading inicial
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Loading text={`Cargando horarios de ${selectedDay}...`} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={animes}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      renderItem={renderAnimeItem}
      numColumns={2}
      contentContainerStyle={[
        styles.listContent,
        animes.length === 0 && { flex: 1 },
      ]}
      columnWrapperStyle={styles.gridRow}
      ListEmptyComponent={renderEmptyState}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#007bff"]}
          tintColor="#007bff"
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
};

export default ScheduleList;
