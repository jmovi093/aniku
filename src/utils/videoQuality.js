// utils/videoQuality.js
// Elección de la calidad por defecto al abrir un episodio.

/** "1080p" → 1080 · "720" → 720 · "auto"/null → null */
export function parseQuality(value) {
  if (value === null || value === undefined) return null;
  const match = String(value).match(/(\d{3,4})/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Devuelve el índice del enlace que mejor coincide con la calidad preferida.
 *
 * Reglas (en orden):
 *   1. coincidencia exacta con la preferida (ej. 720p);
 *   2. la mejor que esté POR DEBAJO de la preferida (mejor quedarse corto que
 *      forzar 1080p en un móvil con datos);
 *   3. la más baja disponible por encima;
 *   4. índice 0.
 *
 * Con `preferred = "auto"` (o vacío) devuelve 0, que es la mejor calidad porque
 * los enlaces vienen ordenados de mayor a menor.
 *
 * @param {Array<{quality?: string}>} links
 * @param {string} preferred  ej. "720p" | "auto"
 * @returns {number} índice dentro de `links`
 */
export function pickPreferredQualityIndex(links, preferred) {
  if (!Array.isArray(links) || links.length === 0) return 0;

  const target = parseQuality(preferred);
  if (!target) return 0;

  const heights = links.map((link) => parseQuality(link?.quality));

  const exact = heights.indexOf(target);
  if (exact !== -1) return exact;

  let bestBelow = -1;
  let bestBelowValue = -Infinity;
  let bestAbove = -1;
  let bestAboveValue = Infinity;

  heights.forEach((height, index) => {
    if (height === null) return;
    if (height < target && height > bestBelowValue) {
      bestBelowValue = height;
      bestBelow = index;
    } else if (height > target && height < bestAboveValue) {
      bestAboveValue = height;
      bestAbove = index;
    }
  });

  if (bestBelow !== -1) return bestBelow;
  if (bestAbove !== -1) return bestAbove;
  return 0;
}
