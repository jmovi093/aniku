// screens/Search/styles/SearchStyles.js
// Estilos centralizados para SearchScreen

import { StyleSheet } from "react-native";
import { colors, spacing } from "../../../styles";

export const searchStyles = StyleSheet.create({
  // 📱 Container principal
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  // 📜 Content
  content: {
    flex: 1,
  },

  // 🔍 Search section
  searchSection: {
    marginBottom: 0,
  },

  // 📊 Results section
  resultsSection: {
    flex: 1,
  },
});

export default searchStyles;
