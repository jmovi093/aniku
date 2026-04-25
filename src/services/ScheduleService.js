const logger = createLogger("api");
import { createLogger } from "../utils/logger";
// services/ScheduleService.js
// Servicio para obtener horarios de animes por día de la semana

import { API_CONFIG } from "../utils/apiConfig.js";
import CatalogService from "./CatalogService.js";

class ScheduleService {
  /**
   * Obtiene animes que salen en un día específico de la semana
   * @param {Date} date - Fecha del día a consultar
   * @param {number} limit - Número de resultados (default: 26)
   * @param {number} page - Página para paginación (default: 1)
   * @returns {Promise<Array>} - Array de animes del día
   */
  static async getAnimesByDate(date, limit = 26, page = 1) {
    logger.debug(`📅 OBTENIENDO HORARIO PARA: ${date.toLocaleDateString()}`);

    try {
      // Crear nueva fecha en UTC para evitar problemas de timezone
      const utcDate = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
      );

      // Calcular timestamps para el día completo en UTC
      const startOfDay = new Date(utcDate);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(utcDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
      const endTimestamp = Math.floor(endOfDay.getTime() / 1000);

      logger.debug(`📅 TIMESTAMPS CALCULADOS:`, {
        fechaOriginal: date.toLocaleDateString(),
        fechaUTC: utcDate.toISOString().split("T")[0],
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        startTimestamp: startTimestamp,
        endTimestamp: endTimestamp,
        // Comparar con el ejemplo del viernes 22
        expectedFriday22Start: 1755820800,
        expectedFriday22End: 1755907199,
        matchesExpected:
          startTimestamp === 1755820800 && endTimestamp === 1755907199,
      });

      const variables = {
        search: {
          dateRangeStart: startTimestamp,
          dateRangeEnd: endTimestamp,
        },
        limit: limit,
        page: page,
        translationType: "sub",
        countryOrigin: "JP",
      };

      logger.debug(
        "📤 REQUEST - getAnimesByDate:",
        date.toLocaleDateString(),
        JSON.stringify(variables),
      );

      const response = await CatalogService.fetchCatalog(variables);

      logger.debug(
        "📥 RESPONSE - getAnimesByDate:",
        JSON.stringify(response.data).substring(0, 200),
      );

      return this.parseScheduleResults(response.data);
    } catch (error) {
      logger.error("❌ ERROR - getAnimesByDate:", error.message);
      throw error;
    }
  }

  /**
   * Obtiene el horario para toda la semana actual (hasta el día actual)
   * @returns {Promise<Object>} - Objeto con animes organizados por día
   */
  static async getWeeklySchedule() {
    logger.debug("📅 OBTENIENDO HORARIO SEMANAL");

    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    const weeklySchedule = {};

    const dayNames = [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ];

    try {
      // Calcular el lunes de esta semana
      const monday = new Date(today);
      const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // Si es domingo, son 6 días desde el lunes
      monday.setDate(today.getDate() - daysFromMonday);

      // Obtener datos para cada día desde el lunes hasta hoy
      const promises = [];
      const daysToShow = currentDayOfWeek === 0 ? 7 : currentDayOfWeek; // Si es domingo, mostrar toda la semana

      for (let i = 0; i < daysToShow; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dayIndex = (i + 1) % 7; // Lunes = 1, Martes = 2, ..., Domingo = 0

        promises.push(
          this.getAnimesByDate(date, 50, 1).then((animes) => ({
            day: dayNames[dayIndex],
            date: date,
            animes: animes,
            dayIndex: dayIndex,
          })),
        );
      }

      const results = await Promise.all(promises);

      // Organizar resultados por día
      results.forEach((result) => {
        weeklySchedule[result.day] = {
          date: result.date,
          animes: result.animes,
          dayIndex: result.dayIndex,
        };
      });

      logger.debug("✅ HORARIO SEMANAL OBTENIDO:", Object.keys(weeklySchedule));
      return weeklySchedule;
    } catch (error) {
      logger.error("❌ ERROR - getWeeklySchedule:", error);
      throw error;
    }
  }

  /**
   * Obtiene animes para un día específico de la semana actual
   * @param {string} dayName - Nombre del día ('lunes', 'martes', etc.)
   * @returns {Promise<Array>} - Array de animes del día
   */
  static async getAnimesForWeekday(dayName) {
    logger.debug(`📅 BUSCANDO FECHA PARA: ${dayName}`);

    // Obtener los días disponibles y buscar la fecha correspondiente
    const availableDays = this.getAvailableDays();
    const targetDay = availableDays.find(
      (day) => day.name.toLowerCase() === dayName.toLowerCase(),
    );

    if (!targetDay) {
      logger.debug(`❌ DÍA ${dayName} NO ENCONTRADO EN DÍAS DISPONIBLES`);
      return [];
    }

    logger.debug(`📅 FECHA ENCONTRADA PARA ${dayName}:`, {
      date: targetDay.date.toLocaleDateString(),
      isToday: targetDay.isToday,
    });

    return this.getAnimesByDate(targetDay.date);
  }

  /**
   * Parsea los resultados del horario
   */
  static parseScheduleResults(data) {
    logger.debug("🔍 PARSING RESULTS:");

    if (!data) {
      logger.debug("   ❌ No data received");
      return [];
    }

    if (!data.data) {
      logger.debug("   ❌ No data.data found");
      logger.debug("   Available keys:", Object.keys(data));
      return [];
    }

    if (!data.data.shows) {
      logger.debug("   ❌ No data.data.shows found");
      logger.debug("   Available keys in data.data:", Object.keys(data.data));
      return [];
    }

    if (!data.data.shows.edges) {
      logger.debug("   ❌ No data.data.shows.edges found");
      logger.debug(
        "   Available keys in data.data.shows:",
        Object.keys(data.data.shows),
      );
      return [];
    }

    const results = data.data.shows.edges.map((edge) => ({
      id: edge._id,
      name: edge.name,
      englishName: edge.englishName || null,
      nativeName: edge.nativeName || null,
      thumbnail: edge.thumbnail || null,
      lastEpisodeInfo: edge.lastEpisodeInfo || null,
      lastEpisodeDate: edge.lastEpisodeDate || null,
      type: edge.type || "TV",
      season: edge.season || null,
      score: edge.score || null,
      airedStart: edge.airedStart || null,
      availableEpisodes: edge.availableEpisodes || { sub: 0, dub: 0, raw: 0 },
      episodeDuration: edge.episodeDuration || null,
      episodeCount: edge.episodeCount || null,
      lastUpdateEnd: edge.lastUpdateEnd || null,
    }));

    logger.debug(`   ✅ Parsed ${results.length} results successfully`);
    return results;
  }

  /**
   * Obtiene los días de la semana disponibles (últimos 7 días desde hoy hacia atrás)
   * @returns {Array} - Array de objetos con información de días
   */
  static getAvailableDays() {
    const today = new Date();

    logger.debug(`📅 CALCULANDO DÍAS DISPONIBLES:`, {
      today: today.toLocaleDateString(),
      dayOfWeek: today.getDay(),
      dayName: [
        "domingo",
        "lunes",
        "martes",
        "miércoles",
        "jueves",
        "viernes",
        "sábado",
      ][today.getDay()],
    });

    const dayNames = [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ];

    const dayNamesShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    const availableDays = [];

    // SIEMPRE mostrar los últimos 7 días desde HOY hacia atrás
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i); // Restar i días desde hoy

      const actualDayIndex = date.getDay(); // Obtener el día real de la semana
      const isToday = date.toDateString() === today.toDateString();

      logger.debug(`📅 DÍA ${6 - i}:`, {
        date: date.toLocaleDateString(),
        dayIndex: actualDayIndex,
        dayName: dayNames[actualDayIndex],
        isToday: isToday,
        daysAgo: i,
      });

      availableDays.push({
        name: dayNames[actualDayIndex],
        shortName: dayNamesShort[actualDayIndex],
        date: date,
        isToday: isToday,
        dayIndex: actualDayIndex,
      });
    }

    logger.debug(
      `📅 DÍAS DISPONIBLES FINALES:`,
      availableDays.map(
        (d) =>
          `${d.name} (${d.date.toLocaleDateString()})${
            d.isToday ? " - HOY" : ""
          }`,
      ),
    );

    return availableDays;
  }
}

export default ScheduleService;
