import { useState, useEffect } from 'react';
import { DRINKS, SIDES } from '../config/menu';

// Produktbild eines Getränks/einer Beilage, analog zu BowlThumbnail bei Bowls.
// Zeigt bei Varianten das Bild der aktiven Variante und fällt aufs Produktbild
// zurück; fehlt auch das, wird nichts gerendert (kein kaputtes Icon).

// Varianten-Name -> Dateiname-Baustein (klein, Umlaute aufgelöst),
// z. B. "Gedämpft" -> "gedaempft".
export function variantSlug(value) {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Bildpfade: Varianten-Bild zuerst (image), sonst Produktbild (fallback).
// Konvention: /assets/<type>/<id>[-<variante>].png
export function menuImagePaths({ type, id, variant }) {
  const base = `/assets/${type}/${id}.png`;
  return {
    image: variant ? `/assets/${type}/${id}-${variantSlug(variant)}.png` : base,
    fallback: variant ? base : null,
  };
}

// type/id/variante aus einer Warenkorb-Zeile ODER bestellten Position ableiten.
// Warenkorb hat type+refId+variant; bestellte Positionen nur den Namen
// (z. B. "Softdrink (Cola)"), daraus lesen wir Produkt und Variante.
function resolve(item) {
  if (item.type === 'drink' || item.type === 'side') {
    const list = item.type === 'drink' ? DRINKS : SIDES;
    if (item.refId && list.some((m) => m.id === item.refId)) {
      return { type: item.type, id: item.refId, variant: item.variant ?? null };
    }
  }
  const baseName = item.name.replace(/ \(.*\)$/, '');
  const variant = item.name.match(/ \((.*)\)$/)?.[1] ?? null;
  const drink = DRINKS.find((m) => m.name === baseName);
  if (drink) return { type: 'drink', id: drink.id, variant };
  const side = SIDES.find((m) => m.name === baseName);
  if (side) return { type: 'side', id: side.id, variant };
  return null;
}

export default function ItemThumbnail({ item, className = '' }) {
  const resolved = resolve(item);
  const paths = resolved ? menuImagePaths(resolved) : null;
  const [src, setSrc] = useState(paths?.image ?? null);
  const [hidden, setHidden] = useState(false);

  // Bild-/Variantenwechsel: Quelle zurücksetzen und wieder versuchen.
  useEffect(() => {
    setSrc(paths?.image ?? null);
    setHidden(false);
  }, [paths?.image]);

  if (!paths || !src || hidden) return null;

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => {
        if (paths.fallback && src !== paths.fallback) setSrc(paths.fallback);
        else setHidden(true);
      }}
      className={`object-contain ${className}`}
    />
  );
}
