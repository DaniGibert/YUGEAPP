import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { t } from '../i18n';

// DIE Auswahl-Karte der App (CLAUDE.md §4): Name, optionaler Preis-Text
// (fertig formatiert, z. B. "+3 €" oder "5 €"), „i"-Info mit Beschreibung,
// optionales Badge („Passt zur Brühe") und optionaler Footer (children,
// z. B. QuantityStepper). accent = Kategorie-Farb-Token des aktiven Schritts.
export default function OptionCard({
  name,
  desc,
  priceText = null,
  selected = false,
  accent,
  badge,
  onSelect,
  children,
}) {
  const [showInfo, setShowInfo] = useState(false);

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
        <p
          className="absolute inset-0 z-10 overflow-y-auto rounded-lg bg-surface/95 p-4 text-small text-ink-600"
          onClick={(e) => e.stopPropagation()}
        >
          {desc}
        </p>
      )}
    </div>
  );
}
