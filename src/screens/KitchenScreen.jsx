import { useCallback, useEffect, useState } from 'react';
import { TOPPINGS } from '../config/menu';
import { fetchOpenOrders, setOrderStatus, subscribeToAllOrders } from '../services/dataService';
import ModifierGroup from '../components/ModifierGroup';
import { t } from '../i18n';

const toppingName = (id) => TOPPINGS.find((topping) => topping.id === id)?.name ?? id;

// Küchen-Ansicht (Personal-Gerät): alle offenen Bestellungen, Status per Tipp
// ändern, das Kunden-Tablet aktualisiert sich über Realtime (CLAUDE.md §6).

const STATUS_FLOW = ['aufgenommen', 'in_zubereitung', 'fertig'];
const STATUS_COLORS = { aufgenommen: 'gold', in_zubereitung: 'warning', fertig: 'success' };

function timeLabel(isoString) {
  return new Date(isoString).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export default function KitchenScreen() {
  const [orders, setOrders] = useState([]);

  const reload = useCallback(() => {
    fetchOpenOrders()
      .then(setOrders)
      .catch((err) => console.error('Küche: Laden fehlgeschlagen:', err));
  }, []);

  useEffect(() => {
    reload();
    const unsubscribe = subscribeToAllOrders(reload);
    return unsubscribe;
  }, [reload]);

  async function changeStatus(order, status) {
    // Optimistisch aktualisieren, dann speichern
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    try {
      await setOrderStatus(order.id, status);
    } catch (err) {
      console.error('Küche: Status speichern fehlgeschlagen:', err);
      reload();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-6">
      <h2 className="text-h1">{t('kitchen.title')}</h2>

      {orders.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-body text-ink-400">{t('kitchen.empty')}</p>
        </div>
      ) : (
        <div className="@container min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
          <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @4xl:grid-cols-3">
            {orders.map((order) => (
              <article key={order.id} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-body font-semibold text-ink-900">
                    {t('kitchen.table', { id: order.session_id.slice(0, 4).toUpperCase() })}
                  </span>
                  <span className="text-small text-ink-400">{timeLabel(order.created_at)}</span>
                </div>

                <ul className="flex flex-col gap-1">
                  {(order.items ?? []).map((item, index) => (
                    <li key={item.id ?? index} className="text-small text-ink-600">
                      {item.name}
                      {item.type === 'bowl' && item.config && (
                        <span className="block text-caption text-ink-400">
                          {[
                            `${item.config.hardness}`,
                            ...Object.entries(item.config.toppings ?? {}).map(
                              ([id, qty]) => `${qty}× ${toppingName(id)}`,
                            ),
                            ...Object.values(item.config.finish ?? {}),
                          ].join(' · ')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                <ModifierGroup
                  options={STATUS_FLOW.map((s) => ({ value: s, label: t(`status.states.${s}`) }))}
                  value={order.status}
                  onChange={(status) => changeStatus(order, status)}
                  accent={STATUS_COLORS[order.status]}
                />
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
