// screens/Schedule/components/DaySelector.js
// Componente para seleccionar días de la semana

import React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { scheduleStyles as styles } from "../styles/ScheduleStyles";

const EN_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DaySelector = ({ availableDays, selectedDay, onDayChange }) => {
  // 📅 Renderizar item de día
  const renderDayItem = ({ item }) => {
    const isSelected = selectedDay === item.name;
    const isToday = item.isToday;
    const shortLabel = EN_SHORT[item.dayIndex];

    return (
      <TouchableOpacity
        style={[
          styles.dayButton,
          isSelected && styles.selectedDayButton,
          isToday && styles.todayButton,
        ]}
        onPress={() => onDayChange(item.name)}
      >
        <View style={styles.dayInfo}>
          <Text style={[styles.dayName, isSelected && styles.selectedDayName]}>
            {shortLabel}
          </Text>
          <Text style={[styles.dayDate, isSelected && styles.selectedDayDate]}>
            {item.date.getDate()}/{item.date.getMonth() + 1}
          </Text>
          {isToday && (
            <MaterialIcons
              name="today"
              size={12}
              color={isSelected ? "#ffffff" : "#007bff"}
              style={styles.todayIcon}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.daySelector}>
      <Text style={styles.selectorTitle}>Horario Semanal</Text>
      <FlatList
        data={availableDays}
        keyExtractor={(item) => item.name}
        renderItem={renderDayItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayList}
      />
    </View>
  );
};

export default DaySelector;
