// ============================================================
// Yuge: globaler Store: Bau-Zustand der aktuellen Bowl + Warenkorb (Entwurf)
// Warenkorb (noch nicht bestellt) und Rechnung (bereits bestellt) bleiben
// getrennt (siehe CLAUDE.md §9). Die Rechnung lebt später hinter dataService.
// ============================================================

import { create } from 'zustand';
import {
  BOWL_BASE_PRICE,
  BROTHS,
  FINISH,
  NOODLES,
  NOODLE_FIRMNESS,
  PROTEINS,
  TOPPINGS,
  TOPPING_MAX,
} from '../config/menu';

const emptyBowl = () => ({
  broth: null,
  noodle: null,
  hardness: NOODLE_FIRMNESS.default,
  protein: null,
  toppings: {}, // { id: menge }, Summe ≤ TOPPING_MAX
  finish: Object.fromEntries(Object.entries(FINISH).map(([key, group]) => [key, group.default])),
});

export function toppingCount(toppings) {
  return Object.values(toppings).reduce((sum, qty) => sum + qty, 0);
}

export function cartTotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * (item.qty ?? 1), 0);
}

export function bowlPrice(bowl) {
  const protein = PROTEINS.find((p) => p.id === bowl.protein);
  return BOWL_BASE_PRICE + (protein?.price ?? 0);
}

// Anzeige-Chips: was liegt in der Bowl? (Szene + Übersicht nutzen dieselbe Liste)
export function bowlIngredients(bowl) {
  const find = (list, id) => list.find((o) => o.id === id);
  const chips = [];
  const broth = find(BROTHS, bowl.broth);
  if (broth) chips.push({ id: broth.id, name: broth.name });
  const noodle = find(NOODLES, bowl.noodle);
  if (noodle) chips.push({ id: noodle.id, name: `${noodle.name} (${bowl.hardness})` });
  const protein = find(PROTEINS, bowl.protein);
  if (protein && protein.id !== 'ohne') chips.push({ id: protein.id, name: protein.name });
  for (const [id, qty] of Object.entries(bowl.toppings)) {
    const topping = find(TOPPINGS, id);
    if (topping) chips.push({ id, name: `${qty}× ${topping.name}` });
  }
  return chips;
}

// Szenen-Zutaten für BowlScene/BowlThumbnail: EIN Eintrag pro Zutat (gruppiert,
// nicht mehr pro Instanz). Die Menge (qty) löst composeBowlItems zur Varianten-
// Leiter + Satelliten auf. Deterministische Reihenfolge (Menü-Ordnung) -> gleiche
// Auswahl ergibt immer dieselbe Komposition. Der stabile key `topping-${id}` hält
// das Haupt-Item über Mengenwechsel hinweg (ermöglicht den Mini-Plop).
export function bowlSceneIngredients(bowl) {
  const list = [];
  if (bowl.noodle) list.push({ key: `noodle-${bowl.noodle}`, id: bowl.noodle, category: 'noodle', qty: 1 });
  if (bowl.protein && bowl.protein !== 'ohne') {
    list.push({ key: `protein-${bowl.protein}`, id: bowl.protein, category: 'protein', qty: 1 });
  }
  for (const topping of TOPPINGS) {
    const qty = bowl.toppings[topping.id] ?? 0;
    if (qty > 0) list.push({ key: `topping-${topping.id}`, id: topping.id, category: 'topping', qty });
  }
  return list;
}

export const useOrderStore = create((set) => ({
  bowl: emptyBowl(),
  stepIndex: 0,
  maxStepIndex: 0, // wie weit der Gast schon war (für den Breadcrumb)
  // Warenkorb (Entwurf): Zeilen { key, type, name, price, qty, config?, refId?, variant? }
  cart: [],
  // Rechnung/Tab: bereits bestellte Runden (Spiegel der dataService-Antworten)
  orders: [],
  // Id der zuletzt abgeschickten Runde: der Status-Screen liest sie einmalig,
  // um die frisch bestellte Runde trotz Remount als "neu angekommen" zu
  // animieren (Slide-in, Gold-Glow, Summen-Ticker).
  lastPlacedOrderId: null,

  goToStep: (index) =>
    set((s) => ({ stepIndex: index, maxStepIndex: Math.max(s.maxStepIndex, index) })),

  selectOption: (field, id) => set((s) => ({ bowl: { ...s.bowl, [field]: id } })),

  setHardness: (value) => set((s) => ({ bowl: { ...s.bowl, hardness: value } })),

  setFinish: (group, value) =>
    set((s) => ({ bowl: { ...s.bowl, finish: { ...s.bowl.finish, [group]: value } } })),

  setToppingQty: (id, qty) =>
    set((s) => {
      const next = { ...s.bowl.toppings };
      const clamped = Math.max(0, qty);
      if (clamped === 0) delete next[id];
      else next[id] = clamped;
      if (toppingCount(next) > TOPPING_MAX) return s; // Regel: Summe aller Mengen ≤ 4
      return { bowl: { ...s.bowl, toppings: next } };
    }),

  resetBowl: () => set({ bowl: emptyBowl(), stepIndex: 0, maxStepIndex: 0 }),

  // Fertige Bowl in den Warenkorb (Entwurf) legen und den Builder leeren.
  // Struktur wie order_items in CLAUDE.md §6: type, name, price, config.
  addBowlToCart: () =>
    set((s) => {
      const broth = BROTHS.find((b) => b.id === s.bowl.broth);
      const item = {
        key: crypto.randomUUID(),
        type: 'bowl',
        name: `${broth?.name ?? 'Ramen'}-Bowl`,
        price: bowlPrice(s.bowl),
        qty: 1,
        config: s.bowl,
      };
      return { cart: [...s.cart, item], bowl: emptyBowl(), stepIndex: 0, maxStepIndex: 0 };
    }),

  // Getränk/Beilage: eine Warenkorb-Zeile je Artikel+Variante, Menge änderbar.
  setCartLineQty: (type, menuItem, variant, qty) =>
    set((s) => {
      const key = `${type}:${menuItem.id}:${variant ?? ''}`;
      const existing = s.cart.find((i) => i.key === key);
      if (qty <= 0) return { cart: s.cart.filter((i) => i.key !== key) };
      if (existing) {
        return { cart: s.cart.map((i) => (i.key === key ? { ...i, qty } : i)) };
      }
      const line = {
        key,
        type,
        refId: menuItem.id,
        variant: variant ?? null,
        name: variant ? `${menuItem.name} (${variant})` : menuItem.name,
        price: menuItem.price,
        qty,
      };
      return { cart: [...s.cart, line] };
    }),

  // Menge einer bestehenden Warenkorb-Zeile ändern (0 = Zeile entfernen).
  changeCartQty: (key, qty) =>
    set((s) => {
      if (qty <= 0) return { cart: s.cart.filter((i) => i.key !== key) };
      return { cart: s.cart.map((i) => (i.key === key ? { ...i, qty } : i)) };
    }),

  removeCartItem: (key) => set((s) => ({ cart: s.cart.filter((i) => i.key !== key) })),

  // Nach erfolgreichem Bestellen (dataService): Runde in die Rechnung, Warenkorb
  // leeren und die Id für die Ankunfts-Animation im Status-Screen merken.
  orderPlaced: (order) =>
    set((s) => ({ orders: [...s.orders, order], cart: [], lastPlacedOrderId: order.id })),

  // One-shot: der Status-Screen konsumiert die Id, sobald die Runde wirklich
  // geliefert und animiert wurde; erneutes Öffnen animiert dann nicht wieder.
  consumeLastPlacedOrderId: () => set({ lastPlacedOrderId: null }),
}));
