// components/AnimeDetailsEpisodes/components/AnimeOverflowMenu.js
// Menú de los tres puntos de la pantalla de detalle.
//
// Antes el botón abría directo el modal de listas. Ahora abre este menú, que
// además da acceso a Temporadas y Relacionados — así esos datos no ocupan
// espacio permanente en la pantalla (era la alternativa: dos carruseles más).
// Las opciones sin datos no se muestran.

import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

/**
 * @param {boolean}  visible
 * @param {Function} onClose
 * @param {Function} onAddToList
 * @param {Function} onShowSeasons
 * @param {Function} onShowRelations
 * @param {number}   seasonsCount    si es 0 se oculta la opción
 * @param {number}   relationsCount  si es 0 se oculta la opción
 */
const AnimeOverflowMenu = ({
  visible,
  onClose,
  onAddToList,
  onShowSeasons,
  onShowRelations,
  seasonsCount = 0,
  relationsCount = 0,
}) => {
  const item = (icon, label, onPress, badge) => (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <MaterialIcons name={icon} size={20} color="#cccccc" />
      <Text style={styles.rowText}>{label}</Text>
      {badge > 0 && <Text style={styles.badge}>{badge}</Text>}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {item("playlist-add", "Añadir a lista", onAddToList)}
          {seasonsCount > 0 &&
            item("layers", "Temporadas", onShowSeasons, seasonsCount)}
          {relationsCount > 0 &&
            item("account-tree", "Relacionados", onShowRelations, relationsCount)}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 56,
    paddingRight: 8,
  },
  sheet: {
    backgroundColor: "#1b1b1b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2e2e2e",
    paddingVertical: 6,
    minWidth: 210,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowText: { color: "#e6e6e6", fontSize: 14, flex: 1 },
  badge: {
    color: "#8a8a8a",
    fontSize: 12,
    fontWeight: "700",
  },
});

export default AnimeOverflowMenu;
