import React, { useState, useEffect } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../../styles";

const SORT_OPTIONS = ["Top", "Recent"];

const AdvancedSearchFilters = ({
  filtersCount,
  genres,
  years,
  seasons,
  selectedGenres,
  selectedYear,
  selectedSeason,
  sortBy,
  onApplyFilters,
  onClearFilters,
}) => {
  const [open, setOpen] = useState(false);
  const [tempGenres, setTempGenres] = useState([]);
  const [tempYear, setTempYear] = useState(null);
  const [tempSeason, setTempSeason] = useState(null);
  const [tempSortBy, setTempSortBy] = useState(null);
  const [genresOpen, setGenresOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [sortByOpen, setSortByOpen] = useState(false);

  // Sincronizar temp state cuando se abre/cierra el modal
  useEffect(() => {
    if (open) {
      setTempGenres([...selectedGenres]);
      setTempYear(selectedYear);
      setTempSeason(selectedSeason);
      setTempSortBy(sortBy);
      setGenresOpen(false);
      setYearOpen(false);
      setSeasonOpen(false);
      setSortByOpen(false);
    }
  }, [open, selectedGenres, selectedYear, selectedSeason, sortBy]);

  const toggleGenre = (genre) => {
    setTempGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((item) => item !== genre)
        : [...prev, genre],
    );
  };

  const handleApply = () => {
    onApplyFilters({
      genres: tempGenres,
      year: tempYear,
      season: tempSeason,
      sortBy: tempSortBy,
    });
    setOpen(false);
  };

  return (
    <>
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setOpen(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="tune" size={20} color={colors.text.primary} />
          <Text style={styles.filterButtonText}>Búsqueda avanzada</Text>
          {filtersCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{filtersCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {filtersCount > 0 ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClearFilters}
            activeOpacity={0.8}
          >
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal visible={open} animationType="slide" transparent>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros avanzados</Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scrollContent}
            >
              {/* Sort By */}
              <Text style={styles.sectionTitle}>Ordenar por</Text>
              <TouchableOpacity
                style={[
                  styles.selectField,
                  tempSortBy && styles.selectFieldActive,
                ]}
                onPress={() => setSortByOpen(!sortByOpen)}
              >
                <Text
                  style={[
                    styles.selectFieldText,
                    tempSortBy && styles.selectFieldTextActive,
                  ]}
                >
                  {tempSortBy || "Seleccionar"}
                </Text>
                <MaterialIcons
                  name={sortByOpen ? "arrow-drop-up" : "arrow-drop-down"}
                  size={20}
                  color={
                    tempSortBy ? colors.primary[500] : colors.text.secondary
                  }
                />
              </TouchableOpacity>
              {sortByOpen && (
                <View style={styles.sortByPicker}>
                  {SORT_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.sortByPickerItem,
                        tempSortBy === option && styles.sortByPickerItemActive,
                      ]}
                      onPress={() => {
                        setTempSortBy(tempSortBy === option ? null : option);
                        setSortByOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.sortByPickerItemText,
                          tempSortBy === option &&
                            styles.sortByPickerItemTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                      {tempSortBy === option && (
                        <MaterialIcons
                          name="check"
                          size={16}
                          color={colors.primary[500]}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Year y Season lado a lado */}
              <Text style={styles.sectionTitle}>Año y Temporada</Text>
              <View style={styles.twoColRow}>
                <View style={styles.col}>
                  <Text style={styles.fieldLabel}>Año</Text>
                  <TouchableOpacity
                    style={[
                      styles.selectField,
                      tempYear && styles.selectFieldActive,
                    ]}
                    onPress={() => setYearOpen(!yearOpen)}
                  >
                    <Text
                      style={[
                        styles.selectFieldText,
                        tempYear && styles.selectFieldTextActive,
                      ]}
                    >
                      {tempYear ? `${tempYear}` : "Todos"}
                    </Text>
                    <MaterialIcons
                      name={yearOpen ? "arrow-drop-up" : "arrow-drop-down"}
                      size={20}
                      color={
                        tempYear ? colors.primary[500] : colors.text.secondary
                      }
                    />
                  </TouchableOpacity>
                  {yearOpen && (
                    <ScrollView
                      nestedScrollEnabled
                      style={styles.yearPicker}
                      showsVerticalScrollIndicator={false}
                    >
                      <TouchableOpacity
                        style={styles.yearPickerItem}
                        onPress={() => {
                          setTempYear(null);
                          setTempSeason(null);
                          setYearOpen(false);
                          setSeasonOpen(false);
                        }}
                      >
                        <Text style={styles.yearPickerItemText}>Todos</Text>
                      </TouchableOpacity>
                      {years.map((year) => (
                        <TouchableOpacity
                          key={year}
                          style={[
                            styles.yearPickerItem,
                            tempYear === year && styles.yearPickerItemActive,
                          ]}
                          onPress={() => {
                            setTempYear(tempYear === year ? null : year);
                            if (tempYear === year) {
                              setTempSeason(null);
                            }
                            setYearOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.yearPickerItemText,
                              tempYear === year &&
                                styles.yearPickerItemTextActive,
                            ]}
                          >
                            {year}
                          </Text>
                          {tempYear === year && (
                            <MaterialIcons
                              name="check"
                              size={16}
                              color={colors.primary[500]}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>

                <View style={styles.col}>
                  <Text style={styles.fieldLabel}>Temporada</Text>
                  <TouchableOpacity
                    style={[
                      styles.selectField,
                      tempSeason && styles.selectFieldActive,
                      !tempYear && styles.selectFieldDisabled,
                    ]}
                    disabled={!tempYear}
                    onPress={() => tempYear && setSeasonOpen(!seasonOpen)}
                  >
                    <Text
                      style={[
                        styles.selectFieldText,
                        tempSeason && styles.selectFieldTextActive,
                        !tempYear && styles.selectFieldTextDisabled,
                      ]}
                    >
                      {tempSeason || "Todos"}
                    </Text>
                    <MaterialIcons
                      name={seasonOpen ? "arrow-drop-up" : "arrow-drop-down"}
                      size={20}
                      color={
                        tempSeason
                          ? colors.primary[500]
                          : !tempYear
                            ? colors.text.tertiary
                            : colors.text.secondary
                      }
                    />
                  </TouchableOpacity>
                  {tempYear && seasonOpen && (
                    <View style={styles.seasonPicker}>
                      <TouchableOpacity
                        style={styles.seasonPickerItem}
                        onPress={() => {
                          setTempSeason(null);
                          setSeasonOpen(false);
                        }}
                      >
                        <Text style={styles.seasonPickerItemText}>Todos</Text>
                      </TouchableOpacity>
                      {seasons.map((season) => (
                        <TouchableOpacity
                          key={season}
                          style={[
                            styles.seasonPickerItem,
                            tempSeason === season &&
                              styles.seasonPickerItemActive,
                          ]}
                          onPress={() => {
                            setTempSeason(
                              tempSeason === season ? null : season,
                            );
                            setSeasonOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.seasonPickerItemText,
                              tempSeason === season &&
                                styles.seasonPickerItemTextActive,
                            ]}
                          >
                            {season}
                          </Text>
                          {tempSeason === season && (
                            <MaterialIcons
                              name="check"
                              size={16}
                              color={colors.primary[500]}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Géneros colapsables */}
              <TouchableOpacity
                style={styles.genresHeader}
                onPress={() => setGenresOpen(!genresOpen)}
              >
                <View style={styles.genresHeaderLeft}>
                  <Text style={styles.sectionTitle}>Géneros</Text>
                  {tempGenres.length > 0 && (
                    <View style={styles.genreCount}>
                      <Text style={styles.genreCountText}>
                        {tempGenres.length}
                      </Text>
                    </View>
                  )}
                </View>
                <MaterialIcons
                  name={genresOpen ? "expand-less" : "expand-more"}
                  size={24}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>

              {genresOpen && (
                <View style={styles.genresGrid}>
                  {genres.map((genre) => {
                    const active = tempGenres.includes(genre);
                    return (
                      <TouchableOpacity
                        key={genre}
                        style={[
                          styles.genreChip,
                          active && styles.genreChipActive,
                        ]}
                        onPress={() => toggleGenre(genre)}
                      >
                        <Text
                          style={[
                            styles.genreChipText,
                            active && styles.genreChipTextActive,
                          ]}
                        >
                          {genre}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View style={styles.footerSpace} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApply}
              >
                <Text style={styles.applyButtonText}>Filtrar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    gap: spacing[3],
    alignItems: "center",
    paddingHorizontal: spacing.layout.horizontal,
    paddingBottom: spacing[3],
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: 0,
  },
  filterButtonText: {
    color: colors.text.primary,
    fontFamily: typography.fontFamilies.sans,
    fontWeight: typography.fontWeights.semibold,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary[500],
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.text.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  clearButton: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: 0,
  },
  clearButtonText: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamilies.sans,
    fontSize: typography.fontSizes.sm,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalCard: {
    height: "60%",
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderColor: colors.border.medium,
    paddingHorizontal: spacing.layout.horizontal,
    paddingTop: spacing[5],
    paddingBottom: spacing[3],
    flexDirection: "column",
  },
  modalHeader: {
    marginBottom: spacing[3],
  },
  modalTitle: {
    color: colors.text.primary,
    fontFamily: typography.fontFamilies.display,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
  },
  scrollContent: {
    flex: 1,
    marginBottom: spacing[3],
  },
  modalFooter: {
    borderTopWidth: 1,
    borderColor: colors.border.medium,
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  applyButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: 0,
    alignItems: "center",
  },
  applyButtonText: {
    color: colors.text.primary,
    fontFamily: typography.fontFamilies.sans,
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.base,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontFamily: typography.fontFamilies.sans,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing[2],
    marginTop: spacing[3],
    fontSize: typography.fontSizes.base,
  },
  selectRow: {
    flexDirection: "row",
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  selectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 0,
  },
  selectButtonActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[500],
  },
  selectButtonText: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamilies.sans,
    fontSize: typography.fontSizes.sm,
    flex: 1,
  },
  selectButtonTextActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  sortByPicker: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    marginTop: spacing[1],
  },
  sortByPickerItem: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sortByPickerItemActive: {
    backgroundColor: colors.primary[500],
  },
  sortByPickerItemText: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamilies.sans,
    fontSize: typography.fontSizes.sm,
  },
  sortByPickerItemTextActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  twoColRow: {
    flexDirection: "row",
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  col: {
    flex: 1,
  },
  fieldLabel: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamilies.sans,
    fontSize: typography.fontSizes.xs,
    marginBottom: spacing[1],
    fontWeight: typography.fontWeights.semibold,
    textTransform: "uppercase",
  },
  selectField: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 0,
  },
  selectFieldActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[500],
  },
  selectFieldDisabled: {
    opacity: 0.5,
  },
  selectFieldText: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamilies.sans,
    fontSize: typography.fontSizes.sm,
    flex: 1,
  },
  selectFieldTextActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  selectFieldTextDisabled: {
    color: colors.text.tertiary,
  },
  yearPicker: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    marginTop: spacing[1],
    maxHeight: 150,
  },
  yearPickerItem: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  yearPickerItemActive: {
    backgroundColor: colors.primary[500],
  },
  yearPickerItemText: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamilies.sans,
    fontSize: typography.fontSizes.sm,
  },
  yearPickerItemTextActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  seasonPicker: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    marginTop: spacing[1],
  },
  seasonPickerItem: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  seasonPickerItemActive: {
    backgroundColor: colors.primary[500],
  },
  seasonPickerItemText: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamilies.sans,
    fontSize: typography.fontSizes.sm,
  },
  seasonPickerItemTextActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  genresHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.medium,
    marginTop: spacing[2],
  },
  genresHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  genreCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary[500],
    paddingHorizontal: 6,
  },
  genreCountText: {
    color: colors.text.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  genresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  genreChip: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 0,
  },
  genreChipActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[500],
  },
  genreChipText: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamilies.sans,
    fontSize: typography.fontSizes.sm,
  },
  genreChipTextActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  footerSpace: {
    height: spacing[4],
  },
});

export default AdvancedSearchFilters;
