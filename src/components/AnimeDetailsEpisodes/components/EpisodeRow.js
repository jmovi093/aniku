import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import DownloadService from "../../../services/DownloadService";
import { styles } from "../styles";

// Fila de episodio SIN miniatura.
//
// anidb no da thumbnails ni títulos por episodio, así que el recuadro vacío que
// había antes se eliminó. Cada estado tiene UNA sola señal visual — antes el
// mismo estado se codificaba dos veces (barra + etiqueta) y encima la barra solo
// podía mostrar uno, así que un episodio visto Y descargado quedaba ambiguo:
//
//   visto       → número y título opacos
//   descargado  → barra lateral verde
//   actual      → número en azul (además de la tarjeta "Continuar" de arriba)
//
const EpisodeRow = ({
  item,
  offlineMode,
  state,
  progress,
  isWatched,
  isCurrent,
  isThisEpisodeLoading,
  onPlay,
  onDelete,
  onDownloadAction,
  onToggleWatched,
  onMarkUpTo,
  loadingProgress,
}) => {
  const isDownloaded = state === DownloadService.DOWNLOAD_STATES.COMPLETED;
  const isDownloading = state === DownloadService.DOWNLOAD_STATES.DOWNLOADING;

  const showEpisodeOptions = () => {
    const options = [
      { text: "Reproducir", onPress: () => onPlay(item) },
      {
        text: isWatched ? "Quitar marca de visto" : "Marcar como visto",
        onPress: () => onToggleWatched(item),
      },
      {
        text: `Marcar hasta el ${item}`,
        onPress: () => onMarkUpTo(item),
      },
    ];

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
    Alert.alert(`Episodio ${item}`, "Selecciona una acción:", options);
  };

  return (
    <TouchableOpacity
      style={styles.epRow}
      onPress={() => onPlay(item)}
      onLongPress={() => onMarkUpTo(item)}
      delayLongPress={450}
      disabled={isThisEpisodeLoading}
    >
      {/* Barra lateral: verde solo si está descargado */}
      <View style={[styles.epRail, isDownloaded && styles.epRailDownloaded]} />

      <Text
        style={[
          styles.epNumber,
          isWatched && styles.epDim,
          isCurrent && styles.epNumberCurrent,
        ]}
      >
        {item}
      </Text>

      <View style={styles.epBody}>
        <Text style={[styles.epTitle, isWatched && styles.epDim]}>
          Episodio {item}
        </Text>
        {isThisEpisodeLoading && (
          <Text style={styles.epStatus}>{loadingProgress || "Cargando..."}</Text>
        )}
        {isDownloading && !isThisEpisodeLoading && (
          <Text style={styles.epStatus}>Descargando {progress}%</Text>
        )}
      </View>

      {isWatched && !isThisEpisodeLoading && (
        <MaterialIcons name="check" size={16} color="#6b7280" />
      )}

      {offlineMode ? (
        isDownloaded && (
          <TouchableOpacity
            style={styles.epMenu}
            onPress={() => onDelete(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="delete-outline" size={20} color="#ff4444" />
          </TouchableOpacity>
        )
      ) : (
        <TouchableOpacity
          style={styles.epMenu}
          onPress={showEpisodeOptions}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="more-vert" size={20} color="#888" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default EpisodeRow;
