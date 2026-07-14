import { useEffect, useRef } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';

// DIE Zahlen-Animation der App: zählt einen Betrag sichtbar hoch/runter, wenn er
// sich ändert (Warenkorb-Summe, Bowl-Preis, Beträge pro Person, Rechnung).
// Zahlen sind Ganzzahlen (CLAUDE.md §3.8), darum wird gerundet ausgegeben.
//
// Datengetriebene Bewegung -> motion/react ist hier richtig (CLAUDE.md §5,
// Grenze CSS vs. motion). Pflichten von dort sind eingebaut:
//  - reduced motion: springt hart (jump), animiert nie
//  - der MotionValue rendert den Text selbst, React re-rendert NICHT pro Frame
//
// Verhalten:
//  - Beim ersten Scharfschalten wird der Wert nur gesetzt (kein Hochzählen von 0,
//    sonst tickt jede Zahl bei jedem Screen-Eintritt sinnlos hoch).
//  - Danach animiert jede Änderung.
//
// Props:
//  - value:    Ziel-Zahl (Pflicht)
//  - from:     Startwert für die ERSTE Animation (einmalig, z. B. Status: Summe
//              ohne die frisch bestellte Runde -> die tickt beim Eintritt hoch).
//              null = kein Hochzählen beim Eintritt.
//  - ready:    false = noch keine echten Daten -> Wert nur setzen, nicht scharf
//              schalten (sonst animiert der erste Daten-Eingang von 0 hoch).
//  - duration: Sekunden.
export default function AnimatedNumber({ value, from = null, ready = true, duration = 0.8 }) {
  const reduceMotion = useReducedMotion();
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const armedRef = useRef(false);

  useEffect(() => {
    // Noch nicht scharf: Wert nur setzen und warten (z. B. Daten laden noch).
    if (!ready) {
      mv.jump(value);
      return undefined;
    }
    if (!armedRef.current) {
      armedRef.current = true;
      // Ohne from (oder bei reduced motion) beim Eintritt nicht hochzählen.
      if (reduceMotion || from === null) {
        mv.jump(value);
        return undefined;
      }
      mv.jump(from);
    } else if (reduceMotion) {
      mv.jump(value);
      return undefined;
    }
    const controls = animate(mv, value, { duration, ease: 'easeOut' });
    return () => controls.stop();
    // from bewusst NICHT in den Deps: es zählt nur einmal beim Scharfschalten.
    // Ein späterer Wechsel darf die laufende Animation nicht neu starten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ready, reduceMotion, mv, duration]);

  return <motion.span>{rounded}</motion.span>;
}
