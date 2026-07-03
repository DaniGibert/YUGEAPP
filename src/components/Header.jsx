import { useEffect, useRef, useState } from 'react';
import { ConciergeBell, Globe, ReceiptText, ShoppingBag } from 'lucide-react';
import { useOrderStore, cartTotal } from '../state/orderStore';
import BowlThumbnail from './BowlThumbnail';
import Button from './Button';
import { getLanguage, setLanguage, t } from '../i18n';

// Globale Kopfzeile: Logo links (führt zum Start), rechts die globalen Aktionen
// Kellner rufen / Sprache / Bestellstatus / Warenkorb, auf JEDEM Screen
// sichtbar (CLAUDE.md §3.7). `minimal` = Küchen-Modus: nur Logo, keine Gast-Aktionen.
// Der Warenkorb-Button klappt eine kleine Übersicht der aktuellen Runde aus
// (CLAUDE.md §9); bestellt wird weiterhin nur im CartScreen.

function HeaderIconButton({ label, onClick, sublabel, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="relative flex h-11 w-11 cursor-pointer flex-col items-center justify-center rounded-md border border-line bg-surface text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
    >
      {children}
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
                  {item.name}
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
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const hideTimer = useRef(null);
  const cartAreaRef = useRef(null);

  function callWaiter() {
    setWaiterCalled(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setWaiterCalled(false), 3000);
  }

  function toggleLanguage() {
    setLanguage(getLanguage() === 'de' ? 'en' : 'de');
  }

  function goToCart() {
    setCartOpen(false);
    onNavigate?.('cart');
  }

  useEffect(() => () => clearTimeout(hideTimer.current), []);

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
    <header className="relative flex items-center justify-between border-b border-line bg-surface px-8 py-4">
      <button
        type="button"
        onClick={() => onNavigate?.('start')}
        className="cursor-pointer font-display text-h2 text-ink-900"
      >
        Yuge
      </button>

      {!minimal && (
        <div className="flex items-center gap-3" ref={cartAreaRef}>
          <HeaderIconButton label={t('header.callWaiter')} onClick={callWaiter}>
            <ConciergeBell />
          </HeaderIconButton>
          <HeaderIconButton
            label={t('header.language')}
            onClick={toggleLanguage}
            sublabel={getLanguage().toUpperCase()}
          >
            <Globe size={18} />
          </HeaderIconButton>
          <HeaderIconButton label={t('header.status')} onClick={() => onNavigate?.('status')}>
            <ReceiptText />
          </HeaderIconButton>
          <HeaderIconButton
            label={t('header.cart')}
            onClick={() => setCartOpen((open) => !open)}
          >
            <ShoppingBag />
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
        <div className="absolute right-8 top-full z-10 mt-2 rounded-md bg-ink-900 px-4 py-2 text-small text-surface shadow-lg">
          {t('header.waiterComing')}
        </div>
      )}
    </header>
  );
}
