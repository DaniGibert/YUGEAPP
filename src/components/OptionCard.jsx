import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info, X, Vegan, Leaf } from 'lucide-react';
import { ALLERGENS } from '../config/menu';
import { t, tx } from '../i18n';

// Diet-Feld (menu.js) -> ruhiges Icon + i18n-Label. vegan impliziert vegetarisch,
// darum reicht das eine Feld; kein Diet-Feld = kein Icon (Fleisch/Fisch).
const DIET_META = {
  vegan: { Icon: Vegan, labelKey: 'card.vegan' },
  vegetarian: { Icon: Leaf, labelKey: 'card.vegetarian' },
};

// Wiederverwendbarer Diet-Baustein (CLAUDE.md §3.2): leises Icon in text-success,
// gilt für OptionCard und RecommendationCard. Ohne diet rendert es nichts.
// withLabel = false: nur Icon (neben dem Namen auf der Karte, als role=img mit
// aria-label). withLabel = true: Icon plus sichtbares Label als ruhige Zeile
// (im Info-Popover). Kein diet -> null (Fleisch/Fisch).
export function DietIcon({ diet, size = 15, withLabel = false }) {
  const meta = diet ? DIET_META[diet] : null;
  if (!meta) return null;
  const { Icon, labelKey } = meta;
  const label = t(labelKey);
  if (withLabel) {
    return (
      <span className="flex items-center gap-1.5 text-small text-ink-400">
        <Icon size={size} className="shrink-0 text-success" aria-hidden="true" />
        {label}
      </span>
    );
  }
  return (
    <span role="img" aria-label={label} title={label} className="shrink-0 text-success">
      <Icon size={size} aria-hidden="true" />
    </span>
  );
}

// DIE Auswahl-Karte der App (CLAUDE.md §4): optionales Produktbild, Name,
// optionaler Preis-Text (fertig formatiert, z. B. "+3 €" oder "5 €"), „i"-Info
// mit Beschreibung, optionales Badge („Passt zur Brühe") und optionaler Footer
// (children, z. B. QuantityStepper). accent = Kategorie-Farb-Token des Schritts.
// image = Pfad zur PNG (Konvention: /assets/<kategorie>/<id>.png). Fehlt die
// Datei, wird der Bildbereich still ausgeblendet, nichts crasht.
// fallbackImage = Ausweich-PNG, falls `image` fehlt (z. B. Produktbild, wenn
// das Varianten-Bild noch nicht existiert). Fehlt auch das, wird ausgeblendet.
// visual = alternativ ein fertiger React-Knoten für den Bildbereich
// (z. B. BowlThumbnail bei Brühen: Brühe IN der Schüssel statt flacher Scheibe).
export default function OptionCard({
  name,
  desc,
  diet = null,
  allergens = null,
  image = null,
  fallbackImage = null,
  visual = null,
  priceText = null,
  selected = false,
  accent,
  badge,
  onSelect,
  children,
  className = '',
  // Ausgegraut, wenn die Karte gerade nicht dazugewaehlt werden kann (Topping-
  // Limit erreicht, Karte selbst noch bei 0). Nutzt das etablierte opacity-40-
  // Muster von Button/QuantityStepper. Bewusst KLICKBAR (kein pointer-events-
  // none): der Tipp soll das Pillen-Feedback ausloesen koennen und das "i"-Info-
  // Popover erreichbar bleiben (portalt an document.body, voll deckend).
  dimmed = false,
  // Höhe des Bildbereichs; Default passt zu den Builder-Karten. Getränke/
  // Beilagen zeigen ihr Produktbild größer (z. B. "h-36").
  imageClassName = 'h-24',
}) {
  const [showInfo, setShowInfo] = useState(false);
  const [infoPos, setInfoPos] = useState(null); // {top,left,width,maxHeight} des Info-Popovers
  const cardRef = useRef(null);
  const [src, setSrc] = useState(image);
  const [imageHidden, setImageHidden] = useState(false);
  const hasAllergens = Array.isArray(allergens) && allergens.length > 0;

  // Bild-/Variantenwechsel: Quelle zurücksetzen und wieder versuchen. Ist der
  // Bildbereich gerade ausgeblendet (kein Bild vorhanden), wird das neue Bild
  // erst unsichtbar vorgeladen und nur bei Erfolg wieder eingeblendet, sonst
  // springt die Karte beim Variantenwechsel kurz auf und wieder zu.
  useEffect(() => {
    if (!imageHidden) {
      setSrc(image);
      return undefined;
    }
    if (!image) return undefined;
    let active = true;
    const show = (goodSrc) => {
      if (!active) return;
      setSrc(goodSrc);
      setImageHidden(false);
    };
    const probe = new Image();
    probe.onload = () => show(image);
    probe.onerror = () => {
      if (!fallbackImage) return;
      const probeFallback = new Image();
      probeFallback.onload = () => show(fallbackImage);
      probeFallback.src = fallbackImage;
    };
    probe.src = image;
    return () => {
      active = false;
    };
    // imageHidden bewusst nicht in den Deps: entscheidend ist der Zustand zum
    // Zeitpunkt des Bildwechsels, nicht jede spätere Ein-/Ausblendung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);

  function handleImageError() {
    if (fallbackImage && src !== fallbackImage) {
      setSrc(fallbackImage); // Varianten-Bild fehlt: aufs Produktbild zurückfallen
    } else {
      setImageHidden(true); // auch das fehlt: Bildbereich still ausblenden
    }
  }

  // Info-Popover schließen: Escape, oder wenn gescrollt/Fenster verändert wird
  // (sonst bliebe es an seiner alten, jetzt falschen Position hängen).
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

  // Info-Popover am angeklickten Item verankern: feste, lesbare Breite, in den
  // sichtbaren Bereich geklemmt. Breite/Position in px, damit sie mit der
  // rem-Skalierung auf kleinen Geräten nicht auseinanderlaufen.
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
    // Ursprung der Aufskalier-Animation = Mitte des „i", relativ zur Popover-Ecke.
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
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={`relative flex min-w-0 cursor-pointer flex-col justify-between gap-3 rounded-lg border-2 bg-surface p-4 text-left transition-colors ${
        selected ? '' : dimmed ? 'border-line' : 'border-line hover:border-ink-400'
      } ${dimmed ? 'opacity-40' : ''} ${className}`}
      style={selected ? { borderColor: `var(--color-${accent})` } : undefined}
    >
      {visual ? (
        <div className={`flex items-center justify-center ${imageClassName}`}>{visual}</div>
      ) : (
        image &&
        src &&
        !imageHidden && (
          <div className={`flex items-center justify-center ${imageClassName}`}>
            <img
              src={src}
              alt=""
              loading="lazy"
              className="h-full w-auto max-w-full object-contain"
              onError={handleImageError}
            />
          </div>
        )
      )}

      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 break-words font-display text-body text-ink-900">{name}</span>
          <DietIcon diet={diet} size={15} />
        </span>
        {desc && (
          <button
            type="button"
            aria-label={t('builder.infoShow')}
            onClick={openInfo}
            className="cursor-pointer text-ink-400 transition-colors hover:text-ink-900"
          >
            <Info size={18} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {badge ? (
          <span
            className="rounded-sm px-2 py-0.5 text-caption font-semibold text-surface"
            style={{ backgroundColor: `var(--color-${accent})` }}
          >
            {badge}
          </span>
        ) : (
          <span />
        )}
        {priceText && <span className="text-small font-semibold text-ink-600">{priceText}</span>}
      </div>

      {children}

      {showInfo &&
        infoPos &&
        // Popover per Portal an document.body, verankert am angeklickten Item
        // (kein Container sperrt es ein, keine bildschirmfüllende Fläche). Zeigt
        // Item-Name als Überschrift plus Beschreibung. Der transparente Fänger
        // schließt bei Klick daneben; stopPropagation, damit der Klick nicht die
        // Auswahl der Karte auslöst.
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
              className="animate-popover-in flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 break-words text-h2 text-ink-900">{name}</h3>
                <button
                  type="button"
                  aria-label={t('builder.infoHide')}
                  onClick={() => setShowInfo(false)}
                  className="shrink-0 cursor-pointer text-ink-400 transition-colors hover:text-ink-900"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="min-h-0 flex-1 overflow-y-auto break-words text-body text-ink-600">
                {desc}
              </p>
              <DietIcon diet={diet} size={14} withLabel />
              {hasAllergens && (
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
