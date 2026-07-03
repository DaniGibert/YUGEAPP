// ============================================================
// Yuge: die 5 Bau-Schritte als Daten (CLAUDE.md §3.3)
// Schritt umsortieren/umbenennen/ergänzen = hier ändern, nicht in Komponenten.
//
// - id:     zugleich Feldname im Bau-Zustand (orderStore) + i18n-Schlüssel steps.<id>
// - accent: Kategorie-Farb-Token aus theme.css (--color-<accent>)
// - type:   'single' (Einfach-Auswahl) | 'quantity' (Mengen mit Limit) | 'modifiers' (nur Regler)
// ============================================================

import { BROTHS, NOODLES, NOODLE_FIRMNESS, PROTEINS, TOPPINGS, TOPPING_MAX, FINISH } from './menu';

export const STEPS = [
  { id: 'broth', accent: 'broth', type: 'single', options: BROTHS },
  { id: 'noodle', accent: 'noodle', type: 'single', options: NOODLES, modifiers: { hardness: NOODLE_FIRMNESS } },
  { id: 'protein', accent: 'protein', type: 'single', options: PROTEINS },
  { id: 'topping', accent: 'topping', type: 'quantity', options: TOPPINGS, max: TOPPING_MAX },
  { id: 'finish', accent: 'finish', type: 'modifiers', modifiers: FINISH },
];
