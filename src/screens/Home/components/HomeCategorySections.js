// screens/Home/components/HomeCategorySections.js
// Secciones de categorías del Home

import React from "react";
import { View, StyleSheet } from "react-native";
import CategoryRow from "../../../components/CategoryRow";
import { spacing } from "../../../styles";

const HomeCategorySections = ({
  // Data
  trendingDaily,
  trendingWeekly,
  thisSeason,
  actionAnime,
  romanceAnime,

  // Loading states
  loading,

  // Handlers
  onAnimePress,

  // Style
  style,
}) => {
  // 🎯 Configuración de secciones
  const sections = [
    {
      id: "trending-daily",
      title: "Trending Hoy",
      data: trendingDaily,
      loading: loading.daily,
      titleColor: "#ff6b6b",
      cardSize: "large",
      icon: "trending-up",
    },
    {
      id: "trending-weekly",
      title: "Popular Esta Semana",
      data: trendingWeekly,
      loading: loading.weekly,
      titleColor: "#4ecdc4",
      icon: "bar-chart",
    },
    {
      id: "this-season",
      title: "Esta Temporada",
      data: thisSeason,
      loading: loading.season,
      titleColor: "#45b7d1",
      icon: "calendar-today",
    },
    {
      id: "action",
      title: "Acción",
      data: actionAnime,
      loading: loading.action,
      titleColor: "#f39c12",
      icon: "flash-on",
    },
    {
      id: "romance",
      title: "Romance",
      data: romanceAnime,
      loading: loading.romance,
      titleColor: "#e74c3c",
      icon: "favorite",
    },
  ];

  return (
    <View style={[styles.container, style]}>
      {sections.map((section) => (
        <CategoryRow
          key={section.id}
          categoryId={section.id}
          title={section.title}
          data={section.data}
          onAnimePress={onAnimePress}
          loading={section.loading}
          titleColor={section.titleColor}
          cardSize={section.cardSize}
          icon={section.icon}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing[2], // Espaciado consistente entre secciones
  },
});

export default HomeCategorySections;