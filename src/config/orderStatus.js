// ============================================================
// Yuge: Bestell-Status als Daten (CLAUDE.md §3.3, eine Quelle statt Kopien)
// Reihenfolge und Farb-Token je Status. Genutzt von StatusScreen (Tracker),
// KitchenScreen (Umschalter) und Header (Live-Punkt am Bestellstatus-Knopf).
// Die Farben sind Token-Namen aus theme.css (--color-<name>).
// ============================================================

export const STATUS_FLOW = ['aufgenommen', 'in_zubereitung', 'fertig'];

export const STATUS_COLORS = {
  aufgenommen: 'gold',
  in_zubereitung: 'warning',
  fertig: 'success',
};
