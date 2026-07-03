import { useId } from 'react';

// Prozedurale Schüssel in Draufsicht: Platzhalter, bis echte Assets da sind
// (CLAUDE.md §7: fehlende Assets → prozeduraler Platzhalter, nichts crasht).
// liquidColor: CSS-Farbwert (Token-Var); null = leere Schüssel.
export default function BowlGraphic({ liquidColor = null, liquidOpacity = 1, className = '' }) {
  const gradientId = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={gradientId}>
          <stop offset="55%" stopColor="var(--color-surface)" />
          <stop offset="100%" stopColor="var(--color-line)" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="var(--color-surface)" stroke="var(--color-line)" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="88" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" opacity="0.5" />
      <circle cx="100" cy="100" r="82" fill={`url(#${gradientId})`} />
      {liquidColor ? (
        <circle cx="100" cy="100" r="74" fill={liquidColor} opacity={liquidOpacity} />
      ) : (
        <circle cx="100" cy="100" r="42" fill="var(--color-bg)" stroke="var(--color-line)" strokeWidth="1" />
      )}
    </svg>
  );
}
