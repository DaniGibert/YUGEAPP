import { useEffect, useRef, useState } from 'react';
import BowlGraphic from '../components/BowlGraphic';
import Button from '../components/Button';
import { t } from '../i18n';

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

  return (
    <section className="relative flex h-full w-full flex-col items-center justify-end gap-6 py-8">
      {/* Schüssel (rechtes Drittel), tippen startet den Bau */}
      <button
        type="button"
        onClick={start}
        aria-label={t('start.hint')}
        className="start-bowl cursor-pointer"
      >
        <span className="start-bowl-inner relative block">
          {/* Dampf: mittig über der Schüssel */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-6 flex justify-center gap-5"
          >
            {[0, 0.9, 1.8].map((delay) => (
              <span
                key={delay}
                className="animate-steam h-14 w-3 rounded-full bg-line opacity-0 blur-sm"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </span>

          {/* Schüssel (bowl_back), schwebt sanft */}
          <span className="animate-float block">
            {bowlMissing ? (
              <BowlGraphic className="h-auto w-full drop-shadow-xl" />
            ) : (
              <img
                ref={imgRef}
                src="/assets/bowl/bowl_back.png"
                alt=""
                onError={() => setBowlMissing(true)}
                className="h-auto w-full object-contain drop-shadow-xl"
              />
            )}
          </span>
        </span>
      </button>

      {/* Hinweis + Sekundärpfad für Gäste ohne Bowl-Wunsch */}
      <div className="flex flex-col items-center gap-4">
        <p className="text-body-lg text-ink-400">{t('start.hint')}</p>
        <Button size="sm" variant="ghost" onClick={() => onNavigate?.('cart')}>
          {t('start.drinksOnly')}
        </Button>
      </div>
    </section>
  );
}
