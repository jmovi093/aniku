// screens/Home/HomeScreen.js
// HomeScreen refactorizado con arquitectura modular

import React from "react";
import { ScrollView, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import HeroBanner from "../../components/HeroBanner";
import { Loading } from "../../components/ui";
import {
  HomeHeader,
  QuickAccessButtons,
  HomeCategorySections,
} from "./components";
import { useHomeData, useHomeNavigation } from "./hooks";
import { homeStyles } from "./styles/HomeStyles";

const HomeScreen = ({ navigation }) => {
  // 🎣 Custom hooks
  const {
    // Data
    heroAnime,
    trendingDaily,
    trendingWeekly,
    thisSeason,
    actionAnime,
    romanceAnime,

    // Loading states
    loading,
    refreshing,
    isAnyLoading,
    hasAnyData,

    // Actions
    onRefresh,
  } = useHomeData();

  const { handleAnimeSelect, navigateToWatching, navigateToSearch } =
    useHomeNavigation(navigation);

  // 🔄 Mostrar loading inicial
  if (isAnyLoading && !hasAnyData) {
    return (
      <SafeAreaView style={homeStyles.loadingContainer}>
        <Loading variant="screen" text="Cargando contenido..." size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={homeStyles.container}>
      <ScrollView
        style={homeStyles.scrollView}
        contentContainerStyle={homeStyles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 📱 Header */}
        <HomeHeader />

        {/* 🎬 Hero Banner */}
        <View style={homeStyles.heroSection}>
          <HeroBanner
            anime={heroAnime}
            animes={trendingWeekly}
            onPress={handleAnimeSelect}
            loading={loading.weekly || loading.hero}
          />
        </View>

        {/* 🔘 Quick Access Buttons */}
        <View style={homeStyles.quickAccessSection}>
          <QuickAccessButtons
            onWatchingPress={navigateToWatching}
            onAdvancedSearchPress={navigateToSearch}
          />
        </View>

        {/* 📚 Category Sections */}
        <View style={homeStyles.categoriesSection}>
          <HomeCategorySections
            // Data
            trendingDaily={trendingDaily}
            trendingWeekly={trendingWeekly}
            thisSeason={thisSeason}
            actionAnime={actionAnime}
            romanceAnime={romanceAnime}
            // Loading states
            loading={loading}
            // Handlers
            onAnimePress={handleAnimeSelect}
          />
        </View>

        {/* 🦶 Footer spacer */}
        <View style={homeStyles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
