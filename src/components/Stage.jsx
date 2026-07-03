// Gemeinsamer App-Rahmen: füllt das Browserfenster komplett (fluides Layout,
// für Querformat optimiert, kein Letterboxing), siehe CLAUDE.md §3.6.
export default function Stage({ children }) {
  return <div className="flex h-dvh w-full flex-col overflow-hidden bg-bg">{children}</div>;
}
