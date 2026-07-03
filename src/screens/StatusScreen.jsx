import { useEffect, useState } from 'react';
import { ClipboardList, ChefHat, BellRing } from 'lucide-react';
import { fetchSessionOrders, subscribeToOrders } from '../services/dataService';
import Button from '../components/Button';
import BowlThumbnail from '../components/BowlThumbnail';
import { t } from '../i18n';

// Live-Status: zeigt den Fortschritt der letzten Runde (Supabase-Realtime,
// CLAUDE.md §6) und darunter die ganze Rechnung. Nachbestellen jederzeit möglich.

const STATUS_FLOW = ['aufgenommen', 'in_zubereitung', 'fertig'];
const STATUS_ICONS = { aufgenommen: ClipboardList, in_zubereitung: ChefHat, fertig: BellRing };
const STATUS_COLORS = { aufgenommen: 'gold', in_zubereitung: 'warning', fertig: 'success' };

// Getränke/Beilagen zusammenfassen ("2× Gyoza (Gebraten)"), Bowls bleiben
// einzelne Zeilen, damit jede ihr eigenes Bild zeigen kann.
function groupItems(items) {
  const groups = new Map();
  const rows = [];
  for (const item of items) {
    if (item.type === 'bowl') {
      rows.push({ name: item.name, price: item.price, count: 1, config: item.config });
      continue;
    }
    if (groups.has(item.name)) {
      groups.get(item.name).count += 1;
    } else {
      const entry = { name: item.name, price: item.price, count: 1, config: null };
      groups.set(item.name, entry);
      rows.push(entry);
    }
  }
  return rows;
}

function StatusTracker({ status }) {
  const currentIndex = STATUS_FLOW.indexOf(status);
  return (
    <ol className="flex items-center">
      {STATUS_FLOW.map((step, index) => {
        const Icon = STATUS_ICONS[step];
        const reached = index <= currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={step} className="flex items-center">
            {index > 0 && (
              <span
                aria-hidden="true"
                className="mx-2 h-0.5 w-10 rounded-full"
                style={{
                  backgroundColor: reached ? `var(--color-${STATUS_COLORS[step]})` : 'var(--color-line)',
                }}
              />
            )}
            <div className="flex flex-col items-center gap-2">
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full border-2 transition-colors ${
                  reached ? 'text-surface' : 'border-line bg-surface text-ink-400'
                } ${isCurrent ? 'animate-float' : ''}`}
                style={
                  reached
                    ? {
                        backgroundColor: `var(--color-${STATUS_COLORS[step]})`,
                        borderColor: `var(--color-${STATUS_COLORS[step]})`,
                      }
                    : undefined
                }
              >
                <Icon size={24} aria-hidden="true" />
              </span>
              <span
                className={`text-small font-semibold ${reached ? 'text-ink-900' : 'text-ink-400'}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {t(`status.states.${step}`)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function StatusScreen({ onNavigate }) {
  const [orders, setOrders] = useState(null); // null = lädt noch

  useEffect(() => {
    let active = true;
    fetchSessionOrders()
      .then((data) => active && setOrders(data))
      .catch((err) => {
        console.error('Bestellungen laden fehlgeschlagen:', err);
        if (active) setOrders([]);
      });
    // Realtime liefert nur die orders-Zeile, Positionen behalten wir lokal.
    const unsubscribe = subscribeToOrders((changed) =>
      setOrders((prev) =>
        (prev ?? []).map((o) => (o.id === changed.id ? { ...o, ...changed, items: o.items } : o)),
      ),
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const latest = orders?.[orders.length - 1];

  if (orders && !latest) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-4">
        <h2 className="text-h1">{t('status.emptyTitle')}</h2>
        <p className="text-body text-ink-400">{t('status.emptyHint')}</p>
        <Button onClick={() => onNavigate?.('builder')}>{t('status.emptyCta')}</Button>
      </section>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Aktuelle Runde: Fortschritt */}
      <section className="flex min-w-0 flex-1 flex-col items-center justify-center gap-8 p-6">
        <h2 className="text-h1">{t('status.title')}</h2>
        {latest && <StatusTracker status={latest.status} />}
        {latest?.status === 'fertig' && (
          <p className="text-body-lg text-ink-600">{t('status.readyHint')}</p>
        )}
        <div className="flex gap-3">
          <Button onClick={() => onNavigate?.('builder')}>{t('status.reorder')}</Button>
          <Button variant="ghost" onClick={() => onNavigate?.('pay')}>
            {t('status.pay')}
          </Button>
        </div>
      </section>

      {/* Rechnung / Tab: alle Runden dieser Session */}
      <aside className="flex w-2/5 min-w-0 flex-col gap-4 border-l border-line p-6">
        <h3 className="text-h2">{t('status.tab')}</h3>
        <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {(orders ?? []).map((order, index) => (
            <li key={order.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-small font-semibold text-ink-900">
                  {t('status.round', { n: index + 1 })}
                </span>
                <span
                  className="rounded-sm px-2 py-0.5 text-caption font-semibold text-surface"
                  style={{ backgroundColor: `var(--color-${STATUS_COLORS[order.status]})` }}
                >
                  {t(`status.states.${order.status}`)}
                </span>
              </div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {groupItems(order.items ?? []).map((item, itemIndex) => (
                  <li
                    key={`${item.name}-${itemIndex}`}
                    className="flex items-center justify-between gap-2 text-small text-ink-600"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {item.config && <BowlThumbnail config={item.config} className="w-12 shrink-0" />}
                      <span className="min-w-0 break-words">
                        {item.count > 1 ? `${item.count}× ` : ''}
                        {item.name}
                      </span>
                    </span>
                    <span>{item.price * item.count} €</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t border-line pt-2 text-small font-semibold text-ink-900">
                <span>{t('cart.total')}</span>
                <span>{order.total} €</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-small text-ink-400">{t('status.tabTotal')}</span>
          <span className="font-display text-h2 text-ink-900">
            {(orders ?? []).reduce((sum, o) => sum + o.total, 0)} €
          </span>
        </div>
      </aside>
    </div>
  );
}
