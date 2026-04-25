// screens/Watching/styles/WatchingStyles.js
// Estilos para los componentes de Watching

import { StyleSheet } from "react-native";
import { colors, spacing, typography, shadows } from "../../../styles";

export const watchingStyles = StyleSheet.create({
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

  // 🃏 Watching Card
  watchingCard: {
    flexDirection: "row", // ← CAMBIO PRINCIPAL: Layout horizontal
    height: 120, // ← Altura fija para thumbnail completo
    backgroundColor: colors.background.secondary,
    borderRadius: 0,
    overflow: "hidden", // ← Para que thumbnail no tenga marco
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.medium,
    ...shadows.md,
  },

  // 🖼️ Thumbnail Container
  thumbnailContainer: {
    width: 80, // ← Ancho fijo del thumbnail
    height: "100%", // ← Altura completa
    position: "relative",
  },

  // 🖼️ Thumbnail Image
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover", // ← Sin marcos, ocupa todo
  },

  // 🖼️ Placeholder para thumbnail
  placeholderThumbnail: {
    backgroundColor: colors.background.tertiary,
    justifyContent: "center",
    alignItems: "center",
  },

  // 📊 Progress Overlay
  progressOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.primary[500],
  },

  // 📝 Anime Content Container
  animeContent: {
    flex: 1,
    padding: spacing[3],
    justifyContent: "space-between",
  },

  // 📺 Header del card
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing[2], // ← Reducido para layout compacto
  },
  animeInfo: {
    flex: 1,
    marginRight: spacing[2], // ← Reducido para layout compacto
  },
  animeName: {
    fontSize: typography.fontSizes.base, // ← Reducido para layout compacto
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  episodeInfo: {
    fontSize: typography.fontSizes.sm, // ← Reducido para layout compacto
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  timeInfo: {
    fontSize: typography.fontSizes.xs, // ← Reducido para layout compacto
    color: colors.text.tertiary,
  },

  // 🗑️ Botón eliminar
  removeButton: {
    padding: spacing[1], // ← Reducido para layout compacto
    borderRadius: spacing[1],
    backgroundColor: colors.background.tertiary,
  },

  // 🎮 Botones de acción
  actionButtons: {
    flexDirection: "row",
    gap: spacing[2], // ← Reducido para layout compacto
  },
  continueButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[2], // ← Reducido para layout compacto
    paddingHorizontal: spacing[3], // ← Reducido para layout compacto
    borderRadius: spacing[2],
    ...shadows.sm,
  },
  continueText: {
    color: colors.text.primary,
    fontSize: typography.fontSizes.sm, // ← Reducido para layout compacto
    fontWeight: typography.fontWeights.semibold,
    marginLeft: spacing[1], // ← Reducido para layout compacto
  },
  detailsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing[2], // ← Reducido para layout compacto
    paddingHorizontal: spacing[3], // ← Reducido para layout compacto
    borderRadius: spacing[2],
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  detailsText: {
    color: colors.primary[500],
    fontSize: typography.fontSizes.sm, // ← Reducido para layout compacto
    fontWeight: typography.fontWeights.semibold,
    marginLeft: spacing[1], // ← Reducido para layout compacto
  },

  // �️ Sub-tabs (Viendo | Mis Listas)
  subTabsContainer: {
    flexDirection: "row",
    marginHorizontal: spacing.layout.horizontal,
    marginBottom: spacing[4],
    marginTop: spacing[2],
    backgroundColor: colors.background.tertiary,
    borderRadius: spacing[2],
    padding: spacing[1],
  },
  subTab: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: "center",
    borderRadius: spacing[2],
  },
  subTabActive: {
    backgroundColor: colors.primary[500],
  },
  subTabText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.muted,
  },
  subTabTextActive: {
    color: colors.text.primary,
  },

  // 🃏 List Card
  listCard: {
    flexDirection: "row",
    height: 100,
    backgroundColor: colors.background.secondary,
    borderRadius: 0,
    overflow: "hidden",
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.medium,
    ...shadows.md,
  },
  listCardThumbnail: {
    width: 80,
    height: "100%",
  },
  listCardThumbnailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  listCardPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.background.tertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  listCardContent: {
    flex: 1,
    padding: spacing[3],
    justifyContent: "space-between",
  },
  listCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  listCardName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing[2],
  },
  listCardCount: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
  },
  listCardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  listCardDeleteBtn: {
    padding: spacing[1],
    borderRadius: spacing[1],
    backgroundColor: colors.background.tertiary,
  },

  // ➕ Botón nueva lista
  newListButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background.secondary,
    borderRadius: spacing[3],
    borderWidth: 1,
    borderColor: colors.primary[500],
    borderStyle: "dashed",
    height: 56,
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  newListButtonText: {
    color: colors.primary[500],
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
  },

  // 🃏 ListAnimeCard (dentro de un listado)
  listAnimeCard: {
    flexDirection: "row",
    height: 90,
    backgroundColor: colors.background.secondary,
    borderRadius: 0,
    overflow: "hidden",
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.medium,
    ...shadows.sm,
  },
  listAnimeThumbnail: {
    width: 65,
    height: "100%",
    resizeMode: "cover",
  },
  listAnimePlaceholder: {
    width: 65,
    height: "100%",
    backgroundColor: colors.background.tertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  listAnimeContent: {
    flex: 1,
    padding: spacing[3],
    justifyContent: "space-between",
  },
  listAnimeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  listAnimeName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing[2],
  },
  listAnimeActions: {
    flexDirection: "row",
    gap: spacing[2],
  },
  listAnimeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[2],
    borderRadius: spacing[2],
  },
  listAnimeBtnPrimary: {
    backgroundColor: colors.primary[500],
    ...shadows.sm,
  },
  listAnimeBtnSecondary: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  listAnimeBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    marginLeft: spacing[1],
  },
  listAnimeBtnTextPrimary: {
    color: colors.text.primary,
  },
  listAnimeBtnTextSecondary: {
    color: colors.primary[500],
  },

  // 🗃️ AddToListModal
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  modalContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: spacing[5],
    borderTopRightRadius: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
    maxHeight: "75%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.medium,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing[4],
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
    paddingHorizontal: spacing[5],
    marginBottom: spacing[4],
  },
  modalListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  modalListItemThumbnail: {
    width: 40,
    height: 56,
    borderRadius: 0,
    backgroundColor: colors.background.tertiary,
    marginRight: spacing[3],
    overflow: "hidden",
  },
  modalListItemThumbnailImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  modalListItemName: {
    flex: 1,
    fontSize: typography.fontSizes.base,
    color: colors.text.primary,
  },
  modalListItemCount: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.muted,
    marginTop: 2,
  },
  modalNewList: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    gap: spacing[3],
  },
  modalNewListText: {
    fontSize: typography.fontSizes.base,
    color: colors.primary[500],
    fontWeight: typography.fontWeights.semibold,
  },
  modalCreateInput: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing[5],
    marginTop: spacing[2],
    gap: spacing[2],
  },
  modalInput: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    color: colors.text.primary,
    borderRadius: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: typography.fontSizes.base,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  modalInputConfirm: {
    backgroundColor: colors.primary[500],
    borderRadius: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    ...shadows.sm,
  },
  modalInputConfirmText: {
    color: colors.text.primary,
    fontWeight: typography.fontWeights.bold,
  },

  // �📭 Estado vacío
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
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing[2],
  },
  emptySubtitle: {
    fontSize: typography.fontSizes.base,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing[2],
  },
});
