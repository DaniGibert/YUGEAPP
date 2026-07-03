import { Fragment } from 'react';
import { ChevronRight } from 'lucide-react';
import { STEPS } from '../config/steps';
import { t } from '../i18n';

// Bau-Navigation: Brühe › Nudeln › … Der aktive Schritt trägt seine
// Kategorie-Farbe (CLAUDE.md §5), besuchte Schritte sind anklickbar.
export default function Breadcrumb({ currentIndex, maxVisitedIndex, onSelect }) {
  return (
    <nav className="flex flex-wrap items-center gap-1">
      {STEPS.map((step, index) => {
        const active = index === currentIndex;
        const reachable = index <= maxVisitedIndex;
        return (
          <Fragment key={step.id}>
            {index > 0 && <ChevronRight size={14} className="text-ink-400" aria-hidden="true" />}
            <button
              type="button"
              disabled={!reachable}
              aria-current={active ? 'step' : undefined}
              onClick={() => onSelect?.(index)}
              className={`rounded-sm px-3 py-1.5 text-small font-semibold transition-colors ${
                active
                  ? 'text-surface'
                  : reachable
                    ? 'cursor-pointer text-ink-600 hover:text-ink-900'
                    : 'text-ink-400 opacity-60'
              }`}
              style={active ? { backgroundColor: `var(--color-${step.accent})` } : undefined}
            >
              {t(`steps.${step.id}`)}
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
