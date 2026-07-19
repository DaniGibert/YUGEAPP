import { useEffect, useRef, useState } from 'react';
import { ConciergeBell, Globe, ReceiptText, ShoppingBag } from 'lucide-react';
import { STATUS_COLORS } from '../config/orderStatus';
import { fetchSessionOrders, subscribeToOrders } from '../services/dataService';
import { useOrderStore, cartTotal } from '../state/orderStore';
import { itemDisplayName } from '../config/menu';
import { useFullscreen } from '../hooks/useFullscreen';
import BowlThumbnail from './BowlThumbnail';
import Button from './Button';
import { getLanguage, setLanguage, t } from '../i18n';

// Wie lange das Logo gehalten werden muss, bis Vollbild schaltet (Personal-Geste).
// Lang genug, dass ein Gast es nicht versehentlich auslöst.
const LOGO_HOLD_MS = 3000;

// Globale Kopfzeile: Logo links (kurzer Tipp führt zum Start, langer Druck
// schaltet Vollbild fürs Personal), rechts die globalen Aktionen
// Kellner rufen / Sprache / Bestellstatus / Warenkorb, auf JEDEM Screen
// sichtbar (CLAUDE.md §3.7). `minimal` = Küchen-Modus: nur Logo, keine Gast-Aktionen.
// Der Warenkorb-Button klappt eine kleine Übersicht der aktuellen Runde aus
// (CLAUDE.md §9); bestellt wird weiterhin nur im CartScreen.

// `text` = sichtbares Label neben dem Icon (Pill statt Quadrat), z. B. bei
// Kellner rufen / Warenkorb / Bestellstatus. Ohne `text` bleibt der Button
// ein reines Icon-Quadrat (Vollbild, Sprache).
function HeaderIconButton({ label, onClick, sublabel, text, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`relative flex h-11 cursor-pointer items-center justify-center rounded-md border border-line bg-surface text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900 ${
        text ? 'gap-2 px-4' : 'w-11 flex-col'
      }`}
    >
      {children}
      {text && (
        <span className="whitespace-nowrap text-small font-semibold leading-none">{text}</span>
      )}
      {sublabel && <span className="text-caption font-semibold leading-none">{sublabel}</span>}
    </button>
  );
}

// Ausklappbare Warenkorb-Übersicht: nur lesen, keine Aktionen außer Navigation.
function CartDropdown({ cart, onGoToCart }) {
  return (
    <div className="absolute right-8 top-full z-20 mt-2 flex w-80 flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-lg">
      <span className="text-body font-semibold text-ink-900">{t('cart.round')}</span>

      {cart.length === 0 ? (
        <p className="text-small text-ink-400">{t('header.cartEmpty')}</p>
      ) : (
        <>
          <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
            {cart.map((item) => (
              <li key={item.key} className="flex items-center gap-2 text-small text-ink-600">
                {item.type === 'bowl' && (
                  <BowlThumbnail config={item.config} className="w-12 shrink-0" />
                )}
                <span className="min-w-0 flex-1 break-words">
                  {item.qty > 1 ? `${item.qty}× ` : ''}
                  {itemDisplayName(item)}
                </span>
                <span className="shrink-0">{item.price * item.qty} €</span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between border-t border-line pt-2">
            <span className="text-small text-ink-400">{t('cart.total')}</span>
            <span className="text-body font-semibold text-ink-900">{cartTotal(cart)} €</span>
          </div>
        </>
      )}

      <Button size="sm" onClick={onGoToCart}>
        {t('header.cartGoTo')}
      </Button>
    </div>
  );
}

export default function Header({ onNavigate, minimal = false }) {
  const cart = useOrderStore((s) => s.cart);
  // Vollbild ist KEINE Gast-Aktion, sondern eine einmalige Einricht-Aktion fürs
  // Personal -> kein Knopf im Gast-Header, sondern ein Langdruck aufs Logo
  // (siehe LOGO_HOLD_MS unten). isSupported blendet die Geste dort aus, wo die
  // API fehlt (Apple, siehe hooks/useFullscreen.js).
  const { isSupported: fullscreenSupported, toggle: toggleFullscreen } = useFullscreen();
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const cartAreaRef = useRef(null);
  // Live-Punkt am Bestellstatus-Knopf (Ambient-Status, CLAUDE.md §9): Status
  // der letzten Runde dieser Session, auf JEDEM Screen sichtbar. Der Header
  // ist dauerhaft gemountet, also eine langlebige Realtime-Subscription über
  // die Datenschicht; null = noch nichts bestellt, dann gibt es keinen Punkt.
  const [latestStatus, setLatestStatus] = useState(null);

  useEffect(() => {
    if (minimal) return undefined; // Küchen-Modus hat keine Gast-Buttons
    let active = true;
    const load = () =>
      fetchSessionOrders()
        .then((orders) => {
          if (active) setLatestStatus(orders[orders.length - 1]?.status ?? null);
        })
        .catch((err) => console.error('Header: Status laden fehlgeschlagen:', err));
    load();
    const unsubscribe = subscribeToOrders(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [minimal]);

  // --- Logo: kurzer Tipp = zum Start, langer Druck = Vollbild (Personal) ---
  // Der Langdruck ist bewusst versteckt: ein Gast tippt das Logo nur kurz an,
  // das Personal hält es beim Einrichten. Feedback ist der Vollbild-Wechsel
  // selbst, darum kein Hinweistext und keine Fortschritts-Anzeige.
  const holdTimerRef = useRef(null);
  const didHoldRef = useRef(false);

  function startLogoHold() {
    if (!fullscreenSupported) return; // Apple: Geste gäbe es nur zum Schein
    didHoldRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      didHoldRef.current = true;
      toggleFullscreen();
    }, LOGO_HOLD_MS);
  }

  function cancelLogoHold() {
    clearTimeout(holdTimerRef.current);
  }

  function handleLogoClick() {
    // Nach einem Langdruck kommt trotzdem noch ein click -> hier schlucken,
    // sonst würde das Vollbild-Schalten zusätzlich zum Start navigieren.
    if (didHoldRef.current) {
      didHoldRef.current = false;
      return;
    }
    onNavigate?.('start');
  }

  // Timer nie über das Unmount hinaus laufen lassen.
  useEffect(() => () => clearTimeout(holdTimerRef.current), []);

  function callWaiter() {
    setWaiterCalled(true);
  }

  function toggleLanguage() {
    setLanguage(getLanguage() === 'de' ? 'en' : 'de');
  }

  function goToCart() {
    setCartOpen(false);
    onNavigate?.('cart');
  }

  // Dropdown bei Klick außerhalb schließen
  useEffect(() => {
    if (!cartOpen) return undefined;
    function handlePointerDown(e) {
      if (!cartAreaRef.current?.contains(e.target)) setCartOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [cartOpen]);

  return (
    <header className="app-header relative flex items-center justify-between border-b border-line bg-surface px-8 py-4">
      <button
        type="button"
        onClick={handleLogoClick}
        onPointerDown={startLogoHold}
        onPointerUp={cancelLogoHold}
        onPointerLeave={cancelLogoHold}
        onPointerCancel={cancelLogoHold}
        onContextMenu={(e) => e.preventDefault()} // Langdruck darf kein Kontextmenü öffnen
        className="cursor-pointer select-none font-display text-h2 text-ink-900"
      >
        Yuge
      </button>

      {!minimal && (
        <div className="flex items-center gap-3" ref={cartAreaRef}>
          <HeaderIconButton
            label={t('header.callWaiter')}
            text={t('header.callWaiter')}
            onClick={callWaiter}
          >
            <ConciergeBell size={18} />
          </HeaderIconButton>
          <HeaderIconButton
            label={t('header.language')}
            onClick={toggleLanguage}
            sublabel={getLanguage().toUpperCase()}
          >
            <Globe size={18} />
          </HeaderIconButton>
          <HeaderIconButton
            label={t('header.status')}
            text={t('header.status')}
            onClick={() => onNavigate?.('status')}
          >
            <ReceiptText size={18} />
            {/* Live-Punkt: Status-Farbe der laufenden Runde. Pulsiert, solange
                die Küche arbeitet; bei "fertig" steht er ruhig (der Gast isst,
                der Header soll nicht ewig blinken). Ring in Surface-Farbe hebt
                ihn vom Button ab, gleiches Muster wie das Warenkorb-Badge. */}
            {latestStatus && (
              <span
                aria-hidden="true"
                className={`absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-surface${
                  latestStatus !== 'fertig' ? ' animate-pulse-soft motion-reduce:animate-none' : ''
                }`}
                style={{ backgroundColor: `var(--color-${STATUS_COLORS[latestStatus]})` }}
              />
            )}
          </HeaderIconButton>
          <HeaderIconButton
            label={t('header.cart')}
            text={t('header.cart')}
            onClick={() => setCartOpen((open) => !open)}
          >
            <ShoppingBag size={18} />
            {cart.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-caption font-semibold text-surface">
                {cart.length}
              </span>
            )}
          </HeaderIconButton>

          {cartOpen && <CartDropdown cart={cart} onGoToCart={goToCart} />}
        </div>
      )}

      {waiterCalled && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setWaiterCalled(false)}
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-popover-in flex w-full max-w-md flex-col items-center gap-6 rounded-lg border border-line bg-surface p-8 text-center shadow-lg"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-surface">
              <ConciergeBell size={32} />
            </span>
            <p className="text-h2 font-semibold text-ink-900">{t('header.waiterComing')}</p>
            <Button size="lg" onClick={() => setWaiterCalled(false)}>
              {t('header.waiterDismiss')}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
