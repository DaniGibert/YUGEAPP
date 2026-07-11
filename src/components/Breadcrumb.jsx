import { Fragment } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { STEPS } from '../config/steps';
import { t } from '../i18n';

// Bau-Navigation: Brühe › Nudeln › … Der aktive Schritt trägt seine
// Kategorie-Farbe (CLAUDE.md §5), besuchte Schritte sind anklickbar. Erledigte
// Schritte zeigen einen dezenten Haken; noch offene Pflichtschritte (single)
// einen hohlen Punkt, damit der Gast sieht, wo noch eine Wahl fehlt. Der Marker
// erbt die Textfarbe (currentColor), passt sich also jedem Zustand an.
export default function Breadcrumb({ currentIndex, maxVisitedIndex, completed = [], onSelect }) {
  return (
    <nav className="flex flex-wrap items-center gap-1">
      {STEPS.map((step, index) => {
        const active = index === currentIndex;
        const reachable = index <= maxVisitedIndex;
        const done = completed[index];
        const required = step.type === 'single';
        return (
          <Fragment key={step.id}>
            {index > 0 && <ChevronRight size={14} className="text-ink-400" aria-hidden="true" />}
            <button
              type="button"
              disabled={!reachable}
              aria-current={active ? 'step' : undefined}
              onClick={() => onSelect?.(index)}
              className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-small font-semibold transition-colors ${
                active
                  ? 'text-surface'
                  : reachable
                    ? 'cursor-pointer text-ink-600 hover:text-ink-900'
                    : 'text-ink-400 opacity-60'
              }`}
              style={active ? { backgroundColor: `var(--color-${step.accent})` } : undefined}
            >
              {done ? (
                <Check size={13} strokeWidth={3} aria-hidden="true" />
              ) : required ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-full border-2 border-current opacity-40"
                />
              ) : null}
              {t(`steps.${step.id}`)}
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
