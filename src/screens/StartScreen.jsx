import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import BowlGraphic from '../components/BowlGraphic';
import BowlThumbnail from '../components/BowlThumbnail';
import Button from '../components/Button';
import SteamPuffs from '../components/SteamPuffs';
import { BROTHS, PROTEINS, RECOMMENDED_BOWLS, TOPPINGS } from '../config/menu';
import { bowlPrice, useOrderStore } from '../state/orderStore';
import { t } from '../i18n';

// Kurze Zutaten-Zeile einer Empfehlung: Brühe, Protein und Toppings aus den
// Menü-Namen zusammensetzen (keine doppelten Texte, alles aus config/menu).
function ingredientsLine(config) {
  const names = [];
  const broth = BROTHS.find((b) => b.id === config.broth);
  if (broth) names.push(broth.name);
  const protein = PROTEINS.find((p) => p.id === config.protein);
  if (protein && protein.id !== 'ohne') names.push(protein.name);
  for (const id of Object.keys(config.toppings)) {
    const topping = TOPPINGS.find((tp) => tp.id === id);
    if (topping) names.push(topping.name);
  }
  return names.join(', ');
}

// Szene-Modul (three/R3F) schon im Leerlauf des Start-Screens laden, damit es
// beim Wechsel bereitsteht. Gleicher Modulpfad wie der React.lazy-Import im
// Builder, Vite dedupliziert den Chunk -> beim Ankommen loest React.lazy sofort
// auf und der SceneFallback blitzt nicht auf.
function preloadScene() {
  import('../scene/BowlScene');
}

// Start: Schüssel (bowl_back) steht groß im rechten Drittel, dampfend, klickbar
// (CLAUDE.md §8). Ein Tipp misst das Ist-Rect der Schüssel und übergibt es der
// App; die fliegt das Bild als Shared-Element-Overlay exakt auf die Position der
// 3D-Schüssel im Builder (App.jsx). Hier gibt es keinen eigenen Flug-Code mehr.
export default function StartScreen({ onNavigate }) {
  // Echtes Schüssel-Foto (bowl_back); fehlt es, greift der prozedurale
  // Platzhalter BowlGraphic (CLAUDE.md §7).
  const [bowlMissing, setBowlMissing] = useState(false);
  const loadBowl = useOrderStore((s) => s.loadBowl);
  // Sichtbares Schüssel-Bild: sein Rect (inkl. Schwebe-Offset und Idle-Scale)
  // ist der Startpunkt des Flugs.
  const imgRef = useRef(null);

  // Vorwaermen im Leerlauf: Szene-Modul und die zweite Schuessel-Textur laden,
  // solange der Gast noch schaut. So steht die Szene beim Wechsel schon bereit.
  // Wir mounten bewusst KEIN Canvas im Hintergrund (kein zweiter WebGL-Kontext),
  // sondern waermen nur Modul und Bild vor.
  useEffect(() => {
    function warmUp() {
      preloadScene();
      // bowl_front.png ist auf dem Start-Screen nicht sichtbar (nur bowl_back),
      // liegt also noch nicht im Cache. Vorab dekodieren, damit die Szene beim
      // Wechsel nicht erst auf das Textur-Decoding warten muss. Fire-and-forget,
      // kein State.
      const img = new Image();
      img.src = '/assets/bowl/bowl_front.png';
    }

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warmUp);
      return () => window.cancelIdleCallback(id);
    }
    // Fallback fuer aeltere Safari ohne requestIdleCallback.
    const id = window.setTimeout(warmUp, 300);
    return () => window.clearTimeout(id);
  }, []);

  function start() {
    // Sicherheitsnetz: normalerweise ist die Szene ueber den Idle-Preload beim
    // Mount schon geladen. Dynamische Imports sind idempotent (Vite cached das
    // Promise), ein zweiter Aufruf schadet also nicht.
    preloadScene();
    const img = imgRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Ohne echtes Bild (Platzhalter) oder mit reduzierter Bewegung: direkt
    // wechseln, kein Flug.
    if (reduce || !img) {
      onNavigate?.('builder');
      return;
    }
    // Ist-Rect mitgeben -> App startet den Shared-Element-Flug im selben Event.
    onNavigate?.('builder', { bowlRect: img.getBoundingClientRect() });
  }

  // Schüssel und Haupt-CTA lösen denselben Flug aus. stopPropagation verhindert,
  // dass die Section darüber start() ein zweites Mal feuert.
  function startFromElement(event) {
    event.stopPropagation();
    start();
  }

  return (
    // Die ganze Section ist eine große Klickfläche -> Flug (wie Schüssel/CTA).
    <section
      onClick={start}
      className="relative flex h-full w-full items-center py-8"
    >
      {/* Links: Aktions-Spalte, vertikal zentriert */}
      <div className="flex w-2/5 flex-col items-start justify-center gap-14 p-8">
        {/* CTA + Sekundärpfad: lauteste bzw. leiseste Aktion.
            Haupt-CTA ist reiner Text (kein Hintergrund, kein Rand): jedes Wort
            in einer eigenen Zeile, groß und im Tare-Rot. */}
        <div className="flex flex-col items-start gap-10">
          <button
            type="button"
            onClick={startFromElement}
            aria-label={t('start.buildCta')}
            className="group flex cursor-pointer items-end gap-4 text-left font-display text-display font-bold leading-none text-primary transition-transform active:scale-95"
          >
            <span className="flex flex-col">
              {t('start.buildCta')
                .split(' ')
                .map((word, index) => (
                  <span key={index} className="block">
                    {word}
                  </span>
                ))}
            </span>
            <ArrowRight
              aria-hidden="true"
              className="mb-1 h-[0.7em] w-[0.7em] shrink-0 animate-nudge-x transition-transform group-active:translate-x-1"
            />
          </button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              onNavigate?.('cart');
            }}
          >
            {t('start.drinksOnly')}
          </Button>
        </div>

        {/* Empfehlungen: Schnellstart für Unentschlossene. Ein Tipp lädt die
            fertige Bowl in den Bau-Zustand und führt auf die Übersicht (dort
            prüfen, pro Schritt ändern oder in den Warenkorb legen). Der Wrapper
            stoppt die Propagation, damit die Karten nicht den Start→Builder-Flug
            der Section auslösen. */}
        <div className="flex w-full flex-col gap-3" onClick={(event) => event.stopPropagation()}>
          <p className="text-small font-semibold text-ink-400">{t('start.recommendedTitle')}</p>
          {RECOMMENDED_BOWLS.map((bowl) => (
            <button
              key={bowl.id}
              type="button"
              onClick={() => {
                loadBowl(bowl.config);
                onNavigate?.('overview');
              }}
              className="group flex cursor-pointer items-center gap-3 rounded-lg border-2 border-line bg-surface p-3 text-left transition-colors hover:border-ink-400 active:scale-[0.98]"
            >
              <BowlThumbnail config={bowl.config} className="w-16 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-body font-semibold text-ink-900">{bowl.name}</span>
                <span className="truncate text-small text-ink-400">
                  {ingredientsLine(bowl.config)}
                </span>
              </div>
              <span className="font-display text-h2 text-ink-900">{bowlPrice(bowl.config)} €</span>
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-400 transition-colors group-hover:border-primary group-hover:text-primary"
              >
                <Plus size={18} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Rechts: Schüssel exakt wie gehabt, tippen startet den Bau */}
      <button
        type="button"
        onClick={startFromElement}
        aria-label={t('start.buildCta')}
        className="start-bowl cursor-pointer"
      >
        <span className="start-bowl-inner relative block">
          {/* Boden-/Steh-Schatten: flache, weiche Ellipse am Fuß der Schüssel.
              Liegt fest auf dem "Boden" (schwebt NICHT mit der Bowl mit) und
              erdet sie so. */}
          <span aria-hidden="true" className="start-bowl-shadow pointer-events-none" />

          {/* Dampf: mittig über der Schüssel (geteilte Komponente, auch im Status-Hero) */}
          <SteamPuffs className="absolute inset-x-0 top-6" />

          {/* Schüssel (bowl_back), schwebt sanft */}
          <span className="animate-float block">
            {bowlMissing ? (
              <BowlGraphic className="relative h-auto w-full" />
            ) : (
              <img
                ref={imgRef}
                src="/assets/bowl/bowl_back.png"
                alt=""
                onError={() => setBowlMissing(true)}
                className="relative h-auto w-full object-contain"
              />
            )}
          </span>
        </span>
      </button>
    </section>
  );
}
