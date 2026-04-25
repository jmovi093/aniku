// screens/Search/components/SearchResults.js
// Lista de resultados de búsqueda

import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Loading } from "../../../components/ui";
import SearchResultItem from "./SearchResultItem";
import { colors, typography, spacing } from "../../../styles";

const SearchResults = ({
  results,
  loading,
  hasSearched,
  resultsCount,
  onAnimePress,
  isInitial,
  style,
}) => {
  // 🔄 Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loading text="Buscando anime..." size="medium" />
      </View>
    );
  }

  // 🎭 Initial state (no búsqueda realizada)
  if (isInitial) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyMessage}>Busca tu anime favorito</Text>
        <Text style={styles.emptySubtext}>
          Ingresa el nombre de un anime para comenzar
        </Text>
      </View>
    );
  }

  // 📊 Results header
  const ResultsHeader = () =>
    resultsCount > 0 ? (
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {resultsCount} resultado{resultsCount !== 1 ? "s" : ""} encontrado
          {resultsCount !== 1 ? "s" : ""}
        </Text>
      </View>
    ) : null;

  // 🚫 Empty results state
  const EmptyResults = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="search-off" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyMessage}>No se encontraron resultados</Text>
      <Text style={styles.emptySubtext}>
        Prueba con otro término de búsqueda
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <FlatList
        data={results}
        renderItem={({ item }) => (
          <SearchResultItem anime={item} onPress={onAnimePress} />
        )}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ResultsHeader}
        ListEmptyComponent={hasSearched ? EmptyResults : null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          results.length === 0 ? styles.emptyResults : styles.results
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  results: {
    paddingHorizontal: spacing.layout.horizontal,
    paddingBottom: spacing.layout.bottomSafe,
  },

  emptyResults: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.layout.horizontal,
  },

  // 📊 Results header
  resultsHeader: {
    marginBottom: spacing[4],
  },

  resultsCount: {
    color: colors.text.secondary,
    fontSize: typography.fontSizes.sm,
    fontStyle: "italic",
    fontFamily: typography.fontFamilies.sans,
  },

  // 🔄 Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: spacing[16],
  },

  // 🚫 Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: spacing[16],
    paddingHorizontal: spacing[8],
  },

  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing[5],
  },

  emptyMessage: {
    color: "#ffffff",
    fontSize: typography.fontSizes.lg,
    textAlign: "center",
    marginBottom: spacing[2],
    fontFamily: typography.fontFamilies.sans,
  },

  emptySubtext: {
    color: "#aaaaaa",
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: typography.fontFamilies.sans,
  },
});

export default SearchResults;
