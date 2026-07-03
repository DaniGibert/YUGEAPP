import { useEffect, useRef, useState } from 'react';
import { ConciergeBell, Globe, ReceiptText, ShoppingBag } from 'lucide-react';
import { useOrderStore } from '../state/orderStore';
import { t } from '../i18n';

// Globale Kopfzeile: Logo links (führt zum Start), rechts die globalen Aktionen
// Kellner rufen / Sprache / Bestellstatus / Warenkorb, auf JEDEM Screen
// sichtbar (CLAUDE.md §3.7). `minimal` = Küchen-Modus: nur Logo, keine Gast-Aktionen.

function HeaderIconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border border-line bg-surface text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
    >
      {children}
    </button>
  );
}

export default function Header({ onNavigate, minimal = false }) {
  const cartCount = useOrderStore((s) => s.cart.length);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const hideTimer = useRef(null);

  function callWaiter() {
    setWaiterCalled(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setWaiterCalled(false), 3000);
  }

  useEffect(() => () => clearTimeout(hideTimer.current), []);

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
        <div className="flex items-center gap-3">
          <HeaderIconButton label={t('header.callWaiter')} onClick={callWaiter}>
            <ConciergeBell />
          </HeaderIconButton>
          <HeaderIconButton label={t('header.language')}>
            <Globe />
          </HeaderIconButton>
          <HeaderIconButton label={t('header.status')} onClick={() => onNavigate?.('status')}>
            <ReceiptText />
          </HeaderIconButton>
          <HeaderIconButton label={t('header.cart')} onClick={() => onNavigate?.('cart')}>
            <ShoppingBag />
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-caption font-semibold text-surface">
                {cartCount}
              </span>
            )}
          </HeaderIconButton>
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
