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

const RESULTS_PER_PAGE = 26;

const useSearchData = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
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
  // Guarda la última query+filtros usados, para que "cargar más" reutilice
  // exactamente los mismos criterios sin depender de closures viejas
  const lastSearchRef = React.useRef({ trimmed: "", filters: null });
  const pageRef = React.useRef(1);

  // 🎯 Ejecutar búsqueda con filtros opcionales (siempre reinicia a página 1)
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

    lastSearchRef.current = { trimmed, filters };
    pageRef.current = 1;
    setLoading(true);
    setHasSearched(true);

    try {
      const { results: searchResults, pagination } =
        await AnimeService.searchAnimeAdvanced(
          {
            query: trimmed,
            genres: filters.genres,
            year: filters.year,
            season: filters.season,
            sortBy: filters.sortBy,
          },
          RESULTS_PER_PAGE,
          1,
        );

      // Ignorar si ya hay una búsqueda más reciente en vuelo
      if (currentId !== requestIdRef.current) return;

      setResults(searchResults);
      setHasMore(
        searchResults.length === RESULTS_PER_PAGE &&
          searchResults.length < (pagination?.total || 0),
      );
      logger.debug(
        `🔍 BÚSQUEDA: "${trimmed}" - ${searchResults.length}/${pagination?.total ?? "?"} resultados`,
      );
    } catch (error) {
      if (currentId !== requestIdRef.current) return;
      logger.error("❌ Error en búsqueda:", error);
      CustomAlert.error(
        "Error de búsqueda",
        `No se pudo realizar la búsqueda: ${error.message}`,
      );
      setResults([]);
      setHasMore(false);
    } finally {
      if (currentId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // 📄 Cargar la siguiente página y anexar resultados (scroll infinito)
  const loadMoreResults = async () => {
    if (loading || loadingMore || !hasMore) return;

    const { trimmed, filters } = lastSearchRef.current;
    if (!filters) return;

    const currentId = requestIdRef.current;
    const nextPage = pageRef.current + 1;

    setLoadingMore(true);

    try {
      const { results: nextResults, pagination } =
        await AnimeService.searchAnimeAdvanced(
          {
            query: trimmed,
            genres: filters.genres,
            year: filters.year,
            season: filters.season,
            sortBy: filters.sortBy,
          },
          RESULTS_PER_PAGE,
          nextPage,
        );

      // Descartar si mientras tanto se disparó una búsqueda nueva
      if (currentId !== requestIdRef.current) return;

      pageRef.current = nextPage;
      setResults((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const deduped = nextResults.filter((item) => !seen.has(item.id));
        const merged = [...prev, ...deduped];
        setHasMore(
          nextResults.length === RESULTS_PER_PAGE &&
            merged.length < (pagination?.total || 0),
        );
        return merged;
      });
    } catch (error) {
      if (currentId !== requestIdRef.current) return;
      logger.debug("❌ Error cargando más resultados:", error.message);
      // No mostramos alerta — el usuario puede seguir viendo lo ya cargado
    } finally {
      if (currentId === requestIdRef.current) {
        setLoadingMore(false);
      }
    }
  };

  // 🔄 Reiniciar búsqueda
  const resetSearch = () => {
    setResults([]);
    setHasSearched(false);
    setHasMore(false);
    pageRef.current = 1;
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
    setHasMore(false);
    pageRef.current = 1;
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
    loadingMore,
    hasMore,
    hasSearched,
    hasResults: results.length > 0,
    resultsCount: results.length,

    // 🎯 Actions
    executeSearch,
    loadMoreResults,
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
