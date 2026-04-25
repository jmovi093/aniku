const logger = createLogger("search");
import { createLogger } from "../../../utils/logger";
// screens/Search/hooks/useSearchData.js
// Hook para gestión de búsquedas

import React, { useState } from "react";
import AnimeService from "../../../services/AnimeService";
import { useSearchDebounce } from "../../../hooks";
import { CustomAlert } from "../../../components/CustomAlert";
import { GENRES, SEASONS } from "../../../utils/apiConfig";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from(
  { length: CURRENT_YEAR - 1978 + 1 },
  (_, index) => CURRENT_YEAR - index,
);

const useSearchData = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [sortBy, setSortBy] = useState(null);

  // 🔍 Búsqueda con debounce
  const {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    clearSearch,
    hasSearchTerm,
  } = useSearchDebounce("", 700);

  // Ref para cancelar respuestas de requests anteriores (stale)
  const requestIdRef = React.useRef(0);

  // 🎯 Ejecutar búsqueda con filtros opcionales
  const executeSearch = async (
    query = debouncedSearchTerm,
    overrideFilters = null,
  ) => {
    const trimmed = query.trim();
    const filters = overrideFilters || {
      genres: selectedGenres,
      year: selectedYear,
      season: selectedSeason,
      sortBy,
    };

    const hasAdvancedFilters =
      filters.genres.length > 0 ||
      !!filters.year ||
      !!filters.season ||
      !!filters.sortBy;

    if (!hasAdvancedFilters && (!trimmed || trimmed.length < 2)) {
      return;
    }

    if (filters.season && !filters.year) {
      CustomAlert.warning(
        "Filtro incompleto",
        "Para usar temporada, primero selecciona un año.",
      );
      return;
    }

    // Incrementar ID; si llega una respuesta con ID viejo, se descarta
    const currentId = ++requestIdRef.current;

    setLoading(true);
    setHasSearched(true);

    try {
      const searchResults = await AnimeService.searchAnimeAdvanced({
        query: trimmed,
        genres: filters.genres,
        year: filters.year,
        season: filters.season,
        sortBy: filters.sortBy,
      });

      // Ignorar si ya hay una búsqueda más reciente en vuelo
      if (currentId !== requestIdRef.current) return;

      setResults(searchResults);
      logger.debug(
        `🔍 BÚSQUEDA: "${trimmed}" - ${searchResults.length} resultados`,
      );
    } catch (error) {
      if (currentId !== requestIdRef.current) return;
      logger.error("❌ Error en búsqueda:", error);
      CustomAlert.error(
        "Error de búsqueda",
        `No se pudo realizar la búsqueda: ${error.message}`,
      );
      setResults([]);
    } finally {
      if (currentId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // 🔄 Reiniciar búsqueda
  const resetSearch = () => {
    setResults([]);
    setHasSearched(false);
    clearSearch();
    setSelectedGenres([]);
    setSelectedYear(null);
    setSelectedSeason(null);
    setSortBy(null);
  };

  const applyFilters = (filters) => {
    setSelectedGenres(filters.genres);
    setSelectedYear(filters.year);
    setSelectedSeason(filters.season);
    setSortBy(filters.sortBy);

    const query = debouncedSearchTerm;
    executeSearch(query, filters);
  };

  const clearFiltersOnly = () => {
    setSelectedGenres([]);
    setSelectedYear(null);
    setSelectedSeason(null);
    setSortBy(null);
    setResults([]);
    setHasSearched(false);
  };

  // 🎯 Búsqueda automática cuando cambia el término de búsqueda
  React.useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      executeSearch(debouncedSearchTerm);
    } else if (
      hasSearched &&
      !selectedGenres.length &&
      !selectedYear &&
      !selectedSeason &&
      !sortBy
    ) {
      setResults([]);
    }
  }, [debouncedSearchTerm]);

  const filtersCount =
    selectedGenres.length +
    (selectedYear ? 1 : 0) +
    (selectedSeason ? 1 : 0) +
    (sortBy ? 1 : 0);

  return {
    // 🔍 Search state
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    clearSearch: resetSearch,

    // 📊 Results state
    results,
    loading,
    hasSearched,
    hasResults: results.length > 0,
    resultsCount: results.length,

    // 🎯 Actions
    executeSearch,
    resetSearch,
    applyFilters,

    // 🎛️ Advanced filters
    genres: GENRES,
    seasons: SEASONS,
    years: YEARS,
    selectedGenres,
    selectedYear,
    selectedSeason,
    sortBy,
    clearFiltersOnly,
    filtersCount,

    // 🎛️ Computed values
    isEmpty: !loading && results.length === 0 && hasSearched,
    isInitial: !hasSearched && !hasSearchTerm && filtersCount === 0,
    showEmptyState: !loading && results.length === 0,
  };
};

export default useSearchData;
