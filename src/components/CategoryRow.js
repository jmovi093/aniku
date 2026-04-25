import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import AnimeCard from "./AnimeCard.js";

const CategoryRow = ({
  title,
  data,
  onAnimePress,
  loading = false,
  cardSize = "medium",
  titleColor = "#007bff",
  icon = null,
  categoryId,
}) => {
  const renderAnimeCard = ({ item }) => (
    <AnimeCard anime={item} onPress={onAnimePress} size={cardSize} />
  );

  const renderLoadingCard = ({ item }) => (
    <View
      style={[
        cardSize === "large"
          ? styles.loadingCardLarge
          : styles.loadingCardMedium,
        styles.loadingCard,
      ]}
    >
      <View
        style={[
          cardSize === "large"
            ? styles.loadingImageLarge
            : styles.loadingImageMedium,
          styles.loadingImage,
        ]}
      />
      <View style={styles.loadingInfo}>
        <View style={styles.loadingText} />
        <View style={styles.loadingTextSmall} />
      </View>
    </View>
  );

  // Datos fake para loading state
  const loadingData = Array.from({ length: 6 }, (_, index) => ({ id: index }));

  return (
    <View style={styles.categoryContainer}>
      <View style={[styles.titleContainer, { borderLeftColor: titleColor }]}>
        <View style={styles.titleWithIcon}>
          {icon && (
            <MaterialIcons
              name={icon}
              size={18}
              color={titleColor}
              style={styles.titleIcon}
            />
          )}
          <Text style={styles.categoryTitle}>{title}</Text>
        </View>
        {!loading && <Text style={styles.itemCount}>({data.length})</Text>}
      </View>

      <FlatList
        data={loading ? loadingData : data}
        renderItem={loading ? renderLoadingCard : renderAnimeCard}
        keyExtractor={(item, index) =>
          loading
            ? `loading-${categoryId}-${index}`
            : `${categoryId}-${item.id}`
        }
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  categoryContainer: {
    marginBottom: 25,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 20,
    marginBottom: 12,
    borderLeftWidth: 4,
    paddingVertical: 8,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  titleIcon: {
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  itemCount: {
    fontSize: 14,
    color: "#cccccc",
    marginLeft: 8,
    fontWeight: "normal",
  },
  horizontalList: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  // Loading states
  loadingCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 0,
    overflow: "hidden",
    marginRight: 12,
  },
  loadingCardMedium: {
    width: 140,
  },
  loadingCardLarge: {
    width: 180,
  },
  loadingImage: {
    backgroundColor: "#333333",
    opacity: 0.6,
  },
  loadingImageMedium: {
    width: "100%",
    height: 180,
  },
  loadingImageLarge: {
    width: "100%",
    height: 240,
  },
  loadingInfo: {
    padding: 10,
  },
  loadingText: {
    height: 16,
    backgroundColor: "#333333",
    borderRadius: 4,
    marginBottom: 6,
    opacity: 0.4,
  },
  loadingTextSmall: {
    height: 12,
    width: "60%",
    backgroundColor: "#333333",
    borderRadius: 4,
    opacity: 0.3,
  },
});

export default CategoryRow;
