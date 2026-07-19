// Gemeinsamer App-Rahmen: füllt das Browserfenster komplett (fluides Layout,
// für Querformat optimiert, kein Letterboxing), siehe CLAUDE.md §3.6.
// app-stage haelt die sicheren Bereiche frei (theme.css): index.html setzt
// viewport-fit=cover, die App zeichnet also bis unter Dynamic Island und runde
// Ecken. Ohne die Einrueckung klebt der Inhalt auf dem iPhone quer am Rand.
export default function Stage({ children }) {
  return (
    <div className="app-stage flex h-dvh w-full flex-col overflow-hidden bg-bg">{children}</div>
  );
}
