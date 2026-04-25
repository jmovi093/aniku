const logger = createLogger("history");
import { createLogger } from "../utils/logger";
import AsyncStorage from "@react-native-async-storage/async-storage";

class HistoryService {
  static WATCHING_KEY = "anime_watching";
  static FULL_HISTORY_KEY = "anime_full_history";

  // ✅ MÉTODO CORREGIDO
  static async updateWatching(
    animeId,
    animeName,
    episodeNo,
    currentTime = 0, // ← Nombre correcto y valor por defecto
    totalDuration = 0, // ← Nombre correcto y valor por defecto
    thumbnail = null, // ← NUEVO CAMPO para thumbnail
  ) {
    try {
      logger.debug('📚 ACTUALIZANDO "VIENDO":');
      logger.debug("   Anime:", animeName);
      logger.debug("   Episodio:", episodeNo);
      logger.debug(
        "   Progreso:",
        `${Math.round(currentTime)}s / ${Math.round(totalDuration)}s`,
      );
      logger.debug(
        "   Thumbnail:",
        thumbnail ? `✅ SÍ (${thumbnail.substring(0, 50)}...)` : "❌ NO",
      );

      const watching = await this.getWatching();

      // Buscar la entrada existente ANTES de construir watchingEntry
      // para poder preservar el thumbnail si el nuevo es null
      const existingEntry = watching.find((item) => item.animeId === animeId);

      const watchingEntry = {
        animeId,
        animeName,
        currentEpisode: episodeNo,
        progress: Math.round(currentTime), // ✅ USAR currentTime
        totalDuration: Math.round(totalDuration),
        thumbnail: thumbnail || existingEntry?.thumbnail || null, // ✅ preservar thumbnail existente si el nuevo es null
        lastWatched: new Date().toISOString(),
        progressPercent:
          totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0, // ✅ USAR currentTime
      };

      // Reemplazar entrada existente del mismo anime (como ani-cli)
      const existingIndex = watching.findIndex(
        (item) => item.animeId === animeId,
      );

      if (existingIndex >= 0) {
        watching[existingIndex] = watchingEntry;
        logger.debug("🔄 Actualizando entrada existente");
      } else {
        watching.unshift(watchingEntry); // Agregar al inicio
        logger.debug("➕ Agregando nueva entrada");
      }

      // Mantener solo los últimos 20 animes
      const limitedWatching = watching.slice(0, 20);

      await AsyncStorage.setItem(
        this.WATCHING_KEY,
        JSON.stringify(limitedWatching),
      );
      logger.debug('✅ "VIENDO" actualizado sin errores');

      // También guardar en historial completo
      await this.addToFullHistory(animeId, animeName, episodeNo, currentTime);
    } catch (error) {
      logger.error('❌ ERROR ACTUALIZANDO "VIENDO":', error);
      logger.error("❌ DETALLES DEL ERROR:", error.message, error.stack);
    }
  }

  // Obtener lista "Viendo" (como ani-cli history)
  static async getWatching() {
    try {
      const watching = await AsyncStorage.getItem(this.WATCHING_KEY);
      const result = watching ? JSON.parse(watching) : [];
      logger.debug(`📋 Obtenidos ${result.length} animes "viendo"`);
      return result;
    } catch (error) {
      logger.error('Error obteniendo "Viendo":', error);
      return [];
    }
  }

  // Determinar qué episodio continuar (como ani-cli process_hist_entry)
  static getNextEpisodeToWatch(watchingEntry, episodesList) {
    const currentIndex = episodesList.indexOf(
      watchingEntry.currentEpisode.toString(),
    );

    // Si progreso > 95%, ir al siguiente episodio
    if (
      watchingEntry.progressPercent > 95 &&
      currentIndex < episodesList.length - 1
    ) {
      logger.debug("📺 EPISODIO CASI COMPLETO, IR AL SIGUIENTE");
      return {
        episode: episodesList[currentIndex + 1],
        resumeTime: 0, // Empezar desde el inicio
        isNextEpisode: true,
      };
    }

    // Si progreso < 2 minutos del final, continuar en el mismo
    if (watchingEntry.totalDuration - watchingEntry.progress > 120) {
      logger.debug("📺 CONTINUAR EN EPISODIO ACTUAL");
      return {
        episode: watchingEntry.currentEpisode,
        resumeTime: watchingEntry.progress,
        isNextEpisode: false,
      };
    }

    // Si está en los últimos 2 minutos, ir al siguiente
    if (currentIndex < episodesList.length - 1) {
      logger.debug("📺 EN CRÉDITOS, IR AL SIGUIENTE");
      return {
        episode: episodesList[currentIndex + 1],
        resumeTime: 0,
        isNextEpisode: true,
      };
    }

    // Último episodio, continuar donde quedó
    return {
      episode: watchingEntry.currentEpisode,
      resumeTime: watchingEntry.progress,
      isNextEpisode: false,
    };
  }

  // Historial completo (opcional, para estadísticas)
  static async addToFullHistory(animeId, animeName, episodeNo, currentTime) {
    try {
      const history = await AsyncStorage.getItem(this.FULL_HISTORY_KEY);
      const fullHistory = history ? JSON.parse(history) : [];

      const historyEntry = {
        animeId,
        animeName,
        episodeNo,
        progress: currentTime, // ✅ USAR currentTime
        watchedAt: new Date().toISOString(),
      };

      fullHistory.unshift(historyEntry);

      // Mantener solo los últimos 100 registros
      const limitedHistory = fullHistory.slice(0, 100);

      await AsyncStorage.setItem(
        this.FULL_HISTORY_KEY,
        JSON.stringify(limitedHistory),
      );
    } catch (error) {
      logger.error("Error guardando historial completo:", error);
    }
  }

  static async getFullHistory() {
    try {
      const history = await AsyncStorage.getItem(this.FULL_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      return [];
    }
  }

  // Remover anime de "Viendo"
  static async removeFromWatching(animeId) {
    try {
      const watching = await this.getWatching();
      const filtered = watching.filter((item) => item.animeId !== animeId);
      await AsyncStorage.setItem(this.WATCHING_KEY, JSON.stringify(filtered));
      logger.debug('✅ Anime removido de "Viendo"');
    } catch (error) {
      logger.error('Error removiendo de "Viendo":', error);
    }
  }

  // Formatear tiempo para mostrar
  static formatWatchTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  // Formatear fecha
  static formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);

    if (diffHours < 1) {
      return "Hace unos minutos";
    } else if (diffHours < 24) {
      return `Hace ${Math.floor(diffHours)} horas`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // Método de compatibilidad para llamadas existentes
  static async addToHistory(
    animeId,
    animeName,
    episodeNumber,
    totalEpisodes = null,
    thumbnail = null, // ← NUEVO PARÁMETRO opcional
  ) {
    return this.updateWatching(
      animeId,
      animeName,
      episodeNumber,
      0,
      0,
      thumbnail,
    );
  }

  // ✅ MÉTODO DE DEBUG PARA VERIFICAR ASYNCSTORAGE
  static async debugStorage() {
    try {
      const watching = await AsyncStorage.getItem(this.WATCHING_KEY);
      const fullHistory = await AsyncStorage.getItem(this.FULL_HISTORY_KEY);

      logger.debug("🔍 DEBUG ASYNCSTORAGE:");
      logger.debug("   Watching data:", watching || "null");
      logger.debug("   Full history data:", fullHistory || "null");

      if (watching) {
        const parsed = JSON.parse(watching);
        logger.debug("   Parsed watching:", parsed.length, "items");
        logger.debug("   First item:", parsed[0] || "none");
      }

      return {
        watching: watching ? JSON.parse(watching) : null,
        fullHistory: fullHistory ? JSON.parse(fullHistory) : null,
      };
    } catch (error) {
      logger.error("❌ Error debugging storage:", error);
      return null;
    }
  }
}

export default HistoryService;
