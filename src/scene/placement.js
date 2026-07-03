/* =============================================================================
 * Organische Platzierung per Goldener-Winkel-Spirale (Phyllotaxis).
 * Komponiert & deterministisch statt zufällig, die Schüssel sieht jedes Mal
 * ausgewogen aus. Kategorie steuert das Radius-Band (Zone) auf der Streu-Ellipse.
 * ===========================================================================*/
import { SCAT_CX, SCAT_CY, SCAT_RX, SCAT_RY } from "../config/sceneConfig.js";

const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // ~137.5°

// Radius-Band [innen, außen] (Anteil der Streu-Ellipse) + Winkel-Offset je Kategorie
const ZONES = {
  noodle: { band: [0.0, 0.5], offset: 0.0 },
  protein: { band: [0.22, 0.62], offset: 1.2 },
  topping: { band: [0.34, 1.0], offset: 2.4 },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * @param {string} category  z.B. "noodle" | "protein" | "topping"
 * @param {number} index     wievielte Zutat dieser Kategorie (0-basiert)
 * @param {number} spread    Erwartungswert für gleichmäßige Verteilung (Tuning)
 * @returns {{x,y,frontness,scale}}
 */
export function placeIngredient(category, index, spread = 6) {
  const zone = ZONES[category] || { band: [0.0, 1.0], offset: 0.0 };
  const t = clamp((index + 0.5) / spread, 0, 1);
  const rNorm = Math.sqrt(t); // gleichmäßige Flächenfüllung von innen nach außen
  const r = zone.band[0] + rNorm * (zone.band[1] - zone.band[0]);
  const angle = index * GOLDEN + zone.offset;

  const x = SCAT_CX + Math.cos(angle) * r * SCAT_RX;
  const y = SCAT_CY + Math.sin(angle) * r * SCAT_RY;

  // frontness: 1 = vorne (unten am Bildschirm), 0 = hinten (oben)
  const frontness = clamp((SCAT_CY + SCAT_RY - y) / (2 * SCAT_RY), 0, 1);
  const scale = 1 + frontness * 0.16; // vorne etwas größer (Perspektive)

  return { x, y, frontness, scale };
}
