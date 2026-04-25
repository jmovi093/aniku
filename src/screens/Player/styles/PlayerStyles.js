// screens/Player/styles/PlayerStyles.js
// Estilos para los componentes del Player

import { StyleSheet } from "react-native";
import { colors, spacing, typography } from "../../../styles";

export const playerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  // 🎬 Video Player
  playerContainer: {
    width: "100%",
    height: 250,
    backgroundColor: colors.background.black,
  },
  playerContainerFullscreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    elevation: 10,
    backgroundColor: "#000",
  },
  videoPlayer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  // 📱 Zonas táctiles (cubren todo el video)
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 10,
  },
  tapZone: {
    width: "25%",
    height: "100%",
  },
  tapZoneCenter: {
    flex: 1,
    height: "100%",
  },

  // ⏳ Buffering
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },

  // 🎮 Controles personalizados
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    zIndex: 30,
  },
  controlsTop: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  controlsTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  controlsEpisode: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  controlsCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  playPauseBtn: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 40,
    padding: 8,
  },
  controlsBottom: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  // Seekbar
  seekBarContainer: {
    height: 28,
    justifyContent: "center",
    marginBottom: 4,
  },
  seekBarTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  seekBarFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  seekBarThumb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fff",
    top: "50%",
    marginTop: -5,
  },

  // Fila de botones
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  controlBtn: {
    padding: 6,
  },
  timeText: {
    flex: 1,
    color: "#fff",
    fontSize: 12,
    marginLeft: 4,
  },
  controlsRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  playerPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderStyle: "dashed",
  },
  placeholderText: {
    color: colors.text.tertiary,
    textAlign: "center",
    fontSize: typography.fontSizes.base,
  },

  // 📋 Info Container
  infoContainer: {
    padding: spacing.layout.horizontal,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  episode: {
    fontSize: typography.fontSizes.base,
    color: colors.text.secondary,
  },

  // � Quality Selector (legacy — no usado)
  // Eliminado

  // ⏭ Next section
  nextSection: {
    paddingTop: spacing[4],
  },
  nextSectionLabel: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: "#ffffff",
    paddingHorizontal: spacing.layout.horizontal,
    marginBottom: spacing[2],
  },

  // Episode row — idéntico al de detail screen
  episodeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 72,
  },
  episodeRowThumb: {
    width: 120,
    height: 68,
    borderRadius: 0,
    backgroundColor: "#2a2a2a",
    overflow: "hidden",
    marginRight: 12,
  },
  episodeRowThumbImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  episodeRowThumbPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  episodeRowInfo: {
    flex: 1,
    justifyContent: "center",
  },
  episodeRowTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  episodeRowStatus: {
    color: "#007bff",
    fontSize: 12,
    marginTop: 2,
  },
  episodeRowMenu: {
    padding: 8,
  },

  // Todos los episodios link
  allEpisodesLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  allEpisodesText: {
    fontSize: typography.fontSizes.base,
    color: "#ffffff",
    fontWeight: typography.fontWeights.semibold,
  },
});
