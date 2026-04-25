// styles/AnimeDetailsStyles.js
// Estilos centralizados para AnimeDetails components

import { StyleSheet } from "react-native";

export const AnimeDetailsStyles = StyleSheet.create({
  // 🎨 ESTILOS PRINCIPALES
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  footer: {
    height: 30,
  },

  // 🎯 ESTILOS DEL HEADER
  headerSection: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 10,
  },
  thumbnailContainer: {
    marginRight: 15,
  },
  thumbnail: {
    width: 120,
    height: 160,
    borderRadius: 0,
    backgroundColor: "#333333",
  },
  basicInfo: {
    flex: 1,
    justifyContent: "flex-start",
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    lineHeight: 24,
  },

  // 🏷️ ESTILOS DE ESTADO Y BADGES
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },
  scoreBadge: {
    backgroundColor: "#2a2a2a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#444444",
    flexDirection: "row",
    alignItems: "center",
  },
  scoreText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },

  // 📝 ESTILOS DE DESCRIPCIÓN
  description: {
    color: "#cccccc",
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 12,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  expandButtonText: {
    color: "#007bff",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 5,
  },
  expandArrow: {
    color: "#007bff",
    fontSize: 12,
    fontWeight: "bold",
  },

  // 📋 ESTILOS DE DETALLES EXPANDIBLES
  expandableSection: {
    overflow: "hidden",
  },
  fullDetails: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  fullDescription: {
    color: "#cccccc",
    fontSize: 14,
    lineHeight: 20,
  },

  // 🏷️ ESTILOS DE GÉNEROS
  genresContainer: {
    marginBottom: 20,
  },
  genresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreTag: {
    backgroundColor: "#007bff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  genreText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },

  // ℹ️ ESTILOS DE INFORMACIÓN ADICIONAL
  additionalInfo: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  infoLabel: {
    color: "#888888",
    fontSize: 13,
    width: 80,
  },
  infoValue: {
    color: "#ffffff",
    fontSize: 13,
    flex: 1,
  },

  // 📊 ESTILOS DE ESTADÍSTICAS
  statsContainer: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  statItem: {
    alignItems: "center",
    minWidth: 80,
  },
  statNumber: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  statLabel: {
    color: "#888888",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },

  // 📺 ESTILOS DE SECCIÓN DE EPISODIOS
  episodesSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  episodesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  episodesTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  episodesTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingText: {
    color: "#ffffff",
    textAlign: "center",
    marginTop: 20,
  },

  // 📋 ESTILOS DE LISTA DE EPISODIOS
  episodesList: {
    gap: 8,
  },
  episodeItemContainer: {
    flex: 1,
    maxWidth: "30%",
    margin: 4,
    position: "relative",
  },
  episodeItem: {
    backgroundColor: "#2a2a2a",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#007bff",
    minHeight: 60,
    justifyContent: "center",
  },
  episodeItemDownloaded: {
    backgroundColor: "#2d3748",
    borderColor: "#28a745",
  },
  episodeItemLoading: {
    backgroundColor: "#3a3a3a",
    borderColor: "#ffc107",
    opacity: 0.7,
  },
  episodeNumber: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },
  episodeNumberContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  // 🎯 ESTILOS DE ESTADO DE EPISODIOS
  progressText: {
    color: "#28a745",
    fontSize: 9,
    marginTop: 2,
    fontWeight: "600",
  },
  loadingIndicator: {
    color: "#ffc107",
    fontSize: 8,
    marginTop: 2,
    fontWeight: "600",
    textAlign: "center",
  },
  offlineText: {
    color: "#28a745",
    fontSize: 9,
    marginTop: 2,
    fontWeight: "600",
  },

  // 📥 ESTILOS DE DESCARGAS
  downloadAllButton: {
    backgroundColor: "#28a745",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  downloadAllText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  downloadButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#007bff",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1a1a1a",
  },
  downloadIcon: {
    fontSize: 12,
  },

  // 📴 ESTILOS DE MODO OFFLINE
  offlineBanner: {
    backgroundColor: "#4a5568",
    padding: 8,
    marginBottom: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#718096",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  offlineBannerText: {
    color: "#ffffff",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "600",
  },

  // 💀 ESTILOS DE SKELETON LOADING
  skeletonThumbnail: {
    width: 120,
    height: 160,
    borderRadius: 0,
    backgroundColor: "#333333",
    opacity: 0.6,
  },
  skeletonTitle: {
    height: 24,
    backgroundColor: "#333333",
    borderRadius: 4,
    marginBottom: 12,
    opacity: 0.4,
  },
  skeletonStatusRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  skeletonBadge: {
    height: 20,
    width: 60,
    backgroundColor: "#333333",
    borderRadius: 12,
    opacity: 0.3,
  },
  skeletonDescription: {
    height: 16,
    backgroundColor: "#333333",
    borderRadius: 4,
    marginBottom: 6,
    opacity: 0.3,
  },
  skeletonDescriptionShort: {
    height: 16,
    width: "70%",
    backgroundColor: "#333333",
    borderRadius: 4,
    marginBottom: 12,
    opacity: 0.3,
  },
  skeletonButton: {
    height: 20,
    width: 80,
    backgroundColor: "#333333",
    borderRadius: 4,
    opacity: 0.3,
  },
  skeletonIcon: {
    width: 18,
    height: 18,
    backgroundColor: "#333333",
    borderRadius: 4,
    opacity: 0.3,
  },
  skeletonEpisodesTitle: {
    height: 18,
    width: 150,
    backgroundColor: "#333333",
    borderRadius: 4,
    opacity: 0.3,
  },
  skeletonDownloadButton: {
    height: 32,
    width: 70,
    backgroundColor: "#333333",
    borderRadius: 8,
    opacity: 0.3,
  },
  skeletonEpisodeItem: {
    backgroundColor: "#2a2a2a",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444444",
    minHeight: 60,
    justifyContent: "center",
  },
  skeletonEpisodeText: {
    height: 14,
    width: 60,
    backgroundColor: "#333333",
    borderRadius: 4,
    opacity: 0.4,
  },
});

export default AnimeDetailsStyles;
