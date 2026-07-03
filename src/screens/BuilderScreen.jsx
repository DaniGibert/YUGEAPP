import { lazy, Suspense } from 'react';
import { STEPS } from '../config/steps';
import { useOrderStore, bowlPrice, bowlSceneIngredients, toppingCount } from '../state/orderStore';
import BowlGraphic from '../components/BowlGraphic';
import Breadcrumb from '../components/Breadcrumb';
import Button from '../components/Button';
import OptionCard from '../components/OptionCard';
import ModifierGroup from '../components/ModifierGroup';
import QuantityStepper from '../components/QuantityStepper';
import { t } from '../i18n';

// Three.js/R3F erst laden, wenn der Builder wirklich offen ist (Start bleibt leicht).
const BowlScene = lazy(() => import('../scene/BowlScene'));

// Dezente Übergangs-Schüssel, bis die WebGL-Szene geladen ist.
function SceneFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <BowlGraphic className="h-2/3 w-auto max-w-full opacity-50" />
    </div>
  );
}

// Bau-Screen: rendert je Schritt datengesteuert aus config/steps.js (CLAUDE.md §3.3).
// Links die Bowl-Szene (nur Props), rechts der aktuelle Schritt.

// „Passend zur Brühe"-Hinweis (menu.js: pairsWith)
function pairsWithBroth(option, brothId) {
  if (!brothId) return false;
  return option.pairsWith === 'alle' || (option.pairsWith ?? []).includes(brothId);
}

function StepContent({ step }) {
  const bowl = useOrderStore((s) => s.bowl);
  const selectOption = useOrderStore((s) => s.selectOption);
  const setHardness = useOrderStore((s) => s.setHardness);
  const setFinish = useOrderStore((s) => s.setFinish);
  const setToppingQty = useOrderStore((s) => s.setToppingQty);

  if (step.type === 'modifiers') {
    return (
      <div className="flex flex-col gap-6">
        {Object.entries(step.modifiers).map(([key, group]) => (
          <ModifierGroup
            key={key}
            label={group.label}
            options={group.options}
            value={bowl.finish[key]}
            onChange={(value) => setFinish(key, value)}
            accent={step.accent}
          />
        ))}
      </div>
    );
  }

  if (step.type === 'quantity') {
    const used = toppingCount(bowl.toppings);
    return (
      <div className="flex flex-col gap-4">
        <p className="text-small text-ink-400">
          {t('builder.toppingCounter', { used, max: step.max })}
        </p>
        <div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
          {step.options.map((option) => {
            const qty = bowl.toppings[option.id] ?? 0;
            return (
              <OptionCard
                key={option.id}
                name={option.name}
                desc={option.desc}
                selected={qty > 0}
                accent={step.accent}
                badge={pairsWithBroth(option, bowl.broth) ? t('builder.recommended') : null}
                onSelect={() => setToppingQty(option.id, qty + 1)}
              >
                <QuantityStepper
                  value={qty}
                  onChange={(next) => setToppingQty(option.id, next)}
                  canIncrease={used < step.max}
                  accent={step.accent}
                />
              </OptionCard>
            );
          })}
        </div>
      </div>
    );
  }

  // type 'single' (Brühe, Nudeln, Protein)
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
        {step.options.map((option) => (
          <OptionCard
            key={option.id}
            name={option.name}
            desc={option.desc}
            priceText={option.price > 0 ? `+${option.price} €` : null}
            selected={bowl[step.id] === option.id}
            accent={step.accent}
            badge={
              step.id !== 'broth' && pairsWithBroth(option, bowl.broth)
                ? t('builder.recommended')
                : null
            }
            onSelect={() => selectOption(step.id, option.id)}
          />
        ))}
      </div>
      {step.modifiers?.hardness && (
        <ModifierGroup
          label={step.modifiers.hardness.label}
          options={step.modifiers.hardness.options}
          value={bowl.hardness}
          onChange={setHardness}
          accent={step.accent}
        />
      )}
    </div>
  );
}

export default function BuilderScreen({ onNavigate }) {
  const bowl = useOrderStore((s) => s.bowl);
  const stepIndex = useOrderStore((s) => s.stepIndex);
  const maxStepIndex = useOrderStore((s) => s.maxStepIndex);
  const goToStep = useOrderStore((s) => s.goToStep);

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const canProceed = step.type !== 'single' || Boolean(bowl[step.id]);

  return (
    <div className="flex h-full min-h-0">
      {/* Bowl-Szene + Preis */}
      <aside className="flex w-2/5 min-w-0 flex-col gap-4 border-r border-line p-6">
        <div className="min-h-0 flex-1">
          <Suspense fallback={<SceneFallback />}>
            <BowlScene broth={bowl.broth} ingredients={bowlSceneIngredients(bowl)} modifiers={bowl.finish} />
          </Suspense>
        </div>
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-small text-ink-400">{t('builder.price')}</span>
          <span className="font-display text-h2 text-ink-900">{bowlPrice(bowl)} €</span>
        </div>
      </aside>

      {/* Aktueller Schritt */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
        <Breadcrumb currentIndex={stepIndex} maxVisitedIndex={maxStepIndex} onSelect={goToStep} />
        <h2 className="flex items-center gap-3 text-h1">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: `var(--color-${step.accent})` }}
          />
          {t(`steps.${step.id}`)}
        </h2>

        <div className="@container min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
          <StepContent step={step} />
        </div>

        <footer className="flex items-center justify-between border-t border-line pt-4">
          <Button variant="ghost" disabled={stepIndex === 0} onClick={() => goToStep(stepIndex - 1)}>
            {t('builder.back')}
          </Button>
          <Button
            disabled={!canProceed}
            onClick={() => (isLastStep ? onNavigate?.('overview') : goToStep(stepIndex + 1))}
          >
            {isLastStep ? t('builder.toOverview') : t('builder.next')}
          </Button>
        </footer>
      </div>
    </div>
  );
}
