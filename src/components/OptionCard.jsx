import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { t } from '../i18n';

// DIE Auswahl-Karte der App (CLAUDE.md §4): optionales Produktbild, Name,
// optionaler Preis-Text (fertig formatiert, z. B. "+3 €" oder "5 €"), „i"-Info
// mit Beschreibung, optionales Badge („Passt zur Brühe") und optionaler Footer
// (children, z. B. QuantityStepper). accent = Kategorie-Farb-Token des Schritts.
// image = Pfad zur PNG (Konvention: /assets/<kategorie>/<id>.png). Fehlt die
// Datei, wird der Bildbereich still ausgeblendet, nichts crasht.
// visual = alternativ ein fertiger React-Knoten für den Bildbereich
// (z. B. BowlThumbnail bei Brühen: Brühe IN der Schüssel statt flacher Scheibe).
export default function OptionCard({
  name,
  desc,
  image = null,
  visual = null,
  priceText = null,
  selected = false,
  accent,
  badge,
  onSelect,
  children,
}) {
  const [showInfo, setShowInfo] = useState(false);
  const [imageMissing, setImageMissing] = useState(false);

  return (
    <div
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
        selected ? '' : 'border-line hover:border-ink-400'
      }`}
      style={selected ? { borderColor: `var(--color-${accent})` } : undefined}
    >
      {visual ? (
        <div className="flex h-24 items-center justify-center">{visual}</div>
      ) : (
        image &&
        !imageMissing && (
          <div className="flex h-24 items-center justify-center">
            <img
              src={image}
              alt=""
              loading="lazy"
              className="h-full w-auto max-w-full object-contain"
              onError={() => setImageMissing(true)}
            />
          </div>
        )
      )}

      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 break-words text-body font-semibold text-ink-900">{name}</span>
        {desc && (
          <button
            type="button"
            aria-label={showInfo ? t('builder.infoHide') : t('builder.infoShow')}
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo((v) => !v);
            }}
            className="cursor-pointer text-ink-400 transition-colors hover:text-ink-900"
          >
            {showInfo ? <X size={18} /> : <Info size={18} />}
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

      {showInfo && (
        // Tipp irgendwo auf die Beschreibung schließt sie wieder (schließt NICHT
        // die Auswahl aus, daher stopPropagation). Das X liegt im Overlay selbst,
        // damit es klickbar bleibt und nicht vom Overlay verdeckt wird.
        <div
          className="absolute inset-0 z-10 flex flex-col rounded-lg bg-surface/97 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo(false);
          }}
        >
          <button
            type="button"
            aria-label={t('builder.infoHide')}
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo(false);
            }}
            className="mb-2 self-end text-ink-400 transition-colors hover:text-ink-900"
          >
            <X size={18} />
          </button>
          <p className="min-h-0 overflow-y-auto break-words text-small text-ink-600">{desc}</p>
        </div>
      )}
    </div>
  );
}
