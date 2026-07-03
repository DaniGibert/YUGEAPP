/* =============================================================================
 * Gemeinsame Ableitung: semantische Zutaten-Liste [{ key, id, category }]
 * -> platzierte Instanzen (Position, Ebene, Asset, Größe).
 * Wird von der WebGL-Szene (BowlScene) UND vom leichten DOM-Thumbnail
 * (BowlThumbnail) genutzt: gleiche Platzierung, gleiche Assets, ein Look.
 * ===========================================================================*/
import { NOODLES, PROTEINS, TOPPINGS } from '../config/menu';
import { placeIngredient } from './placement';

const OPTIONS_BY_CATEGORY = { noodle: NOODLES, protein: PROTEINS, topping: TOPPINGS };

export function composeBowlItems(ingredients) {
  const counts = {};
  return ingredients
    .map((ing) => {
      const option = OPTIONS_BY_CATEGORY[ing.category]?.find((o) => o.id === ing.id);
      if (!option) return null;
      const index = counts[ing.category] ?? 0;
      counts[ing.category] = index + 1;
      return {
        key: ing.key,
        layer: ing.category === 'noodle' ? 'noodle' : 'surface',
        option: {
          src: `/assets/${ing.category}/${ing.id}.png`,
          color: option.sceneColor,
          size: option.size,
        },
        ...placeIngredient(ing.category, index),
      };
    })
    .filter(Boolean);
}
