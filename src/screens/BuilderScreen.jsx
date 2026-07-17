import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { STEPS } from '../config/steps';
import { useOrderStore, bowlPrice, bowlSceneIngredients, toppingCount } from '../state/orderStore';
import AnimatedNumber from '../components/AnimatedNumber';
import BowlGraphic from '../components/BowlGraphic';
import BowlThumbnail from '../components/BowlThumbnail';
import Breadcrumb from '../components/Breadcrumb';
import Button from '../components/Button';
import OptionCard from '../components/OptionCard';
import OptionIndex from '../components/OptionIndex';
import ModifierGroup from '../components/ModifierGroup';
import QuantityStepper from '../components/QuantityStepper';
import { t, tx } from '../i18n';

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
                  name={tx(option.name)}
                  desc={tx(option.desc)}
                  diet={option.diet}
                  allergens={option.allergens}
                  image={`/assets/${step.id}/${option.id}.png`}
                  // Topping-PNGs haben viel transparenten Rand -> groesserer Bildbereich,
                  // damit das Objekt die Kartenbreite fuellt.
                  imageClassName="h-40"
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
              name={tx(option.name)}
              desc={tx(option.desc)}
              diet={option.diet}
              allergens={option.allergens}
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

export default function BuilderScreen({ onNavigate, cameFrom, onSceneReady }) {
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

  // Erledigt-Zustand je Schritt für den Breadcrumb-Haken (P3): Pflichtschritte
  // (single) sind erledigt, sobald gewählt; Toppings, sobald eines gewählt ist;
  // Finish gilt als erledigt, sobald der Schritt besucht wurde (gültige Defaults).
  // Ob ein Schritt Pflicht ist, leitet der Breadcrumb selbst aus step.type ab.
  const completedSteps = STEPS.map((s, i) => {
    if (s.type === 'single') return Boolean(bowl[s.id]);
    if (s.type === 'quantity') return toppingCount(bowl.toppings) > 0;
    return i <= maxStepIndex;
  });

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
        {/* data-scene-slot: Mess-Anker fuer den Bowl-Flug (App.jsx). Der Slot hat
            ab dem ersten Layout seine endgueltige Groesse, unabhaengig davon, ob
            die Szene (Suspense) schon steht -> im Gegensatz zum Canvas selbst,
            das mit der Browser-Default-Groesse 300x150 startet. */}
        <div className="min-h-0 flex-1" data-scene-slot>
          <Suspense fallback={<SceneFallback />}>
            <BowlScene
              broth={bowl.broth}
              ingredients={bowlSceneIngredients(bowl)}
              modifiers={bowl.finish}
              onReady={onSceneReady}
            />
          </Suspense>
        </div>
      </aside>

      {/* Aktueller Schritt */}
      {/* step-room: der rechte Bereich traegt die Kategorie-Farbe des aktiven
          Schritts als leise Raum-Toenung (Mischung/Uebergang in theme.css). */}
      <div
        className="step-room flex min-w-0 flex-1 flex-col gap-4 p-6"
        style={{ '--step-accent': `var(--color-${step.accent})` }}
      >
        <Breadcrumb
          currentIndex={stepIndex}
          maxVisitedIndex={maxStepIndex}
          completed={completedSteps}
          onSelect={goToStep}
        />
        {/* Filmstrip: alle Schritte liegen als Panels nebeneinander in einem Track,
            der per translateX um genau eine Panel-Breite pro Schritt verschoben wird.
            Vorwaerts faehrt der Streifen nach links, rueckwaerts nach rechts. Inaktive
            Panels sind inert (nicht klick-/fokussierbar, fuer Screenreader unsichtbar). */}
        {/* cascade-item: faehrt nur beim Flug-Eintritt (screen-cascade am Wrapper) von unten rein. */}
        <div className="relative min-h-0 flex-1 overflow-clip cascade-item" style={{ '--cascade-i': 0 }}>
          <div
            className="flex h-full transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${stepIndex * 100}%)` }}
          >
            {STEPS.map((panelStep, i) => {
              const isActive = i === stepIndex;
              const panelHasCards = panelStep.type === 'single' || panelStep.type === 'quantity';
              return (
                <div
                  key={panelStep.id}
                  inert={!isActive}
                  className="flex h-full w-full min-w-0 shrink-0 flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Akzent-Marker: kurzer, dicker Unterstrich in voller Kategorie-Farbe
                        unter der Ueberschrift (ersetzt den alten Farbpunkt). */}
                    <h2 className="flex flex-col items-start text-h1">
                      {t(`steps.${panelStep.id}`)}
                      <span
                        aria-hidden="true"
                        className="mt-1 block h-1.5 w-12 rounded-full"
                        style={{ backgroundColor: `var(--color-${panelStep.accent})` }}
                      />
                    </h2>
                    {panelStep.type === 'quantity' && (
                      <div
                        className="flex items-center gap-3 rounded-full border-2 px-4 py-2"
                        style={{ borderColor: `var(--color-${panelStep.accent})` }}
                      >
                        <span aria-hidden="true" className="flex items-center gap-1.5">
                          {Array.from({ length: panelStep.max }).map((_, dot) => (
                            <span
                              key={dot}
                              className="inline-block h-3 w-3 rounded-full bg-line"
                              style={
                                dot < toppingCount(bowl.toppings)
                                  ? { backgroundColor: `var(--color-${panelStep.accent})` }
                                  : undefined
                              }
                            />
                          ))}
                        </span>
                        <span className="text-body font-medium text-ink-900">
                          {t('builder.toppingCounter', { used: toppingCount(bowl.toppings), max: panelStep.max })}
                        </span>
                      </div>
                    )}
                  </div>
                  {panelStep.type === 'quantity' && (
                    <p className="text-small text-ink-600">
                      {t('builder.toppingHint', { max: panelStep.max })}
                    </p>
                  )}

                  <div className="flex min-h-0 flex-1 gap-4">
                    <div className="relative min-w-0 flex-1">
                      <div
                        ref={isActive ? scrollRef : undefined}
                        onScroll={isActive ? handleScroll : undefined}
                        className="@container h-full overflow-y-auto overflow-x-hidden pr-1"
                      >
                        <StepContent step={panelStep} />
                      </div>
                      {/* Scroll-Affordanz: Verlauf zur Hintergrundfarbe, solange unten noch Inhalt liegt. */}
                      {isActive && panelHasCards && overflowing && (
                        <div
                          aria-hidden="true"
                          // Verlauf muss die Raum-Toenung treffen, nicht das Papier-bg.
                          style={{ backgroundImage: 'linear-gradient(to top, var(--step-bg), transparent)' }}
                          className={`pointer-events-none absolute inset-x-0 bottom-0 h-12 transition-opacity ${
                            atBottom ? 'opacity-0' : 'opacity-100'
                          }`}
                        />
                      )}
                    </div>
                    {isActive && panelHasCards && overflowing && (
                      <OptionIndex
                        options={panelStep.options}
                        visibleIds={visibleIds}
                        selectedIds={selectedIds}
                        accent={panelStep.accent}
                        onJump={jumpTo}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-line pt-4 cascade-item" style={{ '--cascade-i': 1 }}>
          <Button
            variant="ghost"
            onClick={() => (stepIndex === 0 ? leaveBuilder() : goToStep(stepIndex - 1))}
          >
            {t('builder.back')}
          </Button>
          {/* Preis klebt am Haupt-CTA (wie sweetgreen/CHOPT und die Übersicht):
              laufender Preis und die weiterführende Aktion an einem Ort, kurze
              Blickwege statt Preis links, Button rechts. */}
          <div className="flex items-center gap-5">
            <div className="flex items-baseline gap-2">
              <span className="text-small text-ink-400">{t('builder.price')}</span>
              <span className="font-display text-h2 text-ink-900">
                <AnimatedNumber value={bowlPrice(bowl)} /> €
              </span>
            </div>
            <Button
              disabled={!canProceed}
              onClick={() => (isLastStep ? onNavigate?.('overview') : goToStep(stepIndex + 1))}
            >
              {isLastStep ? t('builder.toOverview') : t('builder.next')}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
