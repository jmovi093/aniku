import React from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import DownloadService from "../../../services/DownloadService";
import { styles } from "../styles";

const EpisodeRow = ({
  item,
  offlineMode,
  state,
  progress,
  info,
  isThisEpisodeLoading,
  onPlay,
  onDelete,
  onDownloadAction,
  loadingProgress,
}) => {
  const isDownloaded = state === DownloadService.DOWNLOAD_STATES.COMPLETED;
  const isDownloading = state === DownloadService.DOWNLOAD_STATES.DOWNLOADING;

  const showEpisodeOptions = () => {
    const options = [{ text: "Reproducir", onPress: () => onPlay(item) }];

    if (isDownloaded) {
      options.push({
        text: "Eliminar descarga",
        style: "destructive",
        onPress: () => setTimeout(() => onDelete(item), 350),
      });
    } else if (!offlineMode) {
      options.push({
        text: isDownloading ? "Cancelar descarga" : "Descargar",
        onPress: () => onDownloadAction(item),
      });
    }

    options.push({ text: "Cancelar", style: "cancel" });
    Alert.alert(`Episodio ${item}`, "Selecciona una accion:", options);
  };

  return (
    <TouchableOpacity
      style={styles.episodeRow}
      onPress={() => onPlay(item)}
      disabled={isThisEpisodeLoading}
    >
      <View style={styles.episodeRowThumb}>
        {info?.thumbnail ? (
          <Image
            source={{ uri: info.thumbnail }}
            style={styles.episodeRowThumbImg}
          />
        ) : (
          <View style={styles.episodeRowThumbPlaceholder}>
            <MaterialIcons name="play-circle-outline" size={28} color="#444" />
          </View>
        )}
        {isDownloaded && (
          <View style={styles.episodeRowDownloadedBadge}>
            <MaterialIcons name="download-done" size={12} color="#fff" />
          </View>
        )}
        {isThisEpisodeLoading && (
          <View style={styles.episodeRowLoadingBadge}>
            <MaterialIcons name="hourglass-empty" size={12} color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.episodeRowInfo}>
        <Text style={styles.episodeRowTitle}>Episodio {item}</Text>
        {isThisEpisodeLoading && (
          <Text style={styles.episodeRowStatus}>
            {loadingProgress || "Cargando..."}
          </Text>
        )}
        {isDownloading && !isThisEpisodeLoading && (
          <Text style={styles.episodeRowStatus}>Descargando {progress}%</Text>
        )}
        {info?.notes ? (
          <Text style={styles.episodeRowNotes} numberOfLines={1}>
            {info.notes}
          </Text>
        ) : null}
      </View>

      {offlineMode ? (
        isDownloaded && (
          <TouchableOpacity
            style={styles.episodeRowMenu}
            onPress={() => onDelete(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="delete-outline" size={22} color="#ff4444" />
          </TouchableOpacity>
        )
      ) : (
        <TouchableOpacity
          style={styles.episodeRowMenu}
          onPress={showEpisodeOptions}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="more-vert" size={22} color="#888" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default EpisodeRow;
