// Segmentierte Auswahl (Nudelhärte, Schärfe, Getränke|Beilagen, …): genau
// eine Option aktiv. Optionen sind Strings oder { value, label }.
// accent = Farb-Token für den aktiven Zustand (CLAUDE.md §5).
// Der aktive Bereich ist eine einzige, absolut positionierte Pill, die per
// transform sanft zum neu gewählten Segment gleitet, statt zu springen.
export default function ModifierGroup({ label, options, value, onChange, accent }) {
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const index = items.findIndex((o) => o.value === value);
  const count = items.length;
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-small font-semibold text-ink-600">{label}</span>}
      <div className="rounded-md border border-line bg-surface p-1">
        <div className="relative flex w-full gap-1">
          {index >= 0 && (
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 rounded-sm transition-transform duration-200 ease-out motion-reduce:transition-none"
              style={{
                width: `calc((100% - ${(count - 1) * 0.25}rem) / ${count})`,
                transform: `translateX(calc(${index * 100}% + ${index * 0.25}rem))`,
                backgroundColor: `var(--color-${accent})`,
              }}
            />
          )}
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
                className={`relative flex-1 cursor-pointer rounded-sm px-3 py-2 text-small font-semibold transition-colors ${
                  active ? 'text-surface' : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
