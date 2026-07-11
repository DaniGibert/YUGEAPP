import { Plus } from 'lucide-react';

// Gestrichelte "Hinzufügen"-Karte (CLAUDE.md §3.2, ein Baustein überall):
// signalisiert "hier passt noch was rein" und konkurriert nicht mit der
// Haupt-Aktion. Genutzt im Warenkorb ("Noch ein Ramen") und in der Rechnung
// auf dem Status-Screen ("+ Nächste Runde", hält die Rundenliste sichtbar offen).
export default function AddCard({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface p-4 text-body font-semibold text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
    >
      <Plus size={18} aria-hidden="true" />
      {label}
    </button>
  );
}
