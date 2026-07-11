// Aufsteigender CSS-Dampf (drei versetzte Schwaden), das DOM-Pendant zum
// Szenen-Dampf (CLAUDE.md §7). Genutzt am Start (über der leeren Schüssel)
// und im Status-Hero (über der bestellten Bowl, sobald die Küche kocht).
// className positioniert den Wrapper, puffClassName steuert die Schwaden-Größe.
// Bei reduced motion bleiben die Schwaden unsichtbar (Grundzustand opacity-0,
// Animation aus) — Dampf ist reine Stimmung, keine Information.
export default function SteamPuffs({ className = '', puffClassName = 'h-14 w-3' }) {
  return (
    <span aria-hidden="true" className={`pointer-events-none flex justify-center gap-5 ${className}`}>
      {[0, 0.9, 1.8].map((delay) => (
        <span
          key={delay}
          className={`animate-steam rounded-full bg-line opacity-0 blur-sm motion-reduce:animate-none ${puffClassName}`}
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  );
}
