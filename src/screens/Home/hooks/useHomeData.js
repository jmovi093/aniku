const logger = createLogger("home");
import { createLogger } from "../../../utils/logger";
// screens/Home/hooks/useHomeData.js
// Hook para gestión de datos del Home

import { useState, useEffect } from "react";
import CatalogService from "../../../services/CatalogService";

const useHomeData = () => {
  // Estados para cada sección
  const [heroAnime, setHeroAnime] = useState(null);
  const [trendingDaily, setTrendingDaily] = useState([]);
  const [trendingWeekly, setTrendingWeekly] = useState([]);
  const [thisSeason, setThisSeason] = useState([]);
  const [actionAnime, setActionAnime] = useState([]);
  const [romanceAnime, setRomanceAnime] = useState([]);

  // Estados de loading individuales
  const [loadingStates, setLoadingStates] = useState({
    hero: true,
    daily: true,
    weekly: true,
    season: true,
    action: true,
    romance: true,
  });

  const [refreshing, setRefreshing] = useState(false);

  // 🎯 Helper para actualizar estados de loading
  const updateLoadingState = (section, isLoading) => {
    setLoadingStates((prev) => ({
      ...prev,
      [section]: isLoading,
    }));
  };

  // 🎬 Cargar sección Hero
  const loadHeroSection = async () => {
    await loadTrendingWeekly();
  };

  // 📈 Cargar Trending Daily
  const loadTrendingDaily = async () => {
    try {
      updateLoadingState("daily", true);
      const trending = await CatalogService.getPopularDaily(20);
      setTrendingDaily(trending);
      logger.debug("📈 TRENDING DAILY:", trending.length);
    } catch (error) {
      logger.error("❌ Error cargando trending daily:", error);
    } finally {
      updateLoadingState("daily", false);
    }
  };

  // 📊 Cargar Trending Weekly
  const loadTrendingWeekly = async () => {
    try {
      updateLoadingState("weekly", true);
      updateLoadingState("hero", true);
      const weekly = await CatalogService.getPopularWeekly(20);
      setTrendingWeekly(weekly);
      setHeroAnime(weekly[0] || null);
      logger.debug("📊 TRENDING WEEKLY:", weekly.length);
    } catch (error) {
      logger.error("❌ Error cargando trending weekly:", error);
    } finally {
      updateLoadingState("weekly", false);
      updateLoadingState("hero", false);
    }
  };

  // 🌸 Cargar temporada actual
  const loadThisSeason = async () => {
    try {
      updateLoadingState("season", true);
      const season = await CatalogService.getCurrentSeasonAnime(20);
      setThisSeason(season);
      logger.debug("🌸 THIS SEASON:", season.length);
    } catch (error) {
      logger.error("❌ Error cargando temporada:", error);
    } finally {
      updateLoadingState("season", false);
    }
  };

  // ⚔️ Cargar anime de acción
  const loadActionSection = async () => {
    try {
      updateLoadingState("action", true);
      const action = await CatalogService.getActionAnime(20);
      setActionAnime(action);
      logger.debug("⚔️ ACTION:", action.length);
    } catch (error) {
      logger.error("❌ Error cargando action:", error);
    } finally {
      updateLoadingState("action", false);
    }
  };

  // 💕 Cargar anime de romance
  const loadRomanceSection = async () => {
    try {
      updateLoadingState("romance", true);
      const romance = await CatalogService.getRomanceAnime(20);
      setRomanceAnime(romance);
      logger.debug("💕 ROMANCE:", romance.length);
    } catch (error) {
      logger.error("❌ Error cargando romance:", error);
    } finally {
      updateLoadingState("romance", false);
    }
  };

  // 🔄 Cargar todos los catálogos
  const loadAllCatalogs = async () => {
    logger.debug("📺 CARGANDO CATÁLOGOS HOME...");

    // Cargar secciones en paralelo para mejor performance
    const loadPromises = [
      loadTrendingDaily(),
      loadTrendingWeekly(),
      loadThisSeason(),
      loadActionSection(),
      loadRomanceSection(),
    ];

    try {
      await Promise.allSettled(loadPromises);
      logger.debug("✅ TODOS LOS CATÁLOGOS CARGADOS");
    } catch (error) {
      logger.error("❌ Error cargando catálogos:", error);
    }
  };

  // 🔄 Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllCatalogs();
    setRefreshing(false);
  };

  // 🎯 Cargar datos inicialmente
  useEffect(() => {
    loadAllCatalogs();
  }, []);

  // 🎯 Computed values
  const isAnyLoading = Object.values(loadingStates).some(Boolean);
  const hasAnyData = [
    heroAnime,
    trendingDaily.length,
    trendingWeekly.length,
    thisSeason.length,
    actionAnime.length,
    romanceAnime.length,
  ].some(Boolean);

  return {
    // 📊 Data
    heroAnime,
    trendingDaily,
    trendingWeekly,
    thisSeason,
    actionAnime,
    romanceAnime,

    // 🔄 Loading states
    loading: loadingStates,
    refreshing,
    isAnyLoading,
    hasAnyData,

    // 🎯 Actions
    onRefresh,
    loadAllCatalogs,

    // 🔄 Individual loaders (para casos específicos)
    loadHeroSection,
    loadTrendingDaily,
    loadTrendingWeekly,
    loadThisSeason,
    loadActionSection,
    loadRomanceSection,
  };
};

export default useHomeData;
