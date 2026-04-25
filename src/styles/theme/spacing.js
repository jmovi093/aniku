// styles/theme/spacing.js
// Sistema de espaciado centralizado

const spacing = {
  // 📏 Escala base (múltiplos de 4)
  0: 0, // 0px
  1: 4, // 4px
  2: 8, // 8px
  3: 12, // 12px
  4: 16, // 16px
  5: 20, // 20px
  6: 24, // 24px
  7: 28, // 28px
  8: 32, // 32px
  9: 36, // 36px
  10: 40, // 40px
  11: 44, // 44px
  12: 48, // 48px
  14: 56, // 56px
  16: 64, // 64px
  20: 80, // 80px
  24: 96, // 96px
  28: 112, // 112px
  32: 128, // 128px
  36: 144, // 144px
  40: 160, // 160px
  44: 176, // 176px
  48: 192, // 192px
  52: 208, // 208px
  56: 224, // 224px
  60: 240, // 240px
  64: 256, // 256px
  72: 288, // 288px
  80: 320, // 320px
  96: 384, // 384px

  // 🏷️ Espaciados semánticos
  semantic: {
    // 📱 Componentes UI
    buttonPaddingX: 16, // Padding horizontal botones
    buttonPaddingY: 12, // Padding vertical botones
    inputPaddingX: 16, // Padding horizontal inputs
    inputPaddingY: 12, // Padding vertical inputs
    cardPadding: 16, // Padding cards
    modalPadding: 24, // Padding modales

    // 📄 Contenido
    screenPaddingX: 20, // Padding horizontal pantallas
    screenPaddingY: 16, // Padding vertical pantallas
    sectionSpacing: 24, // Espaciado entre secciones
    itemSpacing: 16, // Espaciado entre items

    // 📝 Texto
    paragraphSpacing: 16, // Espaciado entre párrafos
    lineSpacing: 8, // Espaciado entre líneas relacionadas

    // 🎨 Layout
    headerHeight: 56, // Altura del header
    tabBarHeight: 65, // Altura del tab bar
    statusBarHeight: 44, // Altura estimada status bar
  },

  // 📐 Patrones de espaciado comunes
  patterns: {
    // 🔘 Botones
    button: {
      small: { paddingX: 12, paddingY: 8 },
      normal: { paddingX: 16, paddingY: 12 },
      large: { paddingX: 24, paddingY: 16 },
    },

    // 🃏 Cards
    card: {
      compact: { padding: 12 },
      normal: { padding: 16 },
      comfortable: { padding: 24 },
    },

    // 📱 Screens
    screen: {
      tight: { paddingX: 12, paddingY: 8 },
      normal: { paddingX: 20, paddingY: 16 },
      comfortable: { paddingX: 24, paddingY: 20 },
    },

    // 📝 Inputs
    input: {
      small: { paddingX: 12, paddingY: 8 },
      normal: { paddingX: 16, paddingY: 12 },
      large: { paddingX: 20, paddingY: 16 },
    },

    // 📑 Listas
    list: {
      compact: { itemSpacing: 8, sectionSpacing: 16 },
      normal: { itemSpacing: 12, sectionSpacing: 24 },
      comfortable: { itemSpacing: 16, sectionSpacing: 32 },
    },
  },

  // 📏 Grid system
  grid: {
    columns: 12,
    gutterWidth: 16,
    marginWidth: 20,
    breakpoints: {
      xs: 0,
      sm: 576,
      md: 768,
      lg: 992,
      xl: 1200,
    },
  },

  // 🎨 Radios de borde
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    xl: 16,
    xxl: 20,
    full: 9999,
  },

  // 🏗️ Layout específico para pantallas
  layout: {
    headerTop: 20, // Espaciado superior del header
    horizontal: 20, // Padding horizontal general
    bottomSafe: 20, // Espaciado inferior seguro
    vertical: 16, // Espaciado vertical general
  },
};

// 🛠️ Helper functions para espaciado
export const getSpacing = (size) => {
  if (typeof size === "number") {
    return spacing[size] || size;
  }
  return spacing.semantic[size] || 0;
};

export const getPatternSpacing = (component, variant = "normal") => {
  return (
    spacing.patterns[component]?.[variant] || spacing.patterns.screen.normal
  );
};

export const createPadding = (vertical, horizontal) => {
  return {
    paddingVertical: getSpacing(vertical),
    paddingHorizontal: getSpacing(horizontal),
  };
};

export const createMargin = (vertical, horizontal) => {
  return {
    marginVertical: getSpacing(vertical),
    marginHorizontal: getSpacing(horizontal),
  };
};

export default spacing;
