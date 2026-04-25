// styles/index.js
// Exportaciones centralizadas del sistema de estilos

// 🎨 Theme
import colorsDefault from "./theme/colors";
import typographyDefault from "./theme/typography";
import spacingDefault from "./theme/spacing";
import shadowsDefault from "./theme/shadows";
import commonStylesDefault from "./common/commonStyles";

export const colors = colorsDefault;
export const typography = typographyDefault;
export const spacing = spacingDefault;
export const shadows = shadowsDefault;
export const commonStyles = commonStylesDefault;

// 🎨 Helper functions
export { getStatusColor, getEpisodeColor } from "./theme/colors";
export { getTextStyle, createTextStyle } from "./theme/typography";
export {
  getSpacing,
  getPatternSpacing,
  createPadding,
  createMargin,
} from "./theme/spacing";
export {
  getShadow,
  getComponentShadow,
  getColoredShadow,
  createShadow,
} from "./theme/shadows";
