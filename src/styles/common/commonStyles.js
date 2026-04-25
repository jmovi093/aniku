// styles/common/commonStyles.js
// Estilos comunes reutilizables en toda la aplicación

import { StyleSheet } from "react-native";
import colors from "../theme/colors";
import typography from "../theme/typography";
import spacing from "../theme/spacing";
import shadows from "../theme/shadows";

const commonStyles = StyleSheet.create({
  // 📱 Contenedores base
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  safeContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  scrollContainer: {
    flexGrow: 1,
    backgroundColor: colors.background.primary,
  },

  // 🎯 Centrado y alineación
  center: {
    alignItems: "center",
    justifyContent: "center",
  },

  centerHorizontal: {
    alignItems: "center",
  },

  centerVertical: {
    justifyContent: "center",
  },

  // 📐 Flex helpers
  row: {
    flexDirection: "row",
  },

  column: {
    flexDirection: "column",
  },

  spaceBetween: {
    justifyContent: "space-between",
  },

  spaceAround: {
    justifyContent: "space-around",
  },

  spaceEvenly: {
    justifyContent: "space-evenly",
  },

  flexStart: {
    justifyContent: "flex-start",
  },

  flexEnd: {
    justifyContent: "flex-end",
  },

  alignStart: {
    alignItems: "flex-start",
  },

  alignEnd: {
    alignItems: "flex-end",
  },

  alignStretch: {
    alignItems: "stretch",
  },

  flex1: {
    flex: 1,
  },

  flex2: {
    flex: 2,
  },

  flex3: {
    flex: 3,
  },

  // 📝 Texto común
  textPrimary: {
    color: colors.text.primary,
  },

  textSecondary: {
    color: colors.text.secondary,
  },

  textMuted: {
    color: colors.text.muted,
  },

  textCenter: {
    textAlign: "center",
  },

  textLeft: {
    textAlign: "left",
  },

  textRight: {
    textAlign: "right",
  },

  textBold: {
    fontWeight: typography.fontWeights.bold,
  },

  textSemibold: {
    fontWeight: typography.fontWeights.semibold,
  },

  textMedium: {
    fontWeight: typography.fontWeights.medium,
  },

  // 🎨 Backgrounds
  backgroundPrimary: {
    backgroundColor: colors.background.primary,
  },

  backgroundSecondary: {
    backgroundColor: colors.background.secondary,
  },

  backgroundTertiary: {
    backgroundColor: colors.background.tertiary,
  },

  // 🔲 Bordes
  borderRadius: {
    borderRadius: 8,
  },

  borderRadiusSmall: {
    borderRadius: 4,
  },

  borderRadiusLarge: {
    borderRadius: 12,
  },

  borderRadiusCircle: {
    borderRadius: 999,
  },

  border: {
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  borderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },

  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  borderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border.light,
  },

  borderRight: {
    borderRightWidth: 1,
    borderRightColor: colors.border.light,
  },

  // 🌫️ Sombras
  shadow: shadows.md,
  shadowSmall: shadows.sm,
  shadowLarge: shadows.lg,
  shadowNone: shadows.none,

  // 📏 Spacing helpers
  margin0: { margin: spacing[0] },
  margin1: { margin: spacing[1] },
  margin2: { margin: spacing[2] },
  margin3: { margin: spacing[3] },
  margin4: { margin: spacing[4] },
  margin5: { margin: spacing[5] },
  margin6: { margin: spacing[6] },
  margin8: { margin: spacing[8] },

  marginTop0: { marginTop: spacing[0] },
  marginTop1: { marginTop: spacing[1] },
  marginTop2: { marginTop: spacing[2] },
  marginTop3: { marginTop: spacing[3] },
  marginTop4: { marginTop: spacing[4] },
  marginTop5: { marginTop: spacing[5] },
  marginTop6: { marginTop: spacing[6] },
  marginTop8: { marginTop: spacing[8] },

  marginBottom0: { marginBottom: spacing[0] },
  marginBottom1: { marginBottom: spacing[1] },
  marginBottom2: { marginBottom: spacing[2] },
  marginBottom3: { marginBottom: spacing[3] },
  marginBottom4: { marginBottom: spacing[4] },
  marginBottom5: { marginBottom: spacing[5] },
  marginBottom6: { marginBottom: spacing[6] },
  marginBottom8: { marginBottom: spacing[8] },

  marginHorizontal0: { marginHorizontal: spacing[0] },
  marginHorizontal1: { marginHorizontal: spacing[1] },
  marginHorizontal2: { marginHorizontal: spacing[2] },
  marginHorizontal3: { marginHorizontal: spacing[3] },
  marginHorizontal4: { marginHorizontal: spacing[4] },
  marginHorizontal5: { marginHorizontal: spacing[5] },
  marginHorizontal6: { marginHorizontal: spacing[6] },

  marginVertical0: { marginVertical: spacing[0] },
  marginVertical1: { marginVertical: spacing[1] },
  marginVertical2: { marginVertical: spacing[2] },
  marginVertical3: { marginVertical: spacing[3] },
  marginVertical4: { marginVertical: spacing[4] },
  marginVertical5: { marginVertical: spacing[5] },
  marginVertical6: { marginVertical: spacing[6] },

  padding0: { padding: spacing[0] },
  padding1: { padding: spacing[1] },
  padding2: { padding: spacing[2] },
  padding3: { padding: spacing[3] },
  padding4: { padding: spacing[4] },
  padding5: { padding: spacing[5] },
  padding6: { padding: spacing[6] },
  padding8: { padding: spacing[8] },

  paddingHorizontal0: { paddingHorizontal: spacing[0] },
  paddingHorizontal1: { paddingHorizontal: spacing[1] },
  paddingHorizontal2: { paddingHorizontal: spacing[2] },
  paddingHorizontal3: { paddingHorizontal: spacing[3] },
  paddingHorizontal4: { paddingHorizontal: spacing[4] },
  paddingHorizontal5: { paddingHorizontal: spacing[5] },
  paddingHorizontal6: { paddingHorizontal: spacing[6] },

  paddingVertical0: { paddingVertical: spacing[0] },
  paddingVertical1: { paddingVertical: spacing[1] },
  paddingVertical2: { paddingVertical: spacing[2] },
  paddingVertical3: { paddingVertical: spacing[3] },
  paddingVertical4: { paddingVertical: spacing[4] },
  paddingVertical5: { paddingVertical: spacing[5] },
  paddingVertical6: { paddingVertical: spacing[6] },

  // 🎯 Estados comunes
  disabled: {
    opacity: 0.5,
  },

  hidden: {
    opacity: 0,
  },

  transparent: {
    backgroundColor: "transparent",
  },

  // 📱 Responsive helpers
  fullWidth: {
    width: "100%",
  },

  fullHeight: {
    height: "100%",
  },

  halfWidth: {
    width: "50%",
  },

  // 🔄 Loading states
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay.backdrop,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },

  // 🎨 Overlay helpers
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.backdrop,
  },

  // 📋 Form helpers
  formGroup: {
    marginBottom: spacing[4],
  },

  formLabel: {
    ...typography.scales.label.normal,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },

  errorText: {
    ...typography.scales.caption.normal,
    color: colors.status.error,
    marginTop: spacing[1],
  },

  // 🎯 Interactive states
  pressable: {
    transition: "opacity 0.2s",
  },

  pressed: {
    opacity: 0.7,
  },

  focused: {
    borderColor: colors.border.focus,
    borderWidth: 2,
  },
});

export default commonStyles;
