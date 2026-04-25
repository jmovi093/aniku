// utils/animeDetailsUtils.js
// Funciones utilitarias para AnimeDetails components

/**
 * 🎨 FUNCIONES DE FORMATEO DE UI
 */

/**
 * Obtiene el color de estado según el tipo de estado del anime
 * @param {string} status - Estado del anime ("Completed", "Ongoing", etc.)
 * @returns {string} Color hexadecimal
 */
export const getStatusColor = (status) => {
  switch (status) {
    case "Completed":
      return "#28a745"; // Verde para completado
    case "Ongoing":
      return "#007bff"; // Azul para en emisión
    case "Upcoming":
      return "#ffc107"; // Amarillo para próximo
    case "Hiatus":
      return "#fd7e14"; // Naranja para en pausa
    case "Cancelled":
      return "#dc3545"; // Rojo para cancelado
    default:
      return "#6c757d"; // Gris para desconocido
  }
};

/**
 * Formatea el score del anime para mostrar
 * @param {number|string} score - Puntuación del anime
 * @returns {string} Score formateado
 */
export const formatScore = (score) => {
  if (!score || score === "N/A") return "N/A";
  const numScore = parseFloat(score);
  return isNaN(numScore) ? "N/A" : numScore.toFixed(1);
};

/**
 * Trunca texto largo con elipsis
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} Texto truncado
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
};

/**
 * Formatea el número de episodios para mostrar
 * @param {number|string} episodes - Número de episodios
 * @returns {string} Episodios formateados
 */
export const formatEpisodes = (episodes) => {
  if (!episodes || episodes === "Unknown") return "TBD";
  return episodes.toString();
};

/**
 * Formatea la duración de episodios
 * @param {number|string} duration - Duración en minutos
 * @returns {string} Duración formateada
 */
export const formatDuration = (duration) => {
  if (!duration || duration === "Unknown") return "N/A";
  const numDuration = parseInt(duration);
  if (isNaN(numDuration)) return "N/A";

  if (numDuration >= 60) {
    const hours = Math.floor(numDuration / 60);
    const minutes = numDuration % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${numDuration}m`;
};

/**
 * Formatea el año de estreno
 * @param {number|string} year - Año de estreno
 * @returns {string} Año formateado
 */
export const formatYear = (year) => {
  if (!year || year === "Unknown") return "TBD";
  return year.toString();
};

/**
 * 📊 FUNCIONES DE VALIDACIÓN Y VERIFICACIÓN
 */

/**
 * Valida si un anime tiene información completa
 * @param {Object} animeDetails - Detalles del anime
 * @returns {boolean} True si tiene información básica
 */
export const isAnimeDataComplete = (animeDetails) => {
  return !!(animeDetails && animeDetails.title && animeDetails.id);
};

/**
 * Verifica si un episodio está descargado
 * @param {number} episodeNumber - Número del episodio
 * @param {Array} downloadedEpisodes - Lista de episodios descargados
 * @returns {boolean} True si está descargado
 */
export const isEpisodeDownloaded = (episodeNumber, downloadedEpisodes) => {
  return downloadedEpisodes.some((ep) => ep.episode === episodeNumber);
};

/**
 * Verifica si hay episodios disponibles para descargar
 * @param {Array} episodes - Lista de episodios
 * @param {Array} downloadedEpisodes - Episodios ya descargados
 * @returns {boolean} True si hay episodios disponibles
 */
export const hasEpisodesToDownload = (episodes, downloadedEpisodes) => {
  if (!episodes || !Array.isArray(episodes)) return false;
  return episodes.some(
    (ep) => !isEpisodeDownloaded(ep.episode, downloadedEpisodes || [])
  );
};

/**
 * 🔄 FUNCIONES DE PROCESAMIENTO DE DATOS
 */

/**
 * Procesa géneros del anime para mostrar
 * @param {Array|string} genres - Géneros del anime
 * @returns {Array} Array de géneros procesados
 */
export const processGenres = (genres) => {
  if (!genres) return [];

  if (Array.isArray(genres)) {
    return genres.filter((genre) => genre && genre.trim() !== "");
  }

  if (typeof genres === "string") {
    return genres
      .split(",")
      .map((genre) => genre.trim())
      .filter((genre) => genre !== "");
  }

  return [];
};

/**
 * Procesa los episodios para generar lista numerada
 * @param {number} totalEpisodes - Total de episodios
 * @returns {Array} Array de objetos episodio
 */
export const generateEpisodesList = (totalEpisodes) => {
  if (!totalEpisodes || totalEpisodes <= 0) return [];

  const episodes = [];
  for (let i = 1; i <= totalEpisodes; i++) {
    episodes.push({
      episode: i,
      title: `Episodio ${i}`,
      id: `${i}`,
    });
  }
  return episodes;
};

/**
 * Calcula el progreso de descarga de episodios
 * @param {Array} downloadedEpisodes - Episodios descargados
 * @param {number} totalEpisodes - Total de episodios
 * @returns {Object} Objeto con progreso de descarga
 */
export const calculateDownloadProgress = (
  downloadedEpisodes,
  totalEpisodes
) => {
  const downloaded = downloadedEpisodes ? downloadedEpisodes.length : 0;
  const total = totalEpisodes || 0;
  const percentage = total > 0 ? Math.round((downloaded / total) * 100) : 0;

  return {
    downloaded,
    total,
    percentage,
    remaining: Math.max(0, total - downloaded),
  };
};

/**
 * 🎯 FUNCIONES DE ESTADO Y NAVEGACIÓN
 */

/**
 * Obtiene el texto de estado del episodio
 * @param {number} episodeNumber - Número del episodio
 * @param {Array} downloadedEpisodes - Episodios descargados
 * @param {boolean} isOffline - Si está en modo offline
 * @returns {string} Texto de estado
 */
export const getEpisodeStatusText = (
  episodeNumber,
  downloadedEpisodes,
  isOffline
) => {
  const isDownloaded = isEpisodeDownloaded(episodeNumber, downloadedEpisodes);

  if (isDownloaded) {
    return isOffline ? "Disponible offline" : "Descargado";
  }

  return isOffline ? "No disponible offline" : "";
};

/**
 * Verifica si un episodio puede reproducirse
 * @param {number} episodeNumber - Número del episodio
 * @param {Array} downloadedEpisodes - Episodios descargados
 * @param {boolean} isOffline - Si está en modo offline
 * @returns {boolean} True si puede reproducirse
 */
export const canPlayEpisode = (
  episodeNumber,
  downloadedEpisodes,
  isOffline
) => {
  if (!isOffline) return true; // Online: siempre se puede reproducir
  return isEpisodeDownloaded(episodeNumber, downloadedEpisodes);
};

/**
 * 📈 FUNCIONES DE ANÁLISIS Y ESTADÍSTICAS
 */

/**
 * Obtiene estadísticas de visualización del anime
 * @param {Object} animeDetails - Detalles del anime
 * @returns {Array} Array de estadísticas formateadas
 */
export const getAnimeStats = (animeDetails) => {
  const stats = [];

  if (animeDetails.episodes) {
    stats.push({
      label: "Episodios",
      value: formatEpisodes(animeDetails.episodes),
      key: "episodes",
    });
  }

  if (animeDetails.duration) {
    stats.push({
      label: "Duración",
      value: formatDuration(animeDetails.duration),
      key: "duration",
    });
  }

  if (animeDetails.year) {
    stats.push({
      label: "Año",
      value: formatYear(animeDetails.year),
      key: "year",
    });
  }

  if (animeDetails.score) {
    stats.push({
      label: "Score",
      value: formatScore(animeDetails.score),
      key: "score",
    });
  }

  return stats;
};

/**
 * 🔍 FUNCIONES DE BÚSQUEDA Y FILTRADO
 */

/**
 * Filtra episodios según criterios de búsqueda
 * @param {Array} episodes - Lista de episodios
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Array} Episodios filtrados
 */
export const filterEpisodes = (episodes, searchTerm) => {
  if (!searchTerm || !episodes) return episodes;

  const term = searchTerm.toLowerCase();
  return episodes.filter(
    (episode) =>
      episode.title?.toLowerCase().includes(term) ||
      episode.episode?.toString().includes(term)
  );
};

/**
 * Ordena episodios según criterio
 * @param {Array} episodes - Lista de episodios
 * @param {string} sortBy - Criterio de ordenamiento ('asc', 'desc')
 * @returns {Array} Episodios ordenados
 */
export const sortEpisodes = (episodes, sortBy = "asc") => {
  if (!episodes) return [];

  return [...episodes].sort((a, b) => {
    if (sortBy === "desc") {
      return b.episode - a.episode;
    }
    return a.episode - b.episode;
  });
};

/**
 * 🛠️ FUNCIONES DE CONFIGURACIÓN Y PREFERENCIAS
 */

/**
 * Aplica configuraciones de usuario a la visualización
 * @param {Object} userPreferences - Preferencias del usuario
 * @returns {Object} Configuración aplicada
 */
export const applyUserPreferences = (userPreferences = {}) => {
  return {
    autoPlay: userPreferences.autoPlay ?? false,
    downloadQuality: userPreferences.downloadQuality ?? "HD",
    skipIntro: userPreferences.skipIntro ?? false,
    showSkeletonLoader: userPreferences.showSkeletonLoader ?? true,
    episodesPerRow: userPreferences.episodesPerRow ?? 3,
    ...userPreferences,
  };
};

export default {
  // Funciones de formateo
  getStatusColor,
  formatScore,
  truncateText,
  formatEpisodes,
  formatDuration,
  formatYear,

  // Funciones de validación
  isAnimeDataComplete,
  isEpisodeDownloaded,
  hasEpisodesToDownload,

  // Funciones de procesamiento
  processGenres,
  generateEpisodesList,
  calculateDownloadProgress,

  // Funciones de estado
  getEpisodeStatusText,
  canPlayEpisode,

  // Funciones de análisis
  getAnimeStats,

  // Funciones de búsqueda
  filterEpisodes,
  sortEpisodes,

  // Funciones de configuración
  applyUserPreferences,
};
