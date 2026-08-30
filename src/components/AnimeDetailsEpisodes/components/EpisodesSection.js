import React, { useMemo, useState } from "react";
import { FlatList, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { styles } from "../styles";
import { SkeletonEpisodes } from "./SkeletonSections";
import EpisodeRow from "./EpisodeRow";

// A partir de cuántos episodios se parte la lista en rangos (1–50, 51–100…).
// Con 12-26 episodios (lo normal) la lista va entera; los monstruos tipo
// One Piece o Detective Conan se dividen para no renderizar 1147 filas.
const RANGE_THRESHOLD = 50;
const RANGE_SIZE = 50;

const EpisodesSection = ({
  loadingEpisodes,
  episodes,
  offlineMode,
  downloadStates,
  downloadProgress,
  watchedSet,
  resumeEpisode,
  resumePercent,
  loadingEpisodeId,
  loadingProgress,
  onPlayEpisode,
  onDeleteEpisode,
  onDownloadAction,
  onDownloadAll,
  onToggleWatched,
  onMarkUpTo,
}) => {
  const ranges = useMemo(() => {
    if (episodes.length <= RANGE_THRESHOLD) return [];
    const out = [];
    for (let i = 0; i < episodes.length; i += RANGE_SIZE) {
      const slice = episodes.slice(i, i + RANGE_SIZE);
      out.push({
        key: `${slice[0]}-${slice[slice.length - 1]}`,
        label: `${slice[0]}–${slice[slice.length - 1]}`,
        items: slice,
      });
    }
    return out;
  }, [episodes]);

  // Arrancar en el rango donde está el episodio que se venía viendo.
  const initialRange = useMemo(() => {
    if (!ranges.length) return 0;
    const idx = ranges.findIndex((r) => r.items.includes(String(resumeEpisode)));
    return idx >= 0 ? idx : 0;
  }, [ranges, resumeEpisode]);

  const [activeRange, setActiveRange] = useState(null);
  const rangeIndex = activeRange ?? initialRange;
  const visible = ranges.length ? ranges[rangeIndex].items : episodes;

  if (loadingEpisodes) return <SkeletonEpisodes />;

  return (
    <View style={styles.episodesSection}>
      {/* Continuar: lo que casi siempre se viene a hacer */}
      {resumeEpisode ? (
        <TouchableOpacity
          style={styles.resumeCard}
          onPress={() => onPlayEpisode(String(resumeEpisode))}
        >
          <Text style={styles.resumeLabel}>CONTINUAR</Text>
          <Text style={styles.resumeEpisode}>Episodio {resumeEpisode}</Text>
          {resumePercent > 0 && (
            <View style={styles.resumeBar}>
              <View
                style={[
                  styles.resumeBarFill,
                  { width: `${Math.min(100, Math.round(resumePercent))}%` },
                ]}
              />
            </View>
          )}
        </TouchableOpacity>
      ) : null}

      <View style={styles.episodesHeader}>
        <View style={styles.episodesTitleContainer}>
          <MaterialIcons
            name={offlineMode ? "smartphone" : "tv"}
            size={18}
            color="#007bff"
          />
          <Text style={styles.episodesTitle}>
            Episodios ({episodes.length}{" "}
            {offlineMode ? "descargados" : "disponibles"})
          </Text>
        </View>

        {!offlineMode && (
          <TouchableOpacity
            style={styles.downloadAllButton}
            onPress={onDownloadAll}
          >
            <MaterialIcons name="download" size={16} color="#ffffff" />
            <Text style={styles.downloadAllText}>Todos</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Rangos, solo en series largas */}
      {ranges.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rangeBar}
        >
          {ranges.map((range, index) => {
            const active = index === rangeIndex;
            return (
              <TouchableOpacity
                key={range.key}
                style={[styles.rangeChip, active && styles.rangeChipActive]}
                onPress={() => setActiveRange(index)}
              >
                <Text
                  style={[
                    styles.rangeChipText,
                    active && styles.rangeChipTextActive,
                  ]}
                >
                  {range.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <FlatList
        data={visible}
        renderItem={({ item }) => (
          <EpisodeRow
            item={item}
            offlineMode={offlineMode}
            state={downloadStates[item]}
            progress={downloadProgress[item] || 0}
            isWatched={watchedSet?.has(String(item))}
            isCurrent={String(item) === String(resumeEpisode)}
            isThisEpisodeLoading={loadingEpisodeId === item}
            onPlay={onPlayEpisode}
            onDelete={onDeleteEpisode}
            onDownloadAction={onDownloadAction}
            onToggleWatched={onToggleWatched}
            onMarkUpTo={onMarkUpTo}
            loadingProgress={loadingProgress}
          />
        )}
        keyExtractor={(item) => item.toString()}
        scrollEnabled={false}
        contentContainerStyle={styles.episodesList}
      />
    </View>
  );
};

export default EpisodesSection;
