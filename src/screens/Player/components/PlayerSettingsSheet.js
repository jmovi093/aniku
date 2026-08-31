// screens/Player/components/PlayerSettingsSheet.js
// Panel de ajustes DENTRO del reproductor (calidad y audio), como en cualquier
// player. Se abre con el engranaje de la barra superior.

import React from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

/**
 * @param {boolean}  visible
 * @param {Function} onClose
 * @param {Array}    videoLinks       enlaces disponibles (mayor → menor calidad)
 * @param {number}   selectedQuality  índice activo
 * @param {Function} onSelectQuality  (index) => void
 * @param {Array}    audioOptions     [{value:"sub"|"dub", label}]
 * @param {string}   selectedAudio    "sub" | "dub"
 * @param {Function} onSelectAudio    (value) => void
 * @param {boolean}  audioLoading     true mientras se recargan los enlaces
 */
const PlayerSettingsSheet = ({
  visible,
  onClose,
  videoLinks = [],
  selectedQuality = 0,
  onSelectQuality,
  audioOptions = [],
  selectedAudio = "sub",
  onSelectAudio,
  audioLoading = false,
}) => {
  const renderRow = (label, isSelected, onPress, disabled) => (
    <TouchableOpacity
      key={label}
      style={[styles.row, isSelected && styles.rowSelected]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>
        {label}
      </Text>
      {isSelected && <MaterialIcons name="check" size={18} color="#4a9eff" />}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={["portrait", "landscape"]}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* El panel no debe cerrarse al tocarlo por dentro */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Ajustes</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <MaterialIcons name="close" size={22} color="#cccccc" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            {/* Audio: solo si hay más de una opción */}
            {audioOptions.length > 1 && (
              <>
                <Text style={styles.section}>
                  Audio {audioLoading ? "· cargando…" : ""}
                </Text>
                {audioOptions.map((opt) =>
                  renderRow(
                    opt.label,
                    selectedAudio === opt.value,
                    () => onSelectAudio?.(opt.value),
                    audioLoading,
                  ),
                )}
              </>
            )}

            <Text style={styles.section}>Calidad</Text>
            {videoLinks.length === 0 && (
              <Text style={styles.empty}>Sin fuentes disponibles</Text>
            )}
            {videoLinks.map((link, index) =>
              renderRow(
                `${link?.quality || "Auto"}${link?.type ? ` · ${link.type}` : ""}`,
                selectedQuality === index,
                () => onSelectQuality?.(index),
                false,
              ),
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: "78%",
    maxWidth: 360,
    maxHeight: "80%",
    backgroundColor: "#151515",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2b2b2b",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2b2b2b",
  },
  headerText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  body: { paddingVertical: 6 },
  section: {
    color: "#8a8a8a",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  rowSelected: { backgroundColor: "rgba(74,158,255,0.12)" },
  rowText: { color: "#dddddd", fontSize: 14 },
  rowTextSelected: { color: "#4a9eff", fontWeight: "600" },
  empty: { color: "#777777", fontSize: 13, paddingHorizontal: 16, paddingVertical: 8 },
});

export default PlayerSettingsSheet;
