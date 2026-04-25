// styles/theme/shadows.js
// Sistema de sombras centralizado para dar profundidad

const shadows = {
  // 📱 Sombras base para iOS/Android
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  // 🌫️ Sombras sutiles
  xs: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },

  sm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },

  // 🌑 Sombras normales
  md: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },

  lg: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },

  // ⚫ Sombras pronunciadas
  xl: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 12,
  },

  "2xl": {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.51,
    shadowRadius: 13.16,
    elevation: 20,
  },

  // 🎨 Sombras especializadas para componentes
  components: {
    // 🃏 Cards
    card: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },

    // 🔘 Botones
    button: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2.62,
      elevation: 4,
    },

    buttonPressed: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },

    // 🪟 Modales
    modal: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 20.0,
      elevation: 25,
    },

    // 🎬 Player
    player: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.44,
      shadowRadius: 10.32,
      elevation: 16,
    },

    // 📱 Bottom Sheet
    bottomSheet: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 5.0,
      elevation: 10,
    },

    // 🔍 Search Bar
    searchBar: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
      elevation: 3,
    },

    // 🎯 Floating Action Button
    fab: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 6.68,
      elevation: 11,
    },

    // 📄 Header
    header: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3.0,
      elevation: 4,
    },
  },

  // 🌈 Sombras de color (para acentos especiales)
  colored: {
    primary: {
      shadowColor: "#007bff",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },

    success: {
      shadowColor: "#28a745",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },

    warning: {
      shadowColor: "#ffc107",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },

    error: {
      shadowColor: "#dc3545",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
};

// 🛠️ Helper functions para sombras
export const getShadow = (size) => {
  return shadows[size] || shadows.none;
};

export const getComponentShadow = (component) => {
  return shadows.components[component] || shadows.md;
};

export const getColoredShadow = (color) => {
  return shadows.colored[color] || shadows.md;
};

// 🎨 Crear sombra custom
export const createShadow = (
  color = "#000000",
  offset = { width: 0, height: 2 },
  opacity = 0.25,
  radius = 3.84,
  elevation = 5
) => {
  return {
    shadowColor: color,
    shadowOffset: offset,
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: elevation,
  };
};

export default shadows;
