// screens/Schedule/hooks/useScheduleData.js
// Hook para gestión de datos de horarios

import { useState, useEffect } from "react";
import ScheduleService from "../../../services/ScheduleService";
import { createLogger } from "../../../utils/logger";

const logger = createLogger("app");

export const useScheduleData = () => {
  const [availableDays, setAvailableDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [animes, setAnimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // 🚀 Inicializar al montar
  useEffect(() => {
    initializeSchedule();
  }, []);

  // 📅 Inicializar horarios
  const initializeSchedule = () => {
    const days = ScheduleService.getAvailableDays();
    setAvailableDays(days);

    logger.debug(
      "📅 DÍAS DISPONIBLES:",
      days.map((d) => `${d.name} (${d.date.toLocaleDateString()})`)
    );

    // Seleccionar el día actual por defecto, o el último disponible
    const todayOrLast =
      days.find((day) => day.isToday) || days[days.length - 1];
    if (todayOrLast) {
      logger.debug("📅 SELECCIONANDO DÍA:", todayOrLast.name);
      setSelectedDay(todayOrLast.name);
      loadAnimesForDay(todayOrLast.name);
    }
  };

  // 📺 Cargar animes para un día específico
  const loadAnimesForDay = async (dayName) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      logger.debug(`📅 CARGANDO HORARIOS PARA: ${dayName}`);
      const animesData = await ScheduleService.getAnimesForWeekday(dayName);

      logger.debug(`✅ ${dayName.toUpperCase()}: ${animesData.length} animes`);
      setAnimes(animesData);
    } catch (error) {
      logger.error(`❌ Error cargando horarios para ${dayName}:`, error);
      setError(error.message);
      setAnimes([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Refrescar datos
  const onRefresh = async () => {
    setRefreshing(true);

    try {
      // Reinicializar días disponibles
      initializeSchedule();
    } catch (error) {
      logger.error("❌ Error al refrescar:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // 📅 Cambiar día seleccionado
  const changeSelectedDay = (dayName) => {
    if (dayName !== selectedDay) {
      setSelectedDay(dayName);
      loadAnimesForDay(dayName);
    }
  };

  return {
    availableDays,
    selectedDay,
    animes,
    loading,
    refreshing,
    error,
    changeSelectedDay,
    onRefresh,
  };
};
