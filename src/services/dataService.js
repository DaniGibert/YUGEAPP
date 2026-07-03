// ============================================================
// Yuge: EINZIGE Datenschicht (CLAUDE.md §3.4)
// Alle Lese-/Schreibzugriffe (Bestellungen, Status) laufen hier durch;
// keine Komponente importiert den Supabase-Client direkt.
// Ohne Supabase-Konfiguration (.env) läuft ein lokaler Demo-Modus.
// ============================================================

import { supabase } from './supabaseClient';

const SESSION_KEY = 'yuge-session-id';

// Tisch-/Geräte-Kennung: einmal pro Gerät erzeugt, bleibt über Reloads erhalten.
export function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function isDemoMode() {
  return supabase === null;
}

// Warenkorb-Positionen → order_items-Zeilen. Mengen werden in Einzelzeilen
// aufgelöst (Schema aus CLAUDE.md §6 hat bewusst keine Mengen-Spalte).
function toOrderItems(cartItems) {
  return cartItems.flatMap((item) =>
    Array.from({ length: item.qty ?? 1 }, () => ({
      type: item.type,
      name: item.name,
      price: item.price,
      config: item.config ?? null,
    })),
  );
}

// Demo-Modus: Bestellungen leben nur im Speicher dieses Tabs.
const demoOrders = [];

// Schickt die aktuelle Runde ab. Rückgabe: die angelegte Bestellung
// ({ id, session_id, status, total, paid, created_at, items }).
export async function submitOrder(cartItems, total) {
  const sessionId = getSessionId();

  if (isDemoMode()) {
    const order = {
      id: `demo-${demoOrders.length + 1}`,
      session_id: sessionId,
      status: 'aufgenommen',
      total,
      paid: false,
      created_at: new Date().toISOString(),
      items: toOrderItems(cartItems),
    };
    demoOrders.push(order);
    return order;
  }

  const { data: order, error } = await supabase
    .from('orders')
    .insert({ session_id: sessionId, status: 'aufgenommen', total, paid: false })
    .select()
    .single();
  if (error) throw error;

  const rows = toOrderItems(cartItems).map((row) => ({ ...row, order_id: order.id }));
  const { error: itemsError } = await supabase.from('order_items').insert(rows);
  if (itemsError) throw itemsError;

  return { ...order, items: rows };
}

// Alle Bestellungen dieser Session (die Rechnung/der Tab), älteste zuerst.
export async function fetchSessionOrders() {
  if (isDemoMode()) return [...demoOrders];

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('session_id', getSessionId())
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map((order) => ({ ...order, items: order.order_items ?? [] }));
}

// Bezahlen: alle offenen Bestellungen dieser Session als bezahlt markieren.
export async function markSessionPaid() {
  if (isDemoMode()) {
    demoOrders.forEach((order) => {
      order.paid = true;
    });
    return;
  }

  const { error } = await supabase
    .from('orders')
    .update({ paid: true })
    .eq('session_id', getSessionId())
    .eq('paid', false);
  if (error) throw error;
}

// Nach dem Bezahlen: neue Tisch-Kennung für die nächsten Gäste.
export function resetSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Küchen-Ansicht: alle unbezahlten Bestellungen (alle Tische), älteste zuerst.
export async function fetchOpenOrders() {
  if (isDemoMode()) return [...demoOrders];

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('paid', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map((order) => ({ ...order, items: order.order_items ?? [] }));
}

// Küchen-Ansicht: Status einer Bestellung ändern (löst Realtime-Update
// auf dem Kunden-Tablet aus).
export async function setOrderStatus(orderId, status) {
  if (isDemoMode()) {
    const order = demoOrders.find((o) => o.id === orderId);
    if (order) order.status = status;
    return order;
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Küchen-Ansicht: bei jeder Änderung an orders (neue Bestellung, Status)
// benachrichtigen. Rückgabe: Abmelde-Funktion.
export function subscribeToAllOrders(onChange) {
  if (isDemoMode()) return () => {};

  const channel = supabase
    .channel('kitchen-orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// Live-Status (CLAUDE.md §6): Status-Änderungen an Bestellungen dieser
// Session abonnieren. Rückgabe: Abmelde-Funktion.
// Demo-Modus: der Status wandert automatisch weiter, damit der Screen erlebbar ist.
export function subscribeToOrders(onChange) {
  if (isDemoMode()) {
    const latest = demoOrders[demoOrders.length - 1];
    const timers = latest
      ? [
          setTimeout(() => onChange({ ...latest, status: (latest.status = 'in_zubereitung') }), 8000),
          setTimeout(() => onChange({ ...latest, status: (latest.status = 'fertig') }), 16000),
        ]
      : [];
    return () => timers.forEach(clearTimeout);
  }

  const channel = supabase
    .channel(`orders-${getSessionId()}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `session_id=eq.${getSessionId()}`,
      },
      (payload) => onChange(payload.new),
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
