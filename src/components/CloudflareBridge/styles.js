import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  // WebView invisible: fuera de pantalla y sin tamaño. El challenge de
  // Cloudflare es automático, así que el usuario nunca necesita verlo.
  hidden: {
    position: "absolute",
    width: 0,
    height: 0,
    opacity: 0,
    left: -9999,
    top: -9999,
  },
});
