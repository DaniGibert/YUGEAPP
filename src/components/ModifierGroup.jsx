// Segmentierte Auswahl (Nudelhärte, Schärfe, Getränke|Beilagen, …): genau
// eine Option aktiv. Optionen sind Strings oder { value, label }.
// accent = Farb-Token für den aktiven Zustand (CLAUDE.md §5).
export default function ModifierGroup({ label, options, value, onChange, accent }) {
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-small font-semibold text-ink-600">{label}</span>}
      <div className="flex gap-1 rounded-md border border-line bg-surface p-1">
        {items.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={(e) => {
                e.stopPropagation();
                onChange?.(option.value);
              }}
              className={`flex-1 cursor-pointer rounded-sm px-3 py-2 text-small font-semibold transition-colors ${
                active ? 'text-surface' : 'text-ink-600 hover:text-ink-900'
              }`}
              style={active ? { backgroundColor: `var(--color-${accent})` } : undefined}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
