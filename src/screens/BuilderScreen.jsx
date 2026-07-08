import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { STEPS } from '../config/steps';
import { useOrderStore, bowlPrice, bowlSceneIngredients, toppingCount } from '../state/orderStore';
import BowlGraphic from '../components/BowlGraphic';
import BowlThumbnail from '../components/BowlThumbnail';
import Breadcrumb from '../components/Breadcrumb';
import Button from '../components/Button';
import OptionCard from '../components/OptionCard';
import OptionIndex from '../components/OptionIndex';
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
        <div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
          {step.options.map((option) => {
            const qty = bowl.toppings[option.id] ?? 0;
            return (
              <div key={option.id} data-option-id={option.id} className="flex min-w-0 flex-col">
                <OptionCard
                  className="h-full"
                  name={option.name}
                  desc={option.desc}
                  image={`/assets/${step.id}/${option.id}.png`}
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
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // type 'single' (Brühe, Nudeln, Protein)
  return (
    <div className="flex flex-col gap-6">
      {step.modifiers?.hardness && (
        <ModifierGroup
          label={step.modifiers.hardness.label}
          options={step.modifiers.hardness.options}
          value={bowl.hardness}
          onChange={setHardness}
          accent={step.accent}
        />
      )}
      <div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
        {step.options.map((option) => (
          <div key={option.id} data-option-id={option.id} className="flex min-w-0 flex-col">
            <OptionCard
              className="h-full"
              name={option.name}
              desc={option.desc}
              // Brühe wirkt allein wie eine flache Scheibe, deshalb komponiert
              // in der Schüssel zeigen (BowlThumbnail); Rest als einzelnes PNG.
              visual={
                step.id === 'broth' ? (
                  <BowlThumbnail config={{ broth: option.id, toppings: {} }} className="h-full" />
                ) : null
              }
              image={`/assets/${step.id}/${option.id}.png`}
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
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BuilderScreen({ onNavigate, cameFrom }) {
  const bowl = useOrderStore((s) => s.bowl);
  const stepIndex = useOrderStore((s) => s.stepIndex);
  const maxStepIndex = useOrderStore((s) => s.maxStepIndex);
  const goToStep = useOrderStore((s) => s.goToStep);
  const resetBowl = useOrderStore((s) => s.resetBowl);

  // Zurück auf Schritt 1 = Builder verlassen: Entwurf verwerfen, damit keine
  // halbfertige Bowl liegen bleibt. Ausnahme Übersicht ("Ändern"): dort ist die
  // Bowl fertig und muss erhalten bleiben.
  function leaveBuilder() {
    if (cameFrom !== 'overview') resetBowl();
    onNavigate?.(cameFrom ?? 'start');
  }

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const canProceed = step.type !== 'single' || Boolean(bowl[step.id]);

  // Schrittwechsel-Richtung: vorwaerts kommt der Inhalt von rechts, rueckwaerts
  // von links (gilt auch fuer Breadcrumb-Spruenge). Die Richtung wird nur bei einem
  // echten Schrittwechsel neu bestimmt und in einem Ref eingefroren. Wuerden wir sie
  // bei jedem Render frisch berechnen, wuerden spaetere Re-Renders am selben Schritt
  // (z. B. durch die Observer weiter unten) die Richtung anhand des inzwischen
  // aktualisierten Index umkehren und die laufende Animation auf die Gegenrichtung
  // umspringen lassen.
  const prevStepIndexRef = useRef(stepIndex);
  const directionRef = useRef('right');
  if (stepIndex !== prevStepIndexRef.current) {
    directionRef.current = stepIndex > prevStepIndexRef.current ? 'right' : 'left';
    prevStepIndexRef.current = stepIndex;
  }
  const direction = directionRef.current;

  // Nur Schritte mit Options-Karten bekommen die Übersichts-Leiste (kein Finish/Modifier).
  const hasCards = step.type === 'single' || step.type === 'quantity';

  // Scroll-Container der Karten-Liste; darüber laufen Sichtbarkeits- und Overflow-Tracking.
  const scrollRef = useRef(null);
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const [overflowing, setOverflowing] = useState(false);
  const [atBottom, setAtBottom] = useState(true);

  // Springt zur Karte einer Option innerhalb des Scroll-Containers.
  const jumpTo = useCallback((id) => {
    const root = scrollRef.current;
    if (!root) return;
    const el = root.querySelector(`[data-option-id="${id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  // Sichtbarkeits-Tracking: IntersectionObserver mit dem Scroll-Container als root
  // über alle Karten. Beim Schrittwechsel neu aufsetzen (die Karten wechseln).
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !hasCards) {
      setVisibleIds(new Set());
      return undefined;
    }
    const cards = root.querySelectorAll('[data-option-id]');
    const seen = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-option-id');
          if (entry.isIntersecting) seen.add(id);
          else seen.delete(id);
        }
        setVisibleIds(new Set(seen));
      },
      { root, threshold: 0.5 },
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
    // stepIndex neu -> andere Karten; bowl.toppings/single-Auswahl ändert nur Höhen leicht,
    // deshalb reicht der Schrittwechsel als Auslöser fürs Neu-Beobachten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, hasCards]);

  // Overflow-Erkennung: Index erscheint nur, wenn die Liste wirklich überläuft.
  // ResizeObserver auf dem Container plus Neuberechnung beim Schrittwechsel.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !hasCards) {
      setOverflowing(false);
      return undefined;
    }
    const recompute = () => {
      const overflow = root.scrollHeight - root.clientHeight > 4;
      setOverflowing(overflow);
      setAtBottom(root.scrollHeight - root.scrollTop - root.clientHeight <= 4);
    };
    recompute();
    const resizeObserver = new ResizeObserver(recompute);
    resizeObserver.observe(root);
    return () => resizeObserver.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, hasCards]);

  // Scroll-Affordanz am unteren Rand ausblenden, sobald das Ende erreicht ist.
  const handleScroll = useCallback((e) => {
    const root = e.currentTarget;
    setAtBottom(root.scrollHeight - root.scrollTop - root.clientHeight <= 4);
  }, []);

  const selectedIds =
    step.type === 'quantity'
      ? Object.entries(bowl.toppings)
          .filter(([, qty]) => qty > 0)
          .map(([id]) => id)
      : bowl[step.id]
        ? [bowl[step.id]]
        : [];

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
        {/* Schrittwechsel-Animation: nur der neue Inhalt (Titel, Hinweis, Karten)
            gleitet ein, Breadcrumb und Footer bleiben statisch. key={stepIndex}
            haengt den Wrapper bei jedem Schritt neu ein, damit die Animation
            erneut abspielt (Richtung aus direction). */}
        <div
          key={stepIndex}
          className={`flex min-h-0 flex-1 flex-col gap-4 motion-reduce:animate-none ${
            direction === 'right' ? 'animate-step-in-right' : 'animate-step-in-left'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-3 text-h1">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: `var(--color-${step.accent})` }}
              />
              {t(`steps.${step.id}`)}
            </h2>
            {step.type === 'quantity' && (
              <div
                className="flex items-center gap-3 rounded-full border-2 px-4 py-2"
                style={{ borderColor: `var(--color-${step.accent})` }}
              >
                <span aria-hidden="true" className="flex items-center gap-1.5">
                  {Array.from({ length: step.max }).map((_, i) => (
                    <span
                      key={i}
                      className="inline-block h-3 w-3 rounded-full bg-line"
                      style={
                        i < toppingCount(bowl.toppings)
                          ? { backgroundColor: `var(--color-${step.accent})` }
                          : undefined
                      }
                    />
                  ))}
                </span>
                <span className="text-body font-medium text-ink-900">
                  {t('builder.toppingCounter', { used: toppingCount(bowl.toppings), max: step.max })}
                </span>
              </div>
            )}
          </div>
          {step.type === 'quantity' && (
            <p className="text-small text-ink-600">
              {t('builder.toppingHint', { max: step.max })}
            </p>
          )}

          <div className="flex min-h-0 flex-1 gap-4">
            <div className="relative min-w-0 flex-1">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="@container h-full overflow-y-auto overflow-x-hidden pr-1"
              >
                <StepContent step={step} />
              </div>
              {/* Scroll-Affordanz: Verlauf zur Hintergrundfarbe, solange unten noch Inhalt liegt. */}
              {hasCards && overflowing && (
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-bg to-transparent transition-opacity ${
                    atBottom ? 'opacity-0' : 'opacity-100'
                  }`}
                />
              )}
            </div>
            {hasCards && overflowing && (
              <OptionIndex
                options={step.options}
                visibleIds={visibleIds}
                selectedIds={selectedIds}
                accent={step.accent}
                onJump={jumpTo}
              />
            )}
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-line pt-4">
          <Button
            variant="ghost"
            onClick={() => (stepIndex === 0 ? leaveBuilder() : goToStep(stepIndex - 1))}
          >
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
