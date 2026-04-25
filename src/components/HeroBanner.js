import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const HeroBanner = ({
  anime,
  animes = [],
  onPress,
  loading = false,
  autoPlay = true,
  autoPlayInterval = 4500,
}) => {
  const sliderData =
    Array.isArray(animes) && animes.length > 0 ? animes : anime ? [anime] : [];
  const listRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  });

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 60 });

  useEffect(() => {
    setCurrentIndex(0);
  }, [sliderData.length]);

  useEffect(() => {
    if (!autoPlay || sliderData.length <= 1) {
      return;
    }

    const intervalId = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % sliderData.length;
        listRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, autoPlayInterval);

    return () => clearInterval(intervalId);
  }, [autoPlay, autoPlayInterval, sliderData.length]);

  if (loading) {
    return (
      <View style={styles.heroContainer}>
        <View style={styles.heroImageLoading} />
        <View style={styles.heroOverlay}>
          <View style={styles.heroContentLoading}>
            <View style={styles.loadingTitle} />
            <View style={styles.loadingDescription} />
            <View style={styles.loadingButton} />
          </View>
        </View>
      </View>
    );
  }

  if (sliderData.length === 0) {
    return null;
  }

  const renderHeroItem = ({ item }) => (
    <View style={styles.heroSlide}>
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.heroImage} />
      ) : (
        <View style={styles.heroPlaceholder}>
          <MaterialIcons name="movie" size={60} color="#666" />
        </View>
      )}

      <View style={styles.heroOverlay}>
        <View style={styles.heroGradient} />

        <View style={styles.heroContent}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {item.name}
          </Text>

          <View style={styles.heroMeta}>
            {item.episodes && (
              <View style={styles.heroEpisodesContainer}>
                <MaterialIcons name="tv" size={14} color="#cccccc" />
                <Text style={styles.heroEpisodes}>
                  {item.episodes} episodios
                </Text>
              </View>
            )}
            {item.score && (
              <View style={styles.heroScoreContainer}>
                <MaterialIcons name="star" size={14} color="#ffc107" />
                <Text style={styles.heroScore}>{item.score}</Text>
              </View>
            )}
          </View>

          {item.description && (
            <Text style={styles.heroDescription} numberOfLines={3}>
              {item.description}
            </Text>
          )}

          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={styles.watchButton}
              onPress={() => onPress?.(item)}
            >
              <MaterialIcons name="play-arrow" size={16} color="#ffffff" />
              <Text style={styles.watchButtonText}>Ver Ahora</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.heroContainer}>
      <FlatList
        ref={listRef}
        data={sliderData}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderHeroItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
      />

      {sliderData.length > 1 && (
        <View style={styles.paginationContainer}>
          {sliderData.map((item, index) => (
            <View
              key={`dot-${item.id}-${index}`}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    height: 300,
    width: width,
    position: "relative",
    marginBottom: 20,
  },
  heroSlide: {
    width: width,
    height: "100%",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#333333",
    justifyContent: "center",
    alignItems: "center",
  },
  heroPlaceholderText: {
    fontSize: 48,
    opacity: 0.3,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  heroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  heroContent: {
    padding: 20,
    paddingBottom: 30,
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 15,
  },
  heroEpisodesContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroEpisodes: {
    color: "#007bff",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
  heroScoreContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroScore: {
    color: "#ffc107",
    fontSize: 13,
    fontWeight: "bold",
    marginLeft: 4,
  },
  heroDescription: {
    color: "#e0e0e0",
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 15,
    opacity: 0.9,
  },
  heroButtons: {
    flexDirection: "row",
    gap: 12,
  },
  watchButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 0,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  watchButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 4,
  },
  // Loading states
  heroImageLoading: {
    width: "100%",
    height: "100%",
    backgroundColor: "#333333",
    opacity: 0.6,
  },
  heroContentLoading: {
    padding: 20,
    paddingBottom: 30,
  },
  loadingTitle: {
    height: 28,
    width: "70%",
    backgroundColor: "#444444",
    borderRadius: 6,
    marginBottom: 10,
    opacity: 0.4,
  },
  loadingDescription: {
    height: 16,
    width: "90%",
    backgroundColor: "#444444",
    borderRadius: 4,
    marginBottom: 8,
    opacity: 0.3,
  },
  loadingButton: {
    height: 48,
    width: 140,
    backgroundColor: "#444444",
    borderRadius: 25,
    marginTop: 8,
    opacity: 0.3,
  },
  paginationContainer: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: "#ffffff",
  },
});

export default HeroBanner;
