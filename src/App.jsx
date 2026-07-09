import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useLanguage } from './i18n';
import { useDisablePullToRefresh } from './hooks/useDisablePullToRefresh';
import { BOWL_CY, BOWL_W, CANVAS_H, CANVAS_W } from './config/sceneConfig';
import Stage from './components/Stage';
import Header from './components/Header';
import StartScreen from './screens/StartScreen';
import BuilderScreen from './screens/BuilderScreen';
import OverviewScreen from './screens/OverviewScreen';
import CartScreen from './screens/CartScreen';
import StatusScreen from './screens/StatusScreen';
import PayScreen from './screens/PayScreen';
import KitchenScreen from './screens/KitchenScreen';

// Einfacher State-Router: Screen-Id -> Komponente. Der Gast-Flow navigiert
// sich selbst (Start -> Builder -> Übersicht -> Warenkorb -> Status -> Bezahlen);
// Status & Warenkorb sind zusätzlich global über den Header erreichbar.
const SCREENS = {
  start: StartScreen,
  builder: BuilderScreen,
  overview: OverviewScreen,
  cart: CartScreen,
  status: StatusScreen,
  pay: PayScreen,
  kitchen: KitchenScreen,
};

// Personal-Ansicht: eigenes Gerät öffnet die App mit ?ansicht=kueche,
// dann gibt es nur die Küche, ohne Gast-Navigation.
const KITCHEN_MODE = new URLSearchParams(window.location.search).get('ansicht') === 'kueche';

// Übergabe Start -> Builder (Shared-Element-Flug): Sicherheitsnetz, falls
// transitionend oder das Szene-Ready-Signal je ausbleiben (z. B. fehlendes
// Asset, Tab im Hintergrund). Räumt Overlay UND Veil auf, der Builder darf
// nie unsichtbar hängen bleiben. Großzügig, greift im Normalfall nie.
const HANDOFF_FAILSAFE_MS = 2500;
// Kurzer Halt nach der Landung, bevor der Crossfade startet: die Schüssel
// kommt sichtbar zur Ruhe, der Wechsel wirkt wie ein Ankommen.
const HANDOFF_HOLD_MS = 150;

export default function App() {
  // `from` = vorheriger Screen, damit "Zurück" im Builder dorthin führt,
  // wo der Gast wirklich herkam (Start, Status, Warenkorb oder Übersicht).
  const [nav, setNav] = useState({ screen: KITCHEN_MODE ? 'kitchen' : 'start', from: null });
  // Bowl-Flug Start -> Builder als Shared Element: erst navigieren (Builder
  // mountet unsichtbar), dann das ECHTE Ziel messen, dann fliegen. Phasen:
  // off -> flying (Schüssel fliegt, Builder unter Veil) -> landed (wartet auf
  // Szene-Ready) -> revealing (Crossfade: Builder ein, Overlay aus) -> off.
  const [handoff, setHandoff] = useState({ phase: 'off', from: null });
  const mainRef = useRef(null);
  // Das fliegende Overlay-Bild (bowl_back), imperativ per FLIP animiert.
  const flightRef = useRef(null);
  // Landung und Szene-Ready treffen in beliebiger Reihenfolge ein; erst wenn
  // beide da sind, startet der Crossfade. Refs statt State: kein Re-Render nötig.
  const landedRef = useRef(false);
  const sceneReadyRef = useRef(false);
  // Sprachwechsel rendert die ganze App neu (alle t()-Texte aktualisieren sich)
  useLanguage();
  // Kiosk: native Pull-to-Refresh-Geste unterbinden (ergänzt overscroll-behavior)
  useDisablePullToRefresh();
  const Screen = SCREENS[nav.screen];

  // Beim Wechsel Start -> Builder mit gemessenem Start-Rect den Flug im SELBEN
  // Event starten wie die Navigation: React bündelt beide Updates in EINEN
  // Commit, der Tausch Start-Schüssel -> Overlay ist atomar (keine Lücke).
  const navigate = KITCHEN_MODE
    ? undefined
    : (next, meta) => {
        if (next === nav.screen) return;
        if (nav.screen === 'start' && next === 'builder' && meta?.bowlRect) {
          landedRef.current = false;
          sceneReadyRef.current = false;
          setHandoff({ phase: 'flying', from: meta.bowlRect });
        }
        // payMode: vom Status-Screen mitgegeben (Zusammen | Getrennt), damit der
        // Bezahl-Screen direkt in den richtigen Weg startet (kein Zwischenscreen).
        setNav({ screen: next, from: nav.screen, payMode: meta?.payMode ?? null });
      };

  // Crossfade starten, sobald Landung UND Szene-Ready vorliegen (+ kurzer Halt).
  const maybeReveal = useCallback(() => {
    if (!landedRef.current || !sceneReadyRef.current) return;
    window.setTimeout(() => {
      setHandoff((prev) => (prev.phase === 'landed' ? { ...prev, phase: 'revealing' } : prev));
    }, HANDOFF_HOLD_MS);
  }, []);

  // Szene hat ihren ersten Frame gemalt (Signal aus BowlScene via BuilderScreen).
  const handleSceneReady = useCallback(() => {
    sceneReadyRef.current = true;
    maybeReveal();
  }, [maybeReveal]);

  // FLIP-Flug: Ziel aus dem Szenen-Slot des Builders messen (data-scene-slot,
  // hat ab dem ersten Layout seine endgültige Größe) und das Overlay-Bild vom
  // Start-Rect dorthin fliegen. Gleiche Mathe wie FitCamera/Bowl in
  // BowlScene.jsx: zoom = min(slotW/CANVAS_W, slotH/CANVAS_H); die 3D-bowl_back
  // liegt mittig, Welt-y BOWL_CY -> auf dem Schirm -BOWL_CY*zoom unter der
  // Slot-Mitte; Breite = BOWL_W*zoom. Läuft im useLayoutEffect (vor dem Paint),
  // das Bild ist also nie unpositioniert sichtbar.
  useLayoutEffect(() => {
    if (handoff.phase !== 'flying' || !handoff.from) return;
    const img = flightRef.current;
    const main = mainRef.current;
    const slot = main?.querySelector('[data-scene-slot]');
    if (!img || !main || !slot) return; // Failsafe räumt auf

    const m = main.getBoundingClientRect();
    const s = slot.getBoundingClientRect();
    const from = handoff.from;
    const zoom = Math.min(s.width / CANVAS_W, s.height / CANVAS_H) || 1;
    const startX = from.x - m.x + from.width / 2;
    const startY = from.y - m.y + from.height / 2;
    const targetX = s.x - m.x + s.width / 2;
    const targetY = s.y - m.y + s.height / 2 - BOWL_CY * zoom;
    const targetScale = (BOWL_W * zoom) / from.width;

    // FLIP: Start ohne Transition committen, Reflow erzwingen, dann mit der
    // CSS-Transition (--start-flight) zum Ziel. Nur transform animiert ->
    // Compositor-Thread, bleibt flüssig, auch wenn der WebGL-Init den
    // Main-Thread kurz blockiert. Breite bleibt fix, die Größe macht scale.
    img.style.width = `${from.width}px`;
    img.style.transition = 'none';
    img.style.transform = `translate(${startX}px, ${startY}px) translate(-50%, -50%) scale(1)`;
    img.getBoundingClientRect();
    img.style.transition = '';
    img.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%) scale(${targetScale})`;
  }, [handoff]);

  // Sicherheitsnetz: Handoff nach spätestens HANDOFF_FAILSAFE_MS beenden.
  const handoffActive = handoff.phase !== 'off';
  useEffect(() => {
    if (!handoffActive) return undefined;
    const id = window.setTimeout(() => setHandoff({ phase: 'off', from: null }), HANDOFF_FAILSAFE_MS);
    return () => window.clearTimeout(id);
  }, [handoffActive]);

  const revealing = handoff.phase === 'revealing';

  return (
    <Stage>
      <Header onNavigate={navigate} minimal={KITCHEN_MODE} />
      <main ref={mainRef} className="relative min-h-0 flex-1">
        {/* Veil: während des Flugs ist der Builder gemountet (Ziel messbar,
            Szene lädt/malt), aber unsichtbar; blendet nach der Landung ein. */}
        <div className={`h-full ${handoffActive ? `screen-veil ${revealing ? 'is-revealing screen-cascade' : ''}` : ''}`}>
          <Screen
            onNavigate={navigate}
            cameFrom={nav.from}
            payMode={nav.payMode}
            onSceneReady={handleSceneReady}
          />
        </div>
        {handoffActive && (
          <div
            aria-hidden="true"
            className={`start-handoff pointer-events-none ${revealing ? 'is-fading' : ''}`}
            onTransitionEnd={(e) => {
              // Ende des Opacity-Crossfades -> Overlay weg, Veil-Klassen fallen.
              if (e.target === e.currentTarget && e.propertyName === 'opacity') {
                setHandoff({ phase: 'off', from: null });
              }
            }}
          >
            <img
              ref={flightRef}
              src="/assets/bowl/bowl_back.png"
              alt=""
              className="start-handoff-bowl h-auto object-contain"
              onTransitionEnd={(e) => {
                // Gelandet (transform-Transition fertig) -> ggf. Crossfade.
                if (e.propertyName !== 'transform') return;
                landedRef.current = true;
                setHandoff((prev) => (prev.phase === 'flying' ? { ...prev, phase: 'landed' } : prev));
                maybeReveal();
              }}
            />
          </div>
        )}
      </main>
      {/* Vercel Web Analytics: zaehlt Besucher/Seitenaufrufe, nur auf der
          Live-Version aktiv, datenschutzfreundlich (keine Cookies). */}
      <Analytics />
    </Stage>
  );
}
