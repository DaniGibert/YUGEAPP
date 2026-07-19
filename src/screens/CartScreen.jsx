import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { DRINKS, SIDES, itemDisplayName } from '../config/menu';
import { useOrderStore, cartTotal, bowlIngredients } from '../state/orderStore';
import { submitOrder } from '../services/dataService';
import AddCard from '../components/AddCard';
import AnimatedNumber from '../components/AnimatedNumber';
import Button from '../components/Button';
import BowlThumbnail from '../components/BowlThumbnail';
import ItemThumbnail, { menuImagePaths } from '../components/ItemThumbnail';
import ModifierGroup from '../components/ModifierGroup';
import OptionCard from '../components/OptionCard';
import QuantityStepper from '../components/QuantityStepper';
import { t, tx } from '../i18n';

// Warenkorb = Entwurf der aktuellen Runde (CLAUDE.md §9): links die Runde,
// rechts Getränke | Beilagen per Umschalter dazulegen. „Bestellen" schickt
// die Runde über dataService ab und leert den Warenkorb.

const TABS = {
  drinks: { type: 'drink', items: DRINKS },
  sides: { type: 'side', items: SIDES },
};

// Reihenfolge der Tabs im Filmstrip; der Index bestimmt, wie weit der Track faehrt.
const TAB_ORDER = Object.keys(TABS);

// Eine Getränke-/Beilagen-Karte: Variante wählbar, Menge pro Variante.
function AddItemCard({ menuItem, type }) {
  const cart = useOrderStore((s) => s.cart);
  const setCartLineQty = useOrderStore((s) => s.setCartLineQty);
  // variant ist eine Varianten-ID (Kennung fürs Bild/DB), Anzeige über tx(label).
  const [variant, setVariant] = useState(menuItem.variants?.[0]?.id ?? null);

  const key = `${type}:${menuItem.id}:${variant ?? ''}`;
  const qty = cart.find((i) => i.key === key)?.qty ?? 0;
  const totalQty = cart
    .filter((i) => i.type === type && i.refId === menuItem.id)
    .reduce((sum, i) => sum + i.qty, 0);

  // Produktbild; bei Varianten zeigt die Karte das Bild der aktiven Variante
  // und fällt aufs Produktbild zurück, wenn es fehlt.
  const { image, fallback } = menuImagePaths({ type, id: menuItem.id, variant });

  return (
    <OptionCard
      name={tx(menuItem.name)}
      desc={tx(menuItem.desc)}
      diet={menuItem.diet}
      allergens={menuItem.allergens}
      image={image}
      fallbackImage={fallback}
      imageClassName="h-36"
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

export default function CartScreen({ onNavigate, cameFrom }) {
  const cart = useOrderStore((s) => s.cart);
  const removeCartItem = useOrderStore((s) => s.removeCartItem);
  const changeCartQty = useOrderStore((s) => s.changeCartQty);
  const orderPlaced = useOrderStore((s) => s.orderPlaced);
  // Schon eine Runde bestellt? Dann ist der leere Korb kein "noch nichts",
  // sondern der Startpunkt der nächsten Runde (Runden-Modell, CLAUDE.md §9):
  // der geleerte Korb nach "Bestellen" darf nicht wie "fertig" aussehen.
  const hasOrdered = useOrderStore((s) => s.orders.length > 0);
  // Frisch hinzugefuegte Zeile: slidet einmal von links rein (Gegenstueck zur
  // Runden-Ankunft im Status, die von rechts kommt). One-shot ueber den Store,
  // damit die frische Zeile den Remount Builder -> Warenkorb ueberlebt.
  const lastAddedCartKey = useOrderStore((s) => s.lastAddedCartKey);
  const consumeLastAddedCartKey = useOrderStore((s) => s.consumeLastAddedCartKey);
  const [tab, setTab] = useState('drinks');
  const tabIndex = TAB_ORDER.indexOf(tab);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  // Leer-Ansicht bewusst NICHT direkt an cart.length haengen: sonst wirft der
  // Wechsel beim Entfernen der LETZTEN Zeile die ganze Liste samt AnimatePresence
  // im selben Moment weg, und die Zeile ist weg, bevor sie rausgleiten kann.
  // showEmpty legt erst um, wenn AnimatePresence die Exit-Animation abgeschlossen
  // meldet (onExitComplete). Neues Item macht sofort wieder die Liste sichtbar.
  const [showEmpty, setShowEmpty] = useState(cart.length === 0);
  useEffect(() => {
    if (cart.length > 0) setShowEmpty(false);
  }, [cart.length]);

  // Set der bereits gesehenen Zeilen-Keys (null = noch kein Commit). Beim ersten
  // Commit zaehlt nur die frisch hinzugefuegte Zeile (lastAddedCartKey) als neu,
  // alle aelteren stehen sofort. Danach slidet jede neu dazukommende Zeile rein,
  // reine Mengenaenderungen (gleicher Key) nicht. initial in motion feuert nur
  // beim Mount, darum genuegt der Key-Vergleich zum Mount-Zeitpunkt.
  const seenKeysRef = useRef(null);
  useEffect(() => {
    if (seenKeysRef.current === null) seenKeysRef.current = new Set();
    const addedPresent =
      lastAddedCartKey !== null && cart.some((i) => i.key === lastAddedCartKey);
    for (const i of cart) {
      if (addedPresent && i.key === lastAddedCartKey) continue;
      seenKeysRef.current.add(i.key);
    }
    if (addedPresent) consumeLastAddedCartKey();
    // lastAddedCartKey bewusst nicht in den Deps: pro cart-Commit zaehlt der Stand
    // seines Renders (gleiches Muster wie seenIdsRef im StatusScreen).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

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
        {/* Nachbestell-Abstecher: Rueckweg zum Status; im Bau-Flow bewusst kein Zurueck. */}
        {cameFrom === 'status' && (
          <div>
            <Button size="sm" variant="ghost" onClick={() => onNavigate?.('status')}>
              <ArrowLeft size={16} />
              {t('cart.back')}
            </Button>
          </div>
        )}
        <h2 className="text-h1">{t('cart.round')}</h2>

        {showEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-body font-semibold text-ink-900">
              {t(hasOrdered ? 'cart.emptyAgainTitle' : 'cart.emptyTitle')}
            </p>
            <p className="text-small text-ink-400">
              {t(hasOrdered ? 'cart.emptyAgainHint' : 'cart.emptyHint')}
            </p>
            <AddCard label={t('cart.anotherBowl')} onClick={() => onNavigate?.('builder')} />
          </div>
        ) : (
          // reducedMotion="user": bei prefers-reduced-motion laesst motion die
          // Transform (x) weg und blendet nur per Opacity ein (kein Slide).
          <MotionConfig reducedMotion="user">
          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {/* AnimatePresence haelt eine entfernte Zeile bis zum Ende ihrer
                exit-Animation gemountet: sie gleitet nach links raus (Gegenstueck
                zum Eintritt). layout laesst die uebrigen Zeilen die Luecke weich
                nachruecken statt zu springen. */}
            <AnimatePresence onExitComplete={() => cart.length === 0 && setShowEmpty(true)}>
            {cart.map((item) => {
              // Neu = zum Mount-Zeitpunkt ungesehen. Erster Commit: nur die frische
              // Zeile; danach jede Zeile mit noch unbekanntem Key.
              const isNew =
                seenKeysRef.current === null
                  ? item.key === lastAddedCartKey
                  : !seenKeysRef.current.has(item.key);
              return (
              <motion.li
                key={item.key}
                layout
                className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3"
                initial={isNew ? { x: -48, opacity: 0 } : false}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -48, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              >
                {item.type === 'bowl' ? (
                  <BowlThumbnail config={item.config} className="w-20 shrink-0" />
                ) : (
                  <ItemThumbnail item={item} className="h-16 w-16 shrink-0" />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="break-words text-body font-semibold text-ink-900">{itemDisplayName(item)}</p>
                  {item.type === 'bowl' && (
                    <p className="text-caption text-ink-400">
                      {bowlIngredients(item.config)
                        .map((chip) => chip.name)
                        .join(', ')}
                    </p>
                  )}
                  <p className="text-small text-ink-600">
                    <AnimatedNumber value={item.price * item.qty} /> €
                  </p>
                  {/* Getränke/Beilagen: Menge direkt hier ändern, statt nur alles löschen */}
                  {item.type !== 'bowl' && (
                    <QuantityStepper
                      value={item.qty}
                      onChange={(next) => changeCartQty(item.key, next)}
                      accent="gold"
                    />
                  )}
                </div>
                <button
                  type="button"
                  aria-label={t('cart.remove')}
                  onClick={() => removeCartItem(item.key)}
                  className="cursor-pointer text-ink-400 transition-colors hover:text-primary"
                >
                  <Trash2 size={18} />
                </button>
              </motion.li>
              );
            })}
            </AnimatePresence>
            {/* Waehrend die letzte Zeile rausgleitet ist cart schon leer: die
                "Noch ein Ramen"-Karte solange ausblenden, nur die Zeile slidet. */}
            {cart.length > 0 && (
              <li>
                <AddCard label={t('cart.anotherBowl')} onClick={() => onNavigate?.('builder')} />
              </li>
            )}
          </ul>
          </MotionConfig>
        )}

        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-small text-ink-400">{t('cart.total')}</span>
          {/* from={0}: die Summe zählt beim Betreten des Warenkorbs von 0 hoch
              (typischer Weg: Bowl bauen -> "In den Warenkorb" -> hier landen).
              Danach animiert jede Mengen-/Lösch-Änderung vom alten Wert aus. */}
          <span className="font-price text-h2 font-bold text-ink-900">
            <AnimatedNumber value={cartTotal(cart)} from={0} /> €
          </span>
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
        {/* Filmstrip wie im Builder: beide Tabs liegen nebeneinander, der Track faehrt
            per translateX zum aktiven Tab. Inaktiver Tab ist inert. Scroll-Position und
            gewaehlte Varianten bleiben pro Tab erhalten, weil nichts unmountet. */}
        <div className="relative min-h-0 flex-1 overflow-clip">
          <div
            className="flex h-full transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${tabIndex * 100}%)` }}
          >
            {TAB_ORDER.map((tabKey) => {
              const isActive = tabKey === tab;
              return (
                <div key={tabKey} inert={!isActive} className="h-full w-full min-w-0 shrink-0">
                  <div className="@container h-full overflow-y-auto overflow-x-hidden pr-1">
                    <div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
                      {TABS[tabKey].items.map((menuItem) => (
                        <AddItemCard key={menuItem.id} menuItem={menuItem} type={TABS[tabKey].type} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
