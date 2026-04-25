// screens/Schedule/styles/ScheduleStyles.js
// Estilos para los componentes de Schedule

import { StyleSheet } from "react-native";
import { colors, spacing, typography, shadows } from "../../../styles";

export const scheduleStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  // 📅 Day Selector
  daySelector: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.medium,
  },
  selectorTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
    marginHorizontal: spacing.layout.horizontal,
    marginBottom: spacing[3],
  },
  dayList: {
    paddingHorizontal: spacing.layout.horizontal,
  },
  dayButton: {
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: spacing[2],
    marginRight: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.secondary,
    minWidth: 52,
  },
  selectedDayButton: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  todayButton: {
    borderColor: colors.primary[500],
    borderWidth: 2,
  },
  dayInfo: {
    alignItems: "center",
  },
  dayName: {
    fontSize: typography.fontSizes.base,
    color: colors.text.secondary,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing[1],
  },
  selectedDayName: {
    color: colors.text.primary,
  },
  dayDate: {
    fontSize: typography.fontSizes.sm,
    color: "#ffffff",
  },
  selectedDayDate: {
    color: colors.text.primary,
  },
  todayIcon: {
    marginTop: spacing[1],
  },

  // 📋 Schedule List
  listContent: {
    padding: spacing.layout.horizontal,
    paddingBottom: spacing.layout.bottomSafe,
  },
  gridRow: {
    justifyContent: "space-between",
  },
  animeItem: {
    width: "47%",
    marginBottom: spacing[4],
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing[2],
    paddingHorizontal: spacing[3],
  },
  airingTime: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary[500],
    marginLeft: spacing[1],
    fontWeight: typography.fontWeights.medium,
  },

  // 🔄 Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // 📭 Empty State
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
    color: colors.text.tertiary,
    textAlign: "center",
    lineHeight: typography.lineHeights.relaxed,
  },

  // ❌ Error State
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[8],
  },
  errorIcon: {
    marginBottom: spacing[4],
  },
  errorTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.status.error,
    textAlign: "center",
    marginBottom: spacing[2],
  },
  errorSubtitle: {
    fontSize: typography.fontSizes.base,
    color: colors.text.tertiary,
    textAlign: "center",
    lineHeight: typography.lineHeights.relaxed,
  },
});
