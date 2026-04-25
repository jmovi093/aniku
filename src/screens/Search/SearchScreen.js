// screens/Search/SearchScreen.js
// SearchScreen refactorizado con arquitectura modular

import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  SearchInput,
  SearchResults,
  AdvancedSearchFilters,
} from "./components";
import { useSearchData, useSearchNavigation } from "./hooks";
import { searchStyles } from "./styles/SearchStyles";

const SearchScreen = ({ navigation }) => {
  // 🎣 Custom hooks
  const {
    // Search state
    searchTerm,
    setSearchTerm,
    clearSearch,

    // Results state
    results,
    loading,
    hasSearched,
    hasResults,
    resultsCount,

    // Actions
    executeSearch,
    applyFilters,
    clearFiltersOnly,

    // Computed values
    isInitial,

    // Advanced filters
    genres,
    seasons,
    years,
    selectedGenres,
    selectedYear,
    selectedSeason,
    sortBy,
    filtersCount,
  } = useSearchData();

  const { handleAnimeSelect } = useSearchNavigation(navigation);

  return (
    <SafeAreaView style={searchStyles.container}>
      {/*  Search Input */}
      <View style={searchStyles.searchSection}>
        <SearchInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSearch={executeSearch}
          onClear={clearSearch}
          loading={loading}
        />

        <AdvancedSearchFilters
          filtersCount={filtersCount}
          genres={genres}
          years={years}
          seasons={seasons}
          selectedGenres={selectedGenres}
          selectedYear={selectedYear}
          selectedSeason={selectedSeason}
          sortBy={sortBy}
          onApplyFilters={applyFilters}
          onClearFilters={clearFiltersOnly}
        />
      </View>

      {/* 📊 Results */}
      <View style={searchStyles.resultsSection}>
        <SearchResults
          results={results}
          loading={loading}
          hasSearched={hasSearched}
          resultsCount={resultsCount}
          onAnimePress={handleAnimeSelect}
          isInitial={isInitial}
        />
      </View>
    </SafeAreaView>
  );
};

export default SearchScreen;
