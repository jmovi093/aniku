// styles/theme/typography.js
// Sistema de tipografía centralizado

const typography = {
  // 🎨 Familias de fuentes
  fontFamilies: {
    sans: "System", // Fuente del sistema
    serif: "serif",
    mono: "monospace",
    display: "System", // Para títulos
  },

  // 📏 Tamaños de fuente
  fontSizes: {
    xs: 10, // Extra pequeño
    sm: 12, // Pequeño
    base: 14, // Base/Normal
    md: 16, // Mediano
    lg: 18, // Grande
    xl: 20, // Extra grande
    "2xl": 24, // 2X grande
    "3xl": 28, // 3X grande
    "4xl": 32, // 4X grande
    "5xl": 36, // 5X grande
    "6xl": 48, // 6X grande
  },

  // ⚖️ Pesos de fuente
  fontWeights: {
    thin: "100",
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  },

  // 📐 Altura de línea
  lineHeights: {
    none: 1.0,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2.0,
  },

  // 🔤 Espaciado de letras
  letterSpacing: {
    tighter: "-0.5px",
    tight: "-0.25px",
    normal: "0px",
    wide: "0.25px",
    wider: "0.5px",
    widest: "1px",
  },

  // 📱 Escalas tipográficas predefinidas
  scales: {
    // 📰 Títulos y encabezados
    heading: {
      h1: {
        fontSize: 32,
        fontWeight: "700",
        lineHeight: 1.25,
        letterSpacing: "-0.5px",
      },
      h2: {
        fontSize: 28,
        fontWeight: "700",
        lineHeight: 1.25,
        letterSpacing: "-0.25px",
      },
      h3: {
        fontSize: 24,
        fontWeight: "600",
        lineHeight: 1.375,
        letterSpacing: "0px",
      },
      h4: {
        fontSize: 20,
        fontWeight: "600",
        lineHeight: 1.375,
        letterSpacing: "0px",
      },
      h5: {
        fontSize: 18,
        fontWeight: "600",
        lineHeight: 1.5,
        letterSpacing: "0px",
      },
      h6: {
        fontSize: 16,
        fontWeight: "600",
        lineHeight: 1.5,
        letterSpacing: "0px",
      },
    },

    // 📄 Texto de cuerpo
    body: {
      large: {
        fontSize: 18,
        fontWeight: "400",
        lineHeight: 1.625,
        letterSpacing: "0px",
      },
      normal: {
        fontSize: 16,
        fontWeight: "400",
        lineHeight: 1.5,
        letterSpacing: "0px",
      },
      small: {
        fontSize: 14,
        fontWeight: "400",
        lineHeight: 1.5,
        letterSpacing: "0px",
      },
      tiny: {
        fontSize: 12,
        fontWeight: "400",
        lineHeight: 1.375,
        letterSpacing: "0px",
      },
    },

    // 🏷️ Labels y etiquetas
    label: {
      large: {
        fontSize: 16,
        fontWeight: "500",
        lineHeight: 1.375,
        letterSpacing: "0px",
      },
      normal: {
        fontSize: 14,
        fontWeight: "500",
        lineHeight: 1.375,
        letterSpacing: "0px",
      },
      small: {
        fontSize: 12,
        fontWeight: "500",
        lineHeight: 1.25,
        letterSpacing: "0.25px",
      },
    },

    // 🔘 Botones
    button: {
      large: {
        fontSize: 18,
        fontWeight: "600",
        lineHeight: 1.25,
        letterSpacing: "0px",
      },
      normal: {
        fontSize: 16,
        fontWeight: "600",
        lineHeight: 1.25,
        letterSpacing: "0px",
      },
      small: {
        fontSize: 14,
        fontWeight: "600",
        lineHeight: 1.25,
        letterSpacing: "0.25px",
      },
    },

    // 📝 Inputs
    input: {
      large: {
        fontSize: 18,
        fontWeight: "400",
        lineHeight: 1.25,
        letterSpacing: "0px",
      },
      normal: {
        fontSize: 16,
        fontWeight: "400",
        lineHeight: 1.25,
        letterSpacing: "0px",
      },
      small: {
        fontSize: 14,
        fontWeight: "400",
        lineHeight: 1.25,
        letterSpacing: "0px",
      },
    },

    // 📊 Captions y metadata
    caption: {
      normal: {
        fontSize: 12,
        fontWeight: "400",
        lineHeight: 1.25,
        letterSpacing: "0.25px",
      },
      small: {
        fontSize: 10,
        fontWeight: "400",
        lineHeight: 1.25,
        letterSpacing: "0.5px",
      },
    },
  },
};

// 🛠️ Helper functions para tipografía
export const getTextStyle = (category, size = "normal") => {
  return typography.scales[category]?.[size] || typography.scales.body.normal;
};

export const createTextStyle = (
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing
) => {
  return {
    fontSize: typography.fontSizes[fontSize] || fontSize,
    fontWeight: typography.fontWeights[fontWeight] || fontWeight,
    lineHeight: typography.lineHeights[lineHeight] || lineHeight,
    letterSpacing: typography.letterSpacing[letterSpacing] || letterSpacing,
  };
};

export default typography;
