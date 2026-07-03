import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DRINKS, SIDES } from '../config/menu';
import { useOrderStore, cartTotal, bowlIngredients } from '../state/orderStore';
import { submitOrder } from '../services/dataService';
import Button from '../components/Button';
import BowlThumbnail from '../components/BowlThumbnail';
import ModifierGroup from '../components/ModifierGroup';
import OptionCard from '../components/OptionCard';
import QuantityStepper from '../components/QuantityStepper';
import { t } from '../i18n';

// Warenkorb = Entwurf der aktuellen Runde (CLAUDE.md §9): links die Runde,
// rechts Getränke | Beilagen per Umschalter dazulegen. „Bestellen" schickt
// die Runde über dataService ab und leert den Warenkorb.

const TABS = {
  drinks: { type: 'drink', items: DRINKS },
  sides: { type: 'side', items: SIDES },
};

// Add-Item-Karte am Ende der Rundenliste: führt in den Bowl-Builder.
// Gestrichelt = "hier kannst du hinzufügen", konkurriert nicht mit "Bestellen".
function AddBowlCard({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface p-4 text-body font-semibold text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
    >
      <Plus size={18} aria-hidden="true" />
      {t('cart.anotherBowl')}
    </button>
  );
}

// Eine Getränke-/Beilagen-Karte: Variante wählbar, Menge pro Variante.
function AddItemCard({ menuItem, type }) {
  const cart = useOrderStore((s) => s.cart);
  const setCartLineQty = useOrderStore((s) => s.setCartLineQty);
  const [variant, setVariant] = useState(menuItem.variants?.[0] ?? null);

  const key = `${type}:${menuItem.id}:${variant ?? ''}`;
  const qty = cart.find((i) => i.key === key)?.qty ?? 0;
  const totalQty = cart
    .filter((i) => i.type === type && i.refId === menuItem.id)
    .reduce((sum, i) => sum + i.qty, 0);

  return (
    <OptionCard
      name={menuItem.name}
      desc={menuItem.desc}
      image={`/assets/${type}/${menuItem.id}.png`}
      priceText={menuItem.price > 0 ? `${menuItem.price} €` : t('cart.free')}
      selected={totalQty > 0}
      accent="gold"
      onSelect={() => setCartLineQty(type, menuItem, variant, qty + 1)}
    >
      {menuItem.variants && (
        <ModifierGroup options={menuItem.variants} value={variant} onChange={setVariant} accent="gold" />
      )}
      <QuantityStepper
        value={qty}
        onChange={(next) => setCartLineQty(type, menuItem, variant, next)}
        accent="gold"
      />
    </OptionCard>
  );
}

export default function CartScreen({ onNavigate }) {
  const cart = useOrderStore((s) => s.cart);
  const removeCartItem = useOrderStore((s) => s.removeCartItem);
  const orderPlaced = useOrderStore((s) => s.orderPlaced);
  const [tab, setTab] = useState('drinks');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function handleOrder() {
    setSubmitting(true);
    setError(false);
    try {
      const order = await submitOrder(cart, cartTotal(cart));
      orderPlaced(order);
      onNavigate?.('status');
    } catch (err) {
      console.error('Bestellung fehlgeschlagen:', err);
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Aktuelle Runde */}
      <aside className="flex w-2/5 min-w-0 flex-col gap-4 border-r border-line p-6">
        <h2 className="text-h1">{t('cart.round')}</h2>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-body font-semibold text-ink-900">{t('cart.emptyTitle')}</p>
            <p className="text-small text-ink-400">{t('cart.emptyHint')}</p>
            <AddBowlCard onClick={() => onNavigate?.('builder')} />
          </div>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {cart.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3"
              >
                {item.type === 'bowl' && <BowlThumbnail config={item.config} className="w-20 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="break-words text-body font-semibold text-ink-900">
                    {item.qty > 1 ? `${item.qty}× ` : ''}
                    {item.name}
                  </p>
                  {item.type === 'bowl' && (
                    <p className="text-caption text-ink-400">
                      {bowlIngredients(item.config)
                        .map((chip) => chip.name)
                        .join(', ')}
                    </p>
                  )}
                  <p className="text-small text-ink-600">{item.price * item.qty} €</p>
                </div>
                <button
                  type="button"
                  aria-label={t('cart.remove')}
                  onClick={() => removeCartItem(item.key)}
                  className="cursor-pointer text-ink-400 transition-colors hover:text-primary"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
            <li>
              <AddBowlCard onClick={() => onNavigate?.('builder')} />
            </li>
          </ul>
        )}

        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-small text-ink-400">{t('cart.total')}</span>
          <span className="font-display text-h2 text-ink-900">{cartTotal(cart)} €</span>
        </div>
        {error && <p className="text-small text-error">{t('cart.error')}</p>}
        <Button
          size="lg"
          disabled={cart.length === 0 || submitting}
          onClick={handleOrder}
        >
          {t('cart.order')}
        </Button>
      </aside>

      {/* Getränke | Beilagen dazulegen */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
        <ModifierGroup
          options={[
            { value: 'drinks', label: t('cart.drinks') },
            { value: 'sides', label: t('cart.sides') },
          ]}
          value={tab}
          onChange={setTab}
          accent="ink-900"
        />
        <div className="@container min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
          <div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
            {TABS[tab].items.map((menuItem) => (
              <AddItemCard key={menuItem.id} menuItem={menuItem} type={TABS[tab].type} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
