import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, Plus, X } from 'lucide-react';
import BowlThumbnail from './BowlThumbnail';
import { DietIcon } from './OptionCard';
import { ALLERGENS, BROTHS, NOODLES, PROTEINS, TOPPINGS } from '../config/menu';
import { bowlPrice } from '../state/orderStore';
import { t, tx } from '../i18n';

// Die verwendeten Zutaten einer Empfehlung aus dem Menü sammeln (eine Datenquelle,
// config/menu). Reihenfolge = Bau-Reihenfolge: Brühe, Nudeln, Protein, Toppings.
// Protein „ohne" wird ausgelassen. Toppings mit Menge > 1 tragen ihre Menge mit.
function usedIngredients(config) {
  const items = [];
  const broth = BROTHS.find((b) => b.id === config.broth);
  if (broth) items.push({ item: broth, qty: 1 });
  const noodle = NOODLES.find((n) => n.id === config.noodle);
  if (noodle) items.push({ item: noodle, qty: 1 });
  const protein = PROTEINS.find((p) => p.id === config.protein);
  if (protein && protein.id !== 'ohne') items.push({ item: protein, qty: 1 });
  for (const [id, qty] of Object.entries(config.toppings)) {
    const topping = TOPPINGS.find((tp) => tp.id === id);
    if (topping) items.push({ item: topping, qty });
  }
  return items;
}

// Namen der Zutaten (Toppings mit Menge > 1 als „Name × n").
function ingredientNames(config) {
  return usedIngredients(config).map(({ item, qty }) =>
    qty > 1 ? `${tx(item.name)} × ${qty}` : tx(item.name),
  );
}

// Diet und Allergene der ganzen Bowl aus den Zutaten ableiten (Daten, nicht raten):
// - diet: alle Zutaten vegan -> vegan; alle mindestens vegetarisch -> vegetarisch;
//   sonst kein Icon.
// - allergens: Vereinigungsmenge aller Zutaten-Allergene (deterministische
//   Reihenfolge über Bau-Reihenfolge + Allergen-Reihenfolge der Zutat).
function bowlDietAndAllergens(config) {
  const items = usedIngredients(config).map(({ item }) => item);
  let diet = null;
  if (items.length > 0) {
    if (items.every((it) => it.diet === 'vegan')) diet = 'vegan';
    else if (items.every((it) => it.diet === 'vegan' || it.diet === 'vegetarian'))
      diet = 'vegetarian';
  }
  const allergenSet = new Set();
  for (const it of items) for (const a of it.allergens || []) allergenSet.add(a);
  return { diet, allergens: [...allergenSet] };
}

// Empfehlungs-Karte auf dem Start-Screen (CLAUDE.md §8): Schnellstart für
// Unentschlossene. Tipp auf die Karte lädt die fertige Bowl (onSelect). Ein „i"
// öffnet ein Popover mit der vollständigen Zutatenliste (in Ruhe durchlesen) —
// selbes Popover-Muster wie OptionCard. Die Karte ist bewusst ein div
// role="button" (kein <button>), damit der Info-<button> gültig darin sitzt.
export default function RecommendationCard({ bowl, onSelect }) {
  const [showInfo, setShowInfo] = useState(false);
  const [infoPos, setInfoPos] = useState(null); // {top,left,width,maxHeight,originX,originY}
  const cardRef = useRef(null);

  const names = ingredientNames(bowl.config);
  const { diet, allergens } = bowlDietAndAllergens(bowl.config);

  // Popover schließen: Escape, oder wenn gescrollt/Fenster verändert wird (sonst
  // bliebe es an seiner alten, jetzt falschen Position hängen). Wie OptionCard.
  useEffect(() => {
    if (!showInfo) return undefined;
    const close = () => setShowInfo(false);
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [showInfo]);

  // Popover an der Karte verankern: feste, lesbare Breite, in den sichtbaren
  // Bereich geklemmt (px, damit es mit der rem-Skalierung nicht ausreißt). Wie
  // OptionCard.openInfo.
  function openInfo(e) {
    e.stopPropagation();
    const rect = cardRef.current.getBoundingClientRect();
    const btn = e.currentTarget.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(320, window.innerWidth - margin * 2);
    const left = Math.max(
      margin,
      Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - margin),
    );
    const top = Math.max(margin, Math.min(rect.top, window.innerHeight * 0.5));
    const originX = btn.left + btn.width / 2 - left;
    const originY = btn.top + btn.height / 2 - top;
    setInfoPos({ top, left, width, maxHeight: window.innerHeight - top - margin, originX, originY });
    setShowInfo(true);
  }

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className="group flex cursor-pointer flex-col gap-3 rounded-lg border-2 border-line bg-surface p-4 text-left transition-colors hover:border-ink-400 active:scale-[0.98]"
    >
      {/* Bild groß und zentriert (Muster der OptionCard: Bild zuerst) */}
      <div className="flex items-center justify-center">
        <BowlThumbnail config={bowl.config} className="w-28" />
      </div>

      {/* Name mit leisem Diet-Icon (wenn vegetarisch/vegan) */}
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 break-words font-display text-body text-ink-900">
          {tx(bowl.name)}
        </span>
        <DietIcon diet={diet} size={15} />
      </span>

      {/* Ruhige Fußzeile: „i"-Info, Preis (leiser als früher), Plus-Kreis.
          mt-auto drückt sie an den unteren Kartenrand: die Karten werden im Grid
          auf gleiche Höhe gestreckt, so sitzt die Fußzeile bei ein- und
          zweizeiligem Namen gleich hoch (Info und Preis bündig über beide Karten). */}
      <div className="mt-auto flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={t('builder.infoShow')}
          onClick={openInfo}
          className="shrink-0 cursor-pointer text-ink-400 transition-colors hover:text-ink-900"
        >
          <Info size={18} />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-sans text-body-lg font-bold text-ink-900">{bowlPrice(bowl.config)} €</span>
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-400 transition-colors group-hover:border-primary group-hover:text-primary"
          >
            <Plus size={18} />
          </span>
        </div>
      </div>

      {showInfo &&
        infoPos &&
        // Popover per Portal an document.body, verankert an der Karte. Zeigt den
        // Bowl-Namen als Überschrift plus die vollständige Zutatenliste, jede
        // Zutat in eigener Zeile. Transparenter Fänger schließt bei Klick daneben;
        // stopPropagation, damit der Klick nicht die Bowl lädt.
        createPortal(
          <div
            className="fixed inset-0 z-50"
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: 'fixed',
                top: infoPos.top,
                left: infoPos.left,
                width: infoPos.width,
                maxHeight: infoPos.maxHeight,
                transformOrigin: `${infoPos.originX}px ${infoPos.originY}px`,
              }}
              className="animate-popover-in flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 break-words text-h2 text-ink-900">{tx(bowl.name)}</h3>
                <button
                  type="button"
                  aria-label={t('builder.infoHide')}
                  onClick={() => setShowInfo(false)}
                  className="shrink-0 cursor-pointer text-ink-400 transition-colors hover:text-ink-900"
                >
                  <X size={20} />
                </button>
              </div>
              <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                {names.map((name, index) => (
                  <li key={index} className="break-words text-body text-ink-600">
                    {name}
                  </li>
                ))}
              </ul>
              {/* Dieselben zwei ruhigen Zeilen wie im OptionCard-Popover, wenn die
                  Daten es hergeben: Diet-Angabe und „Enthält: …" (Allergene). */}
              <DietIcon diet={diet} size={14} withLabel />
              {allergens.length > 0 && (
                <span className="break-words text-caption text-ink-400">
                  {t('card.contains', {
                    list: allergens.map((id) => tx(ALLERGENS[id])).join(', '),
                  })}
                </span>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
