// screens/Downloads/styles/DownloadsStyles.js
// Estilos para los componentes de Downloads

import { StyleSheet } from "react-native";
import { colors, spacing, typography, shadows } from "../../../styles";

export const downloadsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  // 📋 Lista
  listContainer: {
    padding: spacing.layout.horizontal,
  },
  listContent: {
    paddingBottom: spacing.layout.bottomSafe,
  },

  // Card de anime (estilo WatchingCard)
  downloadCard: {
    flexDirection: "row",
    height: 100,
    backgroundColor: colors.background.secondary,
    borderRadius: 0,
    overflow: "hidden",
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.medium,
    alignItems: "center",
    ...shadows.md,
  },

  thumbnailContainer: {
    width: 80,
    height: "100%",
    backgroundColor: colors.background.tertiary,
    justifyContent: "center",
    alignItems: "center",
  },

  animeContent: {
    flex: 1,
    paddingHorizontal: spacing[3],
    justifyContent: "center",
  },

  animeName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },

  episodeCount: {
    fontSize: typography.fontSizes.sm,
    color: "#aaaaaa",
  },

  viewButton: {
    paddingRight: spacing[3],
    justifyContent: "center",
    alignItems: "center",
  },

  // 📭 Estado vacío
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[8],
  },
  emptyIcon: {
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: "#cccccc",
    textAlign: "center",
    marginBottom: spacing[2],
  },
  emptySubtitle: {
    fontSize: typography.fontSizes.base,
    color: colors.text.tertiary,
    textAlign: "center",
    lineHeight: typography.lineHeights.relaxed,
  },
});
