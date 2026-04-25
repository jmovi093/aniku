// screens/Schedule/ScheduleScreen.js
// Pantalla de horarios de anime - Refactorizada

import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DaySelector, ScheduleList } from "./components";
import { useScheduleData } from "./hooks";
import { scheduleStyles as styles } from "./styles/ScheduleStyles";

const ScheduleScreen = ({ navigation }) => {
  // 📅 Hook para datos de horarios
  const {
    availableDays,
    selectedDay,
    animes,
    loading,
    refreshing,
    error,
    changeSelectedDay,
    onRefresh,
  } = useScheduleData();

  // 📱 Navegar a detalles del anime
  const handleAnimePress = (anime) => {
    navigation.navigate("Episodes", {
      animeId: anime.id,
      animeName: anime.name,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 📅 Selector de Días */}
      <DaySelector
        availableDays={availableDays}
        selectedDay={selectedDay}
        onDayChange={changeSelectedDay}
      />

      {/* 📋 Lista de Animes del Día */}
      <ScheduleList
        animes={animes}
        loading={loading}
        refreshing={refreshing}
        error={error}
        onRefresh={onRefresh}
        onAnimePress={handleAnimePress}
        selectedDay={selectedDay}
      />
    </SafeAreaView>
  );
};

export default ScheduleScreen;
