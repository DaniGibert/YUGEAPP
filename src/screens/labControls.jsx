// ============================================================================
// Gemeinsame Dev-Tool-Bausteine (Scene-Lab UND Design-Lab).
// Wiederkehrende Bausteine leben einmal (CLAUDE.md 3.2): Slider, Toggle und
// ValueBox wurden aus SceneLabScreen hierher gezogen, damit das Design-Lab
// dieselben Regler/Buttons nutzt. Unveraendert uebernommen, nur als benannte
// Exports. Panel-eigene Farben laufen ueber Token-Utilities; dynamische
// Farbwerte (Toggle-Aktivfarbe) inline per var(), weil dynamische
// Tailwind-Klassen der Scanner nicht erzeugt.
// ============================================================================

export function Slider({ label, value, min, max, step = 1, defaultValue, onChange }) {
  const changed = defaultValue !== undefined && value !== defaultValue;
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between gap-2 text-small font-semibold text-ink-900">
        <span>{label}</span>
        <span className="flex items-center gap-1.5">
          {changed && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              title={`Zurück auf ${defaultValue}`}
              aria-label={`${label} zurücksetzen`}
              className="text-body leading-none text-ink-400 hover:text-primary"
            >
              ↺
            </button>
          )}
          <span className="font-display text-body tabular-nums text-primary">{value}</span>
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

export function Toggle({ on, onClick, children, color = 'nori' }) {
  // Aktive Farbe über Token-CSS-Variablen inline (dynamische Tailwind-Klassen
  // wie bg-${color} würde der Scanner nicht erzeugen).
  const style = on
    ? { backgroundColor: `var(--color-${color})`, borderColor: `var(--color-${color})`, color: 'var(--color-surface)' }
    : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`rounded-md border px-3 py-1 text-small transition-colors ${
        on ? '' : 'border-line text-ink-600 hover:border-ink-400'
      }`}
    >
      {children}
    </button>
  );
}

export function ValueBox({ snippet, onReset }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-small font-semibold text-ink-900">Werte</span>
      <pre className="max-h-40 overflow-auto rounded-md bg-bg p-3 text-caption text-ink-600">{snippet}</pre>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(snippet)}
          className="rounded-md bg-ink-900 px-3 py-1.5 text-small font-semibold text-surface"
        >
          Kopieren
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-line px-3 py-1.5 text-small font-semibold text-ink-600 hover:border-ink-400"
        >
          Zurücksetzen
        </button>
      </div>
    </div>
  );
}
