/* =============================================================================
 * Anrichte-Karte: fester Anker pro Zutaten-id statt Goldener-Winkel-Spirale.
 * Jede Zutat landet an ihrem kuratierten Platz (ANCHORS), Mengen 3/4 an
 * deterministischen Satelliten-Offsets. Kein Index, kein Zufall -> gleiche
 * Auswahl ergibt immer dieselbe, komponierte Schüssel; Bestands-Zutaten
 * bewegen sich nicht, wenn etwas dazukommt (Position = f(id), nicht f(index)).
 * Alle Positions-/Look-Werte leben in sceneConfig.js (CLAUDE.md §3.5).
 * ===========================================================================*/
import { ANCHORS, ANCHOR_DEFAULT, SCAT_CY, SCAT_RY } from "../config/sceneConfig.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * @param {string} id         Zutaten-id (Anker-Schlüssel)
 * @param {string} category   "noodle" | "protein" | "topping" (Fallback-Anker)
 * @param {number|null} satellite  Satelliten-Index (null = Haupt-Item am Anker)
 * @param {{x?:number,y?:number,scale?:number}|null} override  Anker live überschreiben
 *        (nur fürs Scene-Lab; ohne Override identisch zum Normalbetrieb). Wirkt auf
 *        die Anker-Basis, Satelliten-Offsets kommen wie gehabt oben drauf.
 * @returns {{x,y,frontness,scale,layer,float}}
 */
export function placeIngredient(id, category, satellite = null, override = null) {
  const anchor = ANCHORS[id] ?? ANCHOR_DEFAULT[category] ?? ANCHOR_DEFAULT.topping;
  let x = override?.x ?? anchor.x;
  let y = override?.y ?? anchor.y;
  let s = override?.scale ?? anchor.scale ?? 1;

  if (satellite != null) {
    const sats = anchor.satellites ?? ANCHOR_DEFAULT.topping.satellites;
    const sat = sats[satellite % sats.length];
    x += sat.dx;
    y += sat.dy;
    s *= sat.scale;
  }

  // frontness: 1 = vorne (unten am Bildschirm, kleines y), 0 = hinten (oben).
  // Ein Wert steuert Position, renderOrder und Perspektiv-Scale konsistent.
  const frontness = clamp((SCAT_CY + SCAT_RY - y) / (2 * SCAT_RY), 0, 1);
  const scale = (1 + frontness * 0.16) * s; // vorne etwas größer (Perspektive)

  return { x, y, frontness, scale, layer: anchor.layer ?? null, float: anchor.float ?? 1 };
}
