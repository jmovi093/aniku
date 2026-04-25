// screens/Player/components/PlayerInfo.js
// Componente de información del anime y episodio

import React from "react";
import { View, Text } from "react-native";
import { playerStyles as styles } from "../styles/PlayerStyles";

const PlayerInfo = ({ animeName, currentEpisodeNumber }) => {
  return (
    <View style={styles.infoContainer}>
      <Text style={styles.title}>{animeName}</Text>
      <Text style={styles.episode}>Episodio {currentEpisodeNumber}</Text>
    </View>
  );
};

export default PlayerInfo;
