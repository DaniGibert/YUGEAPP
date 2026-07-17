import { useState, useEffect } from 'react';
import { DRINKS, SIDES } from '../config/menu';

// Produktbild eines Getränks/einer Beilage, analog zu BowlThumbnail bei Bowls.
// Zeigt bei Varianten das Bild der aktiven Variante und fällt aufs Produktbild
// zurück; fehlt auch das, wird nichts gerendert (kein kaputtes Icon).

// Varianten-Text -> Dateiname-Baustein (klein, Umlaute aufgelöst), z. B.
// "Gedämpft" -> "gedaempft". Nur noch für den Alt-Daten-Fallback (bestellte
// Positionen ohne refId/variant im config-JSON): dort steht die Variante als
// deutscher Text im Namen, und dieser Slug entspricht genau der Varianten-ID.
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
// Konvention: /assets/<type>/<id>[-<variantId>].png — `variant` ist jetzt die
// Varianten-ID (== Datei-Slug), kein Text mehr.
export function menuImagePaths({ type, id, variant }) {
  const base = `/assets/${type}/${id}.png`;
  return {
    image: variant ? `/assets/${type}/${id}-${variant}.png` : base,
    fallback: variant ? base : null,
  };
}

// type/id/variante(ID) aus einer Warenkorb-Zeile ODER bestellten Position ableiten.
// Bevorzugt die Referenzen (Warenkorb: refId/variant direkt; bestellte Position:
// config.refId/config.variant). Fallback für Alt-Datensätze (nur der deutsche
// Name, z. B. "Softdrink (Cola)"): Produkt über de/en-Namen matchen, Varianten-ID
// aus dem deutschen Varianten-Text über variantSlug ableiten.
function resolve(item) {
  if (item.type === 'drink' || item.type === 'side') {
    const list = item.type === 'drink' ? DRINKS : SIDES;
    const refId = item.config?.refId ?? item.refId ?? null;
    if (refId && list.some((m) => m.id === refId)) {
      const variant = item.config?.variant ?? item.variant ?? null;
      return { type: item.type, id: refId, variant };
    }
  }
  if (typeof item.name !== 'string') return null;
  const baseName = item.name.replace(/ \(.*\)$/, '');
  const variantText = item.name.match(/ \((.*)\)$/)?.[1] ?? null;
  const variant = variantText ? variantSlug(variantText) : null;
  const drink = DRINKS.find((m) => m.name.de === baseName || m.name.en === baseName);
  if (drink) return { type: 'drink', id: drink.id, variant };
  const side = SIDES.find((m) => m.name.de === baseName || m.name.en === baseName);
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
