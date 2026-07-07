import { useEffect, useState } from 'react';
import { ClipboardList, ChefHat, BellRing, Soup, CupSoda } from 'lucide-react';
import { fetchSessionOrders, subscribeToOrders } from '../services/dataService';
import Button from '../components/Button';
import BowlThumbnail from '../components/BowlThumbnail';
import ItemThumbnail from '../components/ItemThumbnail';
import { t } from '../i18n';

// Live-Status: links der Fortschritt der letzten Runde (Supabase-Realtime,
// CLAUDE.md §6) mit Nachbestell-Weiche und Bezahlen, rechts die ganze Rechnung.
// Nachbestellen jederzeit möglich.

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

// Eine Nachbestell-Karte der Weiche: ruhige Surface-Karte, großes Touch-Ziel.
function ReorderCard({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-line bg-surface p-4 text-body font-semibold text-ink-900 transition-colors hover:border-ink-400"
    >
      <Icon size={28} className="text-ink-600" aria-hidden="true" />
      {label}
    </button>
  );
}

function StatusTracker({ status }) {
  const currentIndex = STATUS_FLOW.indexOf(status);
  return (
    <ol className="flex w-full max-w-xl items-center">
      {STATUS_FLOW.map((step, index) => {
        const Icon = STATUS_ICONS[step];
        const reached = index <= currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={step} className={`flex items-center${index > 0 ? ' flex-1' : ''}`}>
            {index > 0 && (
              <span
                aria-hidden="true"
                className="mx-3 h-1 min-w-6 flex-1 rounded-full"
                style={{
                  backgroundColor: reached ? `var(--color-${STATUS_COLORS[step]})` : 'var(--color-line)',
                }}
              />
            )}
            <div className="flex flex-col items-center gap-3">
              <span
                className={`flex h-20 w-20 items-center justify-center rounded-full border-2 transition-colors ${
                  reached ? 'text-surface' : 'border-line bg-surface text-ink-400'
                } ${isCurrent ? 'animate-pulse-soft' : ''}`}
                style={
                  reached
                    ? {
                        backgroundColor: `var(--color-${STATUS_COLORS[step]})`,
                        borderColor: `var(--color-${STATUS_COLORS[step]})`,
                      }
                    : undefined
                }
              >
                <Icon size={32} aria-hidden="true" />
              </span>
              <span
                className={`text-body font-semibold ${reached ? 'text-ink-900' : 'text-ink-400'}`}
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
    // Jedes Realtime-Event lädt die Runden samt Positionen neu, das deckt
    // auch neue Bestellungen ab (INSERT hat lokal keine items).
    const load = () =>
      fetchSessionOrders()
        .then((data) => active && setOrders(data))
        .catch((err) => {
          console.error('Bestellungen laden fehlgeschlagen:', err);
          if (active) setOrders((prev) => prev ?? []);
        });
    load();
    const unsubscribe = subscribeToOrders(load);
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

  const grandTotal = (orders ?? []).reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="flex h-full min-h-0">
      {/* Aktuelle Runde: Status-Hero, Nachbestell-Weiche und Bezahlen in drei Zonen. */}
      <section className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 p-6">
        {/* Zone 1: Status-Hero, guarded weil latest beim Laden undefined ist */}
        {latest && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-body font-semibold text-ink-400">
              {t('status.round', { n: orders.length })}
            </p>
            <h2
              className="font-display text-display"
              style={{ color: `var(--color-${STATUS_COLORS[latest.status]})` }}
            >
              {t(`status.headlines.${latest.status}`)}
            </h2>
            <StatusTracker status={latest.status} />
          </div>
        )}

        {/* Zone 2: Nachbestell-Weiche, zwei gleichwertige große Touch-Ziele.
            Getränke/Beilagen ist der häufigste Fall, darf also nicht hinter
            dem Bowl-Builder versteckt sein. */}
        <div className="flex w-full max-w-lg flex-col gap-2">
          <p className="text-center text-small text-ink-400">{t('status.reorderTitle')}</p>
          <div className="flex gap-4">
            <ReorderCard
              icon={Soup}
              label={t('status.reorderBowl')}
              onClick={() => onNavigate?.('builder')}
            />
            <ReorderCard
              icon={CupSoda}
              label={t('status.reorderDrinks')}
              onClick={() => onNavigate?.('cart')}
            />
          </div>
        </div>

        {/* Zone 3: Bezahlen als eigene Zone hinter Trennlinie, die eine rote Aktion.
            Die Gesamtsumme im Button zeigt ohne Erklärtext, dass am Ende alles auf
            einmal bezahlt wird. */}
        <div className="flex w-full max-w-lg flex-col items-center border-t border-line pt-3">
          <Button size="lg" onClick={() => onNavigate?.('pay')}>
            {t('status.pay')} · {grandTotal} €
          </Button>
        </div>
      </section>

      {/* Rechnung / Tab: alle Runden dieser Session */}
      <aside className="flex w-2/5 min-w-0 flex-col gap-4 border-l border-line p-6">
        <h3 className="text-h2">{t('status.tab')}</h3>
        <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {(orders ?? []).map((order, index) => (
            <li
              key={order.id}
              className={`rounded-lg border bg-surface p-4 ${
                index === (orders?.length ?? 0) - 1 ? 'border-ink-400' : 'border-line'
              }`}
            >
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
                      {item.config ? (
                        <BowlThumbnail config={item.config} className="w-12 shrink-0" />
                      ) : (
                        <ItemThumbnail item={item} className="h-10 w-10 shrink-0" />
                      )}
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
          <span className="font-display text-h2 text-ink-900">{grandTotal} €</span>
        </div>
      </aside>
    </div>
  );
}
