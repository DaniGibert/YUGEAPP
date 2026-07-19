import { lazy, Suspense } from 'react';
import { STEPS } from '../config/steps';
import { BROTHS, NOODLES, NOODLE_FIRMNESS, PROTEINS, TOPPINGS } from '../config/menu';
import { useOrderStore, bowlPrice, bowlSceneIngredients } from '../state/orderStore';
import Button from '../components/Button';
import { t, tx } from '../i18n';

const BowlScene = lazy(() => import('../scene/BowlScene'));

// Übersicht: die fertig gebaute Bowl prüfen, je Schritt ändern oder
// in den Warenkorb legen (CLAUDE.md §9: Warenkorb = Entwurf, noch nicht bestellt).

const find = (list, id) => list.find((o) => o.id === id);

// Options-Label einer Modifier-Gruppe aus der gewählten ID (Härte, Finish).
const optionLabel = (group, id) => tx(group.options.find((o) => o.id === id)?.label) || id;

// Zusammenfassungstext je Bau-Schritt, datengesteuert aus STEPS.
function stepSummary(step, bowl) {
  switch (step.id) {
    case 'broth':
      return tx(find(BROTHS, bowl.broth)?.name);
    case 'noodle': {
      const noodle = find(NOODLES, bowl.noodle);
      return noodle ? `${tx(noodle.name)} (${optionLabel(NOODLE_FIRMNESS, bowl.hardness)})` : null;
    }
    case 'protein': {
      const protein = find(PROTEINS, bowl.protein);
      if (!protein) return null;
      return protein.price > 0 ? `${tx(protein.name)} (+${protein.price} €)` : tx(protein.name);
    }
    case 'topping': {
      const parts = Object.entries(bowl.toppings).map(
        ([id, qty]) => `${qty}× ${tx(find(TOPPINGS, id)?.name)}`,
      );
      return parts.length > 0 ? parts.join(', ') : t('overview.none');
    }
    case 'finish':
      return Object.entries(step.modifiers)
        .map(([key, group]) => `${tx(group.label)}: ${optionLabel(group, bowl.finish[key])}`)
        .join(' · ');
    default:
      return null;
  }
}

export default function OverviewScreen({ onNavigate }) {
  const bowl = useOrderStore((s) => s.bowl);
  const goToStep = useOrderStore((s) => s.goToStep);
  const addBowlToCart = useOrderStore((s) => s.addBowlToCart);

  // Direkt hierher navigiert, ohne Bowl? Freundlich zurückführen.
  if (!bowl.broth) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-4">
        <h2 className="text-h1">{t('overview.emptyTitle')}</h2>
        <p className="text-body text-ink-400">{t('overview.emptyHint')}</p>
        <Button onClick={() => onNavigate?.('builder')}>{t('overview.emptyCta')}</Button>
      </section>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Bowl-Szene */}
      <aside className="flex w-2/5 min-w-0 flex-col border-r border-line p-6">
        <div className="min-h-0 flex-1">
          <Suspense fallback={null}>
            <BowlScene broth={bowl.broth} ingredients={bowlSceneIngredients(bowl)} modifiers={bowl.finish} />
          </Suspense>
        </div>
      </aside>

      {/* Zusammenfassung */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
        <h2 className="text-h1">{t('overview.title')}</h2>

        <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {STEPS.map((step, index) => (
            <li
              key={step.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1.5 inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: `var(--color-${step.accent})` }}
                />
                <div className="min-w-0">
                  <p className="text-small text-ink-400">{t(`steps.${step.id}`)}</p>
                  <p className="break-words text-body font-semibold text-ink-900">
                    {stepSummary(step, bowl)}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  goToStep(index);
                  onNavigate?.('builder');
                }}
              >
                {t('overview.edit')}
              </Button>
            </li>
          ))}
        </ul>

        <footer className="flex items-center justify-between gap-4 border-t border-line pt-4">
          <div className="flex items-baseline gap-3">
            <span className="text-small text-ink-400">{t('overview.total')}</span>
            <span className="font-price text-h2 font-bold text-ink-900">{bowlPrice(bowl)} €</span>
          </div>
          <Button
            size="lg"
            onClick={() => {
              addBowlToCart();
              onNavigate?.('cart');
            }}
          >
            {t('overview.addToCart')}
          </Button>
        </footer>
      </div>
    </div>
  );
}
