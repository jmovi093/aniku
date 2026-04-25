// styles/theme/colors.js
// Sistema de colores centralizado para toda la aplicación

const colors = {
  // 🎨 Colores primarios
  primary: {
    50: "#E3F2FD",
    100: "#BBDEFB",
    200: "#90CAF9",
    300: "#64B5F6",
    400: "#42A5F5",
    500: "#007bff", // Color principal
    600: "#1E88E5",
    700: "#1976D2",
    800: "#1565C0",
    900: "#0D47A1",
  },

  // 🌫️ Escala de grises
  gray: {
    50: "#FAFAFA",
    100: "#F5F5F5",
    200: "#EEEEEE",
    300: "#E0E0E0",
    400: "#BDBDBD",
    500: "#9E9E9E",
    600: "#757575",
    700: "#616161",
    800: "#424242",
    900: "#212121",
  },

  // 🌑 Backgrounds (tema oscuro)
  background: {
    primary: "#1a1a1a", // Fondo principal
    secondary: "#2a2a2a", // Fondo secundario (cards)
    tertiary: "#333333", // Fondo terciario (inputs)
    modal: "rgba(0, 0, 0, 0.8)", // Fondo modal
  },

  // 📝 Colores de texto
  text: {
    primary: "#ffffff", // Texto principal
    secondary: "#cccccc", // Texto secundario
    muted: "#888888", // Texto apagado
    disabled: "#666666", // Texto deshabilitado
    inverse: "#000000", // Texto inverso
  },

  // 🚦 Estados de la aplicación
  status: {
    success: "#28a745", // Verde - Éxito
    warning: "#ffc107", // Amarillo - Advertencia
    error: "#dc3545", // Rojo - Error
    info: "#007bff", // Azul - Información
  },

  // 📺 Estados específicos de anime
  anime: {
    completed: "#28a745", // Verde - Completado
    ongoing: "#007bff", // Azul - En emisión
    upcoming: "#ffc107", // Amarillo - Próximo
    hiatus: "#fd7e14", // Naranja - En pausa
    cancelled: "#dc3545", // Rojo - Cancelado
    unknown: "#6c757d", // Gris - Desconocido
  },

  // 🎬 Estados de episodios
  episode: {
    available: "#007bff", // Azul - Disponible
    downloaded: "#28a745", // Verde - Descargado
    downloading: "#ffc107", // Amarillo - Descargando
    unavailable: "#6c757d", // Gris - No disponible
    error: "#dc3545", // Rojo - Error
  },

  // 🔲 Bordes y separadores
  border: {
    light: "#333333", // Borde claro
    medium: "#444444", // Borde medio
    dark: "#555555", // Borde oscuro
    focus: "#007bff", // Borde de foco
  },

  // 🌈 Overlays y efectos
  overlay: {
    light: "rgba(255, 255, 255, 0.1)",
    medium: "rgba(255, 255, 255, 0.2)",
    dark: "rgba(0, 0, 0, 0.3)",
    backdrop: "rgba(0, 0, 0, 0.5)",
  },

  // 🎯 Transparencias útiles
  transparent: {
    clear: "transparent",
    white10: "rgba(255, 255, 255, 0.1)",
    white20: "rgba(255, 255, 255, 0.2)",
    black10: "rgba(0, 0, 0, 0.1)",
    black20: "rgba(0, 0, 0, 0.2)",
    black50: "rgba(0, 0, 0, 0.5)",
  },
};

// 🎨 Helper functions para colores
export const getStatusColor = (status) => {
  const statusMap = {
    Completed: colors.anime.completed,
    Ongoing: colors.anime.ongoing,
    Upcoming: colors.anime.upcoming,
    Hiatus: colors.anime.hiatus,
    Cancelled: colors.anime.cancelled,
    Unknown: colors.anime.unknown,
  };

  return statusMap[status] || colors.anime.unknown;
};

export const getEpisodeColor = (state) => {
  const stateMap = {
    available: colors.episode.available,
    downloaded: colors.episode.downloaded,
    downloading: colors.episode.downloading,
    unavailable: colors.episode.unavailable,
    error: colors.episode.error,
  };

  return stateMap[state] || colors.episode.unavailable;
};

export default colors;
