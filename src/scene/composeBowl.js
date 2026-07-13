/* =============================================================================
 * Gemeinsame Ableitung: gruppierte Zutaten-Liste [{ key, id, category, qty }]
 * -> platzierte Instanzen (Position, Ebene, Asset, Größe). Die Menge (qty) wird
 * HIER zur Varianten-Leiter + Satelliten aufgelöst (nicht im Store), damit beide
 * Renderpfade denselben Codepfad teilen: die WebGL-Szene (BowlScene) UND das
 * leichte DOM-Thumbnail (BowlThumbnail) -> gleiche Platzierung, gleiche Assets,
 * gleiche Fallback-Leiter, ein Look.
 * ===========================================================================*/
import { NOODLES, PROTEINS, TOPPINGS } from '../config/menu';
import { placeIngredient } from './placement';

const OPTIONS_BY_CATEGORY = { noodle: NOODLES, protein: PROTEINS, topping: TOPPINGS };

// Kategorie-Grundebene, falls der Anker keine eigene Ebene vorgibt (Nori: 'back').
const layerFor = (category, anchorLayer) =>
  anchorLayer ?? (category === 'noodle' ? 'noodle' : 'surface');

// Varianten-Leiter: höchster deklarierter sceneVariants-Wert <= qty. Deklarativ
// aus menu.js (KEIN Laufzeit-Probing: composeBowl ist synchron und läuft in zwei
// Renderpfaden, ein Fehler-Cache würde divergieren).
function pickVariant(variants, qty) {
  let best = 1;
  for (const v of variants) if (v <= qty && v > best) best = v;
  return best;
}

// overrides (optional, nur fürs Scene-Lab): { [id]: { x?, y?, scale?, size? } } —
// überschreibt Anker/Größe einer Zutat live; ohne overrides identisch zum Normalbetrieb.
export function composeBowlItems(ingredients, overrides = null) {
  const items = [];
  for (const ing of ingredients) {
    const option = OPTIONS_BY_CATEGORY[ing.category]?.find((o) => o.id === ing.id);
    if (!option) continue;
    const qty = ing.qty ?? 1;
    const ov = overrides?.[ing.id] ?? null;
    const size = ov?.size ?? option.size;

    const baseSrc = `/assets/${ing.category}/${ing.id}.png`;
    const variant = pickVariant(option.sceneVariants ?? [1], qty);
    const mainSrc = variant > 1 ? `/assets/${ing.category}/${ing.id}-x${variant}.png` : baseSrc;

    // Haupt-Item am Anker (stabiler key -> ermöglicht den Mini-Plop bei Mengenwechsel).
    const main = placeIngredient(ing.id, ing.category, null, ov);
    items.push({
      key: ing.key,
      layer: layerFor(ing.category, main.layer),
      option: {
        src: mainSrc,
        // Fallback-Leiter: fehlende Variante -> Basis-Asset -> Farb-Blob (sceneColor).
        fallbackSrc: variant > 1 ? baseSrc : null,
        color: option.sceneColor,
        size,
      },
      x: main.x,
      y: main.y,
      scale: main.scale,
      frontness: main.frontness,
      float: main.float,
    });

    // Satelliten für die restliche Menge (immer Basis-Asset; eigener key -> fällt neu,
    // Reduktion unmountet nur den höchsten, ohne Bestands-Satelliten zu bewegen).
    for (let n = 0; n < qty - variant; n++) {
      const p = placeIngredient(ing.id, ing.category, n, ov);
      items.push({
        key: `${ing.key}-sat-${n}`,
        layer: layerFor(ing.category, p.layer),
        option: { src: baseSrc, fallbackSrc: null, color: option.sceneColor, size },
        x: p.x,
        y: p.y,
        scale: p.scale,
        frontness: p.frontness,
        float: p.float,
      });
    }
  }
  return items;
}
