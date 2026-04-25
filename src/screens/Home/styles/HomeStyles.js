// screens/Home/styles/HomeStyles.js
// Estilos centralizados para HomeScreen

import { StyleSheet } from "react-native";
import { colors, spacing } from "../../../styles";

export const homeStyles = StyleSheet.create({
  // 📱 Container principal
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  // 📜 ScrollView
  scrollView: {
    flex: 1,
  },

  scrollViewContent: {
    paddingBottom: spacing.layout.bottomSafe,
  },

  // 🦶 Footer
  footer: {
    height: spacing[8],
  },

  // 🔄 Estados de loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.primary,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.layout.horizontal,
    paddingVertical: spacing[8],
  },

  // 🎨 Secciones
  heroSection: {
    marginBottom: spacing[6],
  },

  quickAccessSection: {
    marginBottom: spacing[6],
  },

  categoriesSection: {
    flex: 1,
  },
});

export default homeStyles;
