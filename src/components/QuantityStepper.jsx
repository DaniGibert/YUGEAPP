import { Minus, Plus } from 'lucide-react';
import { t } from '../i18n';

// − n +  für Topping-Mengen (CLAUDE.md §4). canIncrease steuert das
// globale Limit (Summe aller Toppings ≤ 4) von außen.
const stepBtn =
  'flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm border border-line bg-surface text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900 disabled:pointer-events-none disabled:opacity-40';

export default function QuantityStepper({ value, onChange, min = 0, canIncrease = true, accent }) {
  return (
    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={t('builder.less')}
        disabled={value <= min}
        onClick={() => onChange?.(value - 1)}
        className={stepBtn}
      >
        <Minus size={16} />
      </button>
      <span
        className="min-w-6 text-center text-body font-semibold text-ink-900"
        style={value > 0 && accent ? { color: `var(--color-${accent})` } : undefined}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={t('builder.more')}
        disabled={!canIncrease}
        onClick={() => onChange?.(value + 1)}
        className={stepBtn}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
