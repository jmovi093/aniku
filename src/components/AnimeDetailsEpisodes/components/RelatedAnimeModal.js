// components/AnimeDetailsEpisodes/components/RelatedAnimeModal.js
// Modal reusable para "Temporadas" y "Relacionados".
//
// - Temporadas: lista plana, con el año y la entrada actual marcada
//   (anidb la marca con "Now" → llega como `current: true`).
// - Relacionados: viene agrupado por tipo (Prequel, Sequel, Side Story,
//   Spin-off, Summary, Character, Alternative Version, Other). Se muestran
//   chips para filtrar, igual que el selector del sitio.
//
// Tocar un anime navega a su pantalla de detalle (ruta "Episodes").

import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

/**
 * @param {boolean}  visible
 * @param {Function} onClose
 * @param {string}   title            "Temporadas" | "Relacionados"
 * @param {Array}    items            lista plana (modo temporadas)
 * @param {Object}   groups           { tipo: [items] } (modo relacionados)
 * @param {Function} onSelect         (anime) => void
 */
const RelatedAnimeModal = ({
  visible,
  onClose,
  title,
  items = null,
  groups = null,
  onSelect,
}) => {
  const kinds = useMemo(
    () => (groups ? Object.keys(groups).filter((k) => groups[k]?.length) : []),
    [groups],
  );
  const [activeKind, setActiveKind] = useState(null);

  const currentKind = activeKind && kinds.includes(activeKind) ? activeKind : kinds[0];
  const data = groups ? groups[currentKind] || [] : items || [];

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, item.current && styles.cardCurrent]}
      onPress={() => onSelect?.(item)}
      disabled={item.current}
    >
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.posterEmpty]}>
          <MaterialIcons name="movie" size={20} color="#555" />
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.cardMeta}>
          {item.year ? <Text style={styles.cardYear}>{item.year}</Text> : null}
          {item.current && <Text style={styles.currentTag}>Viendo ahora</Text>}
        </View>
      </View>
      {!item.current && (
        <MaterialIcons name="chevron-right" size={20} color="#666" />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.headerText}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <MaterialIcons name="close" size={22} color="#cccccc" />
            </TouchableOpacity>
          </View>

          {/* Chips de tipo, solo en modo relacionados y si hay más de uno */}
          {kinds.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {kinds.map((kind) => {
                const active = kind === currentKind;
                return (
                  <TouchableOpacity
                    key={kind}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setActiveKind(kind)}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {kind} ({groups[kind].length})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <FlatList
            data={data}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            style={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>Nada por acá</Text>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#141414",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "78%",
    paddingBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
  },
  headerText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  chips: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#1f1f1f",
    borderWidth: 1,
    borderColor: "#2e2e2e",
  },
  chipActive: { backgroundColor: "#f97316", borderColor: "#f97316" },
  chipText: { color: "#bbbbbb", fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#ffffff" },
  list: { paddingHorizontal: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cardCurrent: { opacity: 0.55 },
  poster: { width: 46, height: 64, borderRadius: 6, backgroundColor: "#222" },
  posterEmpty: { alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  cardTitle: { color: "#e8e8e8", fontSize: 14, lineHeight: 18 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  cardYear: { color: "#8a8a8a", fontSize: 12 },
  currentTag: { color: "#f97316", fontSize: 11, fontWeight: "700" },
  empty: { color: "#777", textAlign: "center", paddingVertical: 24 },
});

export default RelatedAnimeModal;
