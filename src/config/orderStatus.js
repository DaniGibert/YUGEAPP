// ============================================================
// Yuge: Bestell-Status als Daten (CLAUDE.md §3.3, eine Quelle statt Kopien)
// Reihenfolge und Farb-Token je Status. Genutzt von StatusScreen (Tracker),
// KitchenScreen (Umschalter) und Header (Live-Punkt am Bestellstatus-Knopf).
// Die Farben sind Token-Namen aus theme.css (--color-<name>).
// ============================================================

export const STATUS_FLOW = ['aufgenommen', 'in_zubereitung', 'fertig'];

// Bewusst warme, dunkle Toene statt Gold/Amber: die Status-Farbe traegt auch
// die grosse Headline, und zwei aehnliche Gelbtoene waren dort kaum lesbar und
// nicht unterscheidbar. broth und finish sind bestehende Kategorie-Tokens.
export const STATUS_COLORS = {
  aufgenommen: 'broth',
  in_zubereitung: 'finish',
  fertig: 'success',
};
