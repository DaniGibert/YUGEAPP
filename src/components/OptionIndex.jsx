import { getLanguage, t } from '../i18n';

// Feststehende Textübersicht aller Optionen eines Bau-Schritts (CLAUDE.md §2 Baustein).
// Zeigt neben der scrollbaren Karten-Liste, welche Optionen es gibt, hebt die
// gerade im Sichtbereich liegenden in der Schritt-Akzentfarbe hervor und markiert
// gewählte Optionen mit einem gefüllten Punkt. Ein Klick springt zur Karte.
//
// Props:
// - options:     Array aus { id, name }
// - visibleIds:  Set/Array der aktuell sichtbaren Options-IDs
// - selectedIds: Array/Set der gewählten Options-IDs
// - accent:      Schritt-Akzent-Token (z. B. 'topping') -> var(--color-<accent>)
// - onJump(id):  springt zur zugehörigen Karte
export default function OptionIndex({ options, visibleIds, selectedIds, accent, onJump }) {
  const visible = visibleIds instanceof Set ? visibleIds : new Set(visibleIds);
  const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);

  return (
    <nav
      aria-label={t('builder.optionIndex')}
      lang={getLanguage()}
      className="flex w-32 shrink-0 flex-col gap-1 overflow-y-auto border-l border-line pl-3"
    >
      {options.map((option) => {
        const isVisible = visible.has(option.id);
        const isSelected = selected.has(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onJump?.(option.id)}
            className={`flex items-center gap-2 border-l-2 py-1 pl-2 text-left text-small transition-colors ${
              isVisible ? 'font-medium' : 'border-transparent text-ink-400'
            }`}
            style={
              isVisible
                ? { borderColor: `var(--color-${accent})`, color: `var(--color-${accent})` }
                : undefined
            }
          >
            <span className="min-w-0 break-words hyphens-auto">{option.name}</span>
            {isSelected && (
              <span
                aria-hidden="true"
                className="ml-auto inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400"
                style={{ backgroundColor: `var(--color-${accent})` }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
