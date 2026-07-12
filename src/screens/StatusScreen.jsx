import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  MotionConfig,
  useMotionValue,
  useTransform,
  useReducedMotion,
  animate,
} from 'motion/react';
import { ClipboardList, ChefHat, BellRing, Soup, CupSoda, Clock } from 'lucide-react';
import { STATUS_FLOW, STATUS_COLORS } from '../config/orderStatus';
import { fetchSessionOrders, subscribeToOrders } from '../services/dataService';
import { useOrderStore, bowlSceneIngredients } from '../state/orderStore';
import AddCard from '../components/AddCard';
import Button from '../components/Button';
import BowlThumbnail from '../components/BowlThumbnail';
import ItemThumbnail from '../components/ItemThumbnail';
import { t } from '../i18n';

// Die echte Bowl-Szene kocht im Hero die Runde nach; wie im Builder lazy,
// damit der Status-Screen ohne Bestellung three.js nicht lädt.
const BowlScene = lazy(() => import('../scene/BowlScene'));

// Live-Status: links der Fortschritt der letzten Runde (Supabase-Realtime,
// CLAUDE.md §6) mit Nachbestell-Weiche, rechts die ganze Rechnung samt Bezahlen
// direkt unter der Gesamtsumme. Nachbestellen jederzeit möglich.
//
// Bewegung ist hier Nutzerführung (CLAUDE.md §5, Grenze CSS vs. motion/react):
// die Choreografie läuft über motion/react, weil sie datengetrieben ist. Der
// Realtime-Refetch ersetzt bei jedem Event alle Objekt-Identitäten, darum überall
// initial={false} + Varianten-Labels (statt Inline-Keyframes) + primitive Keys;
// motion re-triggert nur bei echtem Label-Wechsel, ein Re-Render mit gleichem
// Status bleibt ein No-Op.

const STATUS_ICONS = { aufgenommen: ClipboardList, in_zubereitung: ChefHat, fertig: BellRing };

// Geschätzte Zubereitungszeit gesamt (Minuten) für den ruhigen ETA-Hinweis am
// Status-Hero. Bewusst eine Schätzung ab created_at, kein sekundengenauer Timer:
// die Küche schaltet manuell, die Auto-Simulation schnell. Läuft fertig -> done.
// 7 statt 10: eine Ramen-Küche ist schnell.
const PREP_ESTIMATE_MIN = 7;

// --- Küchen-Choreografie im Status-Hero (Zeiten in Sekunden) ---
// Der Anrichte-Plan (Brühe -> Zutaten -> Beilagen/Getränke) wird während
// "in Zubereitung" Schritt für Schritt sichtbar. Zeitbasis ist created_at:
// deterministisch, ein Wiederbesuch des Screens zeigt den richtigen
// Zwischenstand statt von vorn zu kochen. Der Status hat immer Vorrang:
// "aufgenommen" zeigt nichts bzw. die leere Schüssel, "fertig" alles.
const COOK_START_S = 5; // ab hier füllt sich die Brühe (Sim schaltet nach 5s um)
const COOK_STEP_S = 2.5; // Abstand, in dem der nächste Baustein erscheint
// Max. Begleiter (weitere Bowls + Getränke/Beilagen als Sorten) neben der
// Hero-Bowl. Getränke/Beilagen zählen als Sorte (2× Cola = eine Cola): reine
// Menü-Veranschaulichung, die Rechnung rechts zeigt die exakten Mengen. Nach
// dem Ansehen leicht auf 5 änderbar.
const HERO_COMPANION_LIMIT = 4;

// Große, rahmen-proportionierte Begleiter: die PNGs sind ~1.83:1-Querformat-Rahmen
// mit zentriertem Objekt + gebackenem Schatten. Breite Boxen lassen Glas/Teller in
// Referenz-Größe erscheinen (Glas ragt hoch, Teller/Schale sitzen tief); der
// transparente Rand überlappt die Nachbarn harmlos.
// Breite der Begleiter-Boxen in px. SELBST ANPASSBAR: kleiner = kleineres Bild.
const SIDE_W = 200; // Beilagen (Gyoza, Reis, Karaage ...) -> Standard für Beilagen
const DRINK_W = 270; // Getränke (Glas, Flasche, Dose)
const BOWL_COMPANION_W = 240; // px, Breite einer weiteren Bowl (Thumbnail)
// Einzelne Artikel, die im eigenen Rahmen größer/kleiner wirken, gezielt per Name
// feinjustieren (überschreibt SIDE_W/DRINK_W nur für diesen Artikel). SELBST ANPASSBAR.
const ITEM_W_OVERRIDE = {
  'Matcha Tee (Warm)': 205, // Tasse füllt den Rahmen stärker -> kleiner
  Edamame: 165, // Schälchen wirkt sonst groß -> kleiner
};
// Fächerung der Flanker (Teller/Schalen/weitere Bowls) um die Bowl, HINTER dem
// Canvas (z < Hero), eng überlappend wie ein Menü-Foto. Slot-Reihenfolge siehe
// flankSlot (erst links, dann rechts, weitere nach rechts-außen).
const FAN_BASE = 100; // px, Versatz des ersten Flankers von der Mitte
const FAN_STEP = 105; // px, Zuwachs nach außen
const FLANK_RISE = 16; // px, äußere Flanker sitzen höher = wirken weiter hinten
const DRINK_LIFT = '3rem'; // Getränk steht höher = weiter hinten
const DRINK_X0 = 130; // px, ein einzelnes Getränk sitzt rechts hinter der Bowl
const DRINK_SPREAD = 70; // px, Abstand nebeneinander stehender Getränke (eng)
const DRINK_SHIFT = 0.35; // wie stark die Getränke-Reihe je Anzahl nach links rückt (bleibt im Bild)
const DRINK_BOWL_SHIFT = 80; // px, extra Versatz nach rechts, wenn eine weitere Bowl rechts steht
const NOHERO_SPREAD = 130; // px, Abstand der Begleiter im Fall ohne Ramen (zentrierte Reihe)

// ETA-Text je Status: "fertig" grüßt, sonst geschätzte Restzeit ab Bestellzeit
// (nach unten offen -> "gleich fertig"). nowMs kommt vom Minuten-Ticker im Screen.
function etaText(status, createdAt, nowMs) {
  if (status === 'fertig') return t('status.eta.done');
  const createdMs = createdAt ? new Date(createdAt).getTime() : nowMs;
  const remaining = Math.ceil(PREP_ESTIMATE_MIN - (nowMs - createdMs) / 60000);
  return remaining >= 1 ? t('status.eta.remaining', { min: remaining }) : t('status.eta.soon');
}

// --- Bewegungs-Tuning (alle Zeiten in Sekunden) ---
const HALF_FILL_S = 0.25; // eine Halblinie füllt sich
const SEGMENT_FILL_S = 0.5; // ganzes Segment voll -> danach poppt/färbt der Schritt
const STEP_STAGGER_S = 0.6; // Versatz je übersprungenem Schritt (Küche schaltet mehrstufig)
const POP_SPRING = { type: 'spring', stiffness: 500, damping: 20 }; // Icon-Pop
const HEADLINE_SPRING = { type: 'spring', stiffness: 320, damping: 14 }; // Headline-Wechsel
const HEADLINE_SPRING_FERTIG = { type: 'spring', stiffness: 550, damping: 12 }; // Fertig kräftiger

// Halblinie: absolute Füll-Schicht, wächst per scaleX von links (originX am Element).
const LINE_VARIANTS = { empty: { scaleX: 0 }, filled: { scaleX: 1 } };

// Transform-Choreografie des Icons (NUR transform, damit der CSS-Puls am äußeren
// Badge konfliktfrei bleibt: dort laufen die Farben über motion, der Puls über CSS).
// Varianten-Labels statt Inline-Keyframes -> die Endlos-Wippe startet beim Refetch
// nicht neu. Der Delay kommt bei pop/ring über die custom-Prop rein.
const ICON_VARIANTS = {
  still: { scale: 1, rotate: 0, transition: { duration: 0 } },
  // D: Koch wippt sanft im Loop, solange "in Zubereitung" aktiv ist
  wobble: {
    scale: 1,
    rotate: [-4, 4],
    transition: { duration: 1.8, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' },
  },
  // A: Icon poppt beim Erreichen des Schritts
  pop: (delay) => ({
    scale: [1, 1.25, 1],
    rotate: 0,
    transition: { ...POP_SPRING, delay },
  }),
  // C: Glocke klingelt beim Erreichen von "fertig"
  ring: (delay) => ({
    scale: [1, 1.25, 1],
    rotate: [0, -14, 11, -8, 5, -2, 0],
    transition: { duration: 0.9, ease: 'easeOut', delay },
  }),
};

// Getränke/Beilagen zusammenfassen ("2× Gyoza (Gebraten)"), Bowls bleiben
// einzelne Zeilen, damit jede ihr eigenes Bild zeigen kann.
function groupItems(items) {
  const groups = new Map();
  const rows = [];
  for (const item of items) {
    if (item.type === 'bowl') {
      rows.push({ name: item.name, price: item.price, count: 1, config: item.config });
      continue;
    }
    if (groups.has(item.name)) {
      groups.get(item.name).count += 1;
    } else {
      const entry = { name: item.name, price: item.price, count: 1, config: null };
      groups.set(item.name, entry);
      rows.push(entry);
    }
  }
  return rows;
}

// Eine Nachbestell-Karte der Weiche: ruhige Surface-Karte, großes Touch-Ziel.
function ReorderCard({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-line bg-surface p-5 text-body font-semibold text-ink-900 transition-colors hover:border-ink-400"
    >
      <Icon size={32} className="text-ink-600" aria-hidden="true" />
      {label}
    </button>
  );
}

// Ein Begleiter der Menü-Komposition (Getränk/Beilage): das große Produktbild.
// Die PNGs bringen ihren eigenen gebackenen Schatten mit (kein extra Schatten),
// der beim Bottom-Ausrichten die gemeinsame Standlinie bildet.
function HeroSideItem({ item }) {
  const width = ITEM_W_OVERRIDE[item.name] ?? (item.type === 'drink' ? DRINK_W : SIDE_W);
  return (
    <span className="block" style={{ width: `${width}px` }}>
      <ItemThumbnail item={item} className="w-full" />
    </span>
  );
}

// Position als Style: horizontaler Versatz von der Mitte, Standlinie, z-Ebene.
function posStyle(offset, bottom, zIndex) {
  return { left: '50%', bottom, transform: `translateX(calc(-50% + ${offset}px))`, zIndex };
}

// Platzierung aller Begleiter nach Rolle:
//  - Getränke: hintere Reihe (z=1), hoch, nach RECHTS gruppiert -> ragen hinter
//    Bowl und Beilagen hoch.
//  - Beilagen: flankieren VOR den Getränken (z hoch), LINKS zuerst; äußere sitzen
//    höher (FLANK_RISE) -> wirken weiter hinten statt "unter" der inneren.
//  - Weitere Bowls: breit, deshalb nach LINKS-außen (hinter die inneren Beilagen),
//    damit sie das rechts sitzende Getränk nicht verdecken.
// Flanker-Slot je Reihenfolge: erst L0, dann R0, danach nach RECHTS-außen (R1, R2 …),
// dann links-außen (L1, L2 …). So sitzt die erste weitere Bowl links neben der Hero,
// weitere sammeln sich rechts daneben statt links auszufransen.
function flankSlot(i) {
  if (i === 0) return { side: -1, rank: 0 };
  if (i === 1) return { side: 1, rank: 0 };
  const j = i - 2;
  return j % 2 === 0 ? { side: 1, rank: 1 + j / 2 } : { side: -1, rank: 1 + (j - 1) / 2 };
}

function layoutCompanions(list) {
  const roleOf = (c) => (c.kind === 'bowl' ? 'bowl' : c.item.type === 'drink' ? 'drink' : 'side');
  const rise = (rank) => `calc(3rem + ${rank * FLANK_RISE}px)`;
  // 1. Durchgang: Flanker (weitere Bowls + Beilagen, Bowls-first) platzieren und
  //    merken, ob rechts eine Bowl steht (dann kommt das Getränk davor statt dahinter).
  const flank = new Map();
  let fi = 0;
  let hasRightBowl = false;
  list.forEach((c, idx) => {
    if (roleOf(c) === 'drink') return;
    const { side, rank } = flankSlot(fi);
    fi += 1;
    const offset = side * (FAN_BASE + rank * FAN_STEP);
    flank.set(idx, { offset, rank });
    if (roleOf(c) === 'bowl' && offset > 0) hasRightBowl = true;
  });
  const nDrinks = list.filter((c) => roleOf(c) === 'drink').length;
  const drinkBase = DRINK_X0 + (hasRightBowl ? DRINK_BOWL_SHIFT : 0);
  const drinkZ = hasRightBowl ? 8 : 1; // vor die weitere Bowl (sichtbar) statt dahinter
  let di = 0;
  return list.map((c, idx) => {
    if (roleOf(c) === 'drink') {
      const offset = drinkBase + (di - (nDrinks - 1) * DRINK_SHIFT) * DRINK_SPREAD;
      di += 1;
      return posStyle(offset, DRINK_LIFT, drinkZ);
    }
    const { offset, rank } = flank.get(idx);
    return posStyle(offset, rise(rank), 5 - rank);
  });
}

// prevIndex = Status-Index der letzten Runde im vorherigen Render (aus dem Parent).
// Nur Schritte mit prevIndex < index <= currentIndex sind NEU erreicht und tragen
// die Choreografie; Erst-Mount und neue Runde liefern prevIndex === currentIndex
// (Differenz 0 => alles steht ohne Animation sofort richtig).
function StatusTracker({ status, prevIndex }) {
  const currentIndex = STATUS_FLOW.indexOf(status);
  const lastIndex = STATUS_FLOW.length - 1;
  return (
    <ol className="-mt-3 flex w-full max-w-xl">
      {STATUS_FLOW.map((step, index) => {
        const Icon = STATUS_ICONS[step];
        const reached = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const nextStep = STATUS_FLOW[index + 1];
        const justReached = prevIndex < index && index <= currentIndex;
        // Versatz dieses Schritts bei Mehrstufen-Sprung: der erste neue Schritt
        // startet bei 0, jeder weitere um STEP_STAGGER_S später.
        const stepBase = (index - prevIndex - 1) * STEP_STAGGER_S;

        // --- Halblinien: die Linie läuft ins Icon hinein ---
        // Rechte Hälfte dieses Schritts = erste Hälfte des Segments zum nächsten
        // Schritt; füllt sich, sobald der nächste Schritt neu erreicht wird.
        const rightFilled = index + 1 <= currentIndex;
        const rightJustReached = prevIndex < index + 1 && index + 1 <= currentIndex;
        const rightDelay = rightJustReached ? (index - prevIndex) * STEP_STAGGER_S : 0;
        const rightColor = nextStep
          ? `var(--color-${STATUS_COLORS[nextStep]})`
          : 'var(--color-line)';
        // Linke Hälfte dieses Schritts = zweite Hälfte des Segments vom vorherigen
        // Schritt; füllt sich eine Halblinie nach der rechten Hälfte.
        const leftFilled = index > 0 && index <= currentIndex;
        const leftDelay = justReached ? stepBase + HALF_FILL_S : 0;
        const leftColor = `var(--color-${STATUS_COLORS[step]})`;

        // --- Badge: NUR Farben (bg/border/color), Transform-Pop liegt separat auf
        // dem inneren Icon-Wrapper. Delay nach vollem Segment-Fill. ---
        const badgeDelay = justReached ? stepBase + SEGMENT_FILL_S : 0;
        const badgeAnimate = reached
          ? {
              backgroundColor: `var(--color-${STATUS_COLORS[step]})`,
              borderColor: `var(--color-${STATUS_COLORS[step]})`,
              color: 'var(--color-surface)',
            }
          : {
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-line)',
              color: 'var(--color-ink-400)',
            };

        // --- Icon-Transform: Wippen (D), Klingeln (C) oder Pop (A) ---
        let iconLabel = 'still';
        let iconDelay = 0;
        if (step === 'in_zubereitung' && isCurrent) {
          iconLabel = 'wobble';
        } else if (step === 'fertig' && justReached) {
          iconLabel = 'ring';
          iconDelay = stepBase + SEGMENT_FILL_S + 0.25;
        } else if (justReached) {
          iconLabel = 'pop';
          iconDelay = stepBase + SEGMENT_FILL_S;
        }

        return (
          <li key={step} className="flex flex-1 flex-col items-center gap-3">
            {/* Icon-Zeile voller Breite: Halblinien und Badge werden gegen die feste
                Höhe h-20 zentriert, dadurch liegen die Linien exakt auf Icon-Mitte. */}
            <div className="flex h-20 w-full items-center">
              <span
                aria-hidden="true"
                className={`relative mr-3 h-1 flex-1 overflow-hidden rounded-full bg-line${
                  index === 0 ? ' invisible' : ''
                }`}
              >
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: leftColor, originX: 0 }}
                  variants={LINE_VARIANTS}
                  initial={false}
                  animate={leftFilled ? 'filled' : 'empty'}
                  transition={{ duration: HALF_FILL_S, ease: 'easeOut', delay: leftDelay }}
                />
              </span>
              <motion.span
                className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2${
                  isCurrent ? ' animate-pulse-soft motion-reduce:animate-none' : ''
                }`}
                initial={false}
                animate={badgeAnimate}
                transition={{ duration: 0.3, delay: badgeDelay }}
              >
                {/* Innerer Wrapper trägt NUR transform (Pop/Wippen/Klingeln); initial="still"
                    statt false, damit die Wippe auch beim Öffnen eines laufenden
                    "in Zubereitung" sofort anläuft (still -> wobble). */}
                <motion.span
                  className="inline-flex"
                  variants={ICON_VARIANTS}
                  custom={iconDelay}
                  initial="still"
                  animate={iconLabel}
                >
                  <Icon size={32} aria-hidden="true" />
                </motion.span>
              </motion.span>
              <span
                aria-hidden="true"
                className={`relative ml-3 h-1 flex-1 overflow-hidden rounded-full bg-line${
                  index === lastIndex ? ' invisible' : ''
                }`}
              >
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: rightColor, originX: 0 }}
                  variants={LINE_VARIANTS}
                  initial={false}
                  animate={rightFilled ? 'filled' : 'empty'}
                  transition={{ duration: HALF_FILL_S, ease: 'easeOut', delay: rightDelay }}
                />
              </span>
            </div>
            <span
              className={`text-body font-semibold ${reached ? 'text-ink-900' : 'text-ink-400'}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {t(`status.states.${step}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function StatusScreen({ onNavigate }) {
  const [orders, setOrders] = useState(null); // null = lädt noch
  // Vorheriger Render-Stand der letzten Runde (id + Status-Index). Trennt echten
  // Statuswechsel (gleiche id, Index steigt) von Erst-Mount und neuer Runde
  // (id wechselt) -> nur der echte Wechsel löst die Tracker-Choreografie aus.
  const prevLatestRef = useRef(null);
  // Set der bereits gesehenen Runden-ids (null = noch keine Daten). Die erste
  // Datenlieferung markiert alles ohne Animation; erst danach slidet Neues rein.
  const seenIdsRef = useRef(null);
  const reduceMotion = useReducedMotion();
  // Grobe Uhr für den ETA-Hinweis: tickt minütlich, solange nicht "fertig".
  const [nowMs, setNowMs] = useState(() => Date.now());
  // Frisch bestellte Runde: nach "Bestellen" remountet dieser Screen, die erste
  // Datenlieferung würde sonst ALLE Runden als bekannt markieren. Die Id aus dem
  // Store macht genau diese Runde trotzdem als "neu angekommen" erlebbar
  // (Slide-in, Gold-Glow, Ticker) und wird danach one-shot konsumiert.
  const lastPlacedOrderId = useOrderStore((s) => s.lastPlacedOrderId);
  const consumeLastPlacedOrderId = useOrderStore((s) => s.consumeLastPlacedOrderId);

  useEffect(() => {
    let active = true;
    // Jedes Realtime-Event lädt die Runden samt Positionen neu, das deckt
    // auch neue Bestellungen ab (INSERT hat lokal keine items).
    const load = () =>
      fetchSessionOrders()
        .then((data) => active && setOrders(data))
        .catch((err) => {
          console.error('Bestellungen laden fehlgeschlagen:', err);
          if (active) setOrders((prev) => prev ?? []);
        });
    load();
    const unsubscribe = subscribeToOrders(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const latest = orders?.[orders.length - 1];
  // Koch-Szene: die erste Bowl der Runde kocht (Hero). Begleiter für die
  // Menü-Komposition drumherum: zuerst weitere Bowls (je als Thumbnail), dann
  // Getränke/Beilagen als Sorten (dedupliziert über den Positions-Namen, der
  // die Variante enthält). Begrenzt auf HERO_COMPANION_LIMIT.
  const heroBowl = latest?.items?.find((i) => i.type === 'bowl')?.config ?? null;
  const companions = [];
  for (const item of latest?.items ?? []) {
    if (companions.length >= HERO_COMPANION_LIMIT) break;
    if (item.type === 'bowl' && item.config !== heroBowl) {
      companions.push({ kind: 'bowl', key: `bowl-${companions.length}`, config: item.config });
    }
  }
  for (const item of latest?.items ?? []) {
    if (companions.length >= HERO_COMPANION_LIMIT) break;
    if (item.type === 'bowl') continue;
    if (!companions.some((c) => c.kind === 'item' && c.item.name === item.name)) {
      companions.push({ kind: 'item', key: `item-${item.name}`, item });
    }
  }
  const currentIndex = latest ? STATUS_FLOW.indexOf(latest.status) : -1;
  // prevIndex aus dem Ref lesen: gleiche Runde -> echter Vorgänger-Index;
  // Erst-Mount/neue Runde -> currentIndex (keine Choreografie).
  const prevSame = prevLatestRef.current && latest && prevLatestRef.current.id === latest.id;
  const prevIndex = prevSame ? prevLatestRef.current.index : currentIndex;

  // Ref erst nach dem Commit nachziehen (der Render oben hat den alten Stand
  // schon gelesen).
  useEffect(() => {
    if (latest) {
      prevLatestRef.current = { id: latest.id, index: STATUS_FLOW.indexOf(latest.status) };
    }
  }, [latest?.id, latest?.status]);

  // ETA-Ticker: minütlich die Restzeit nachziehen; bei "fertig" gibt es nichts
  // mehr zu zählen, dann läuft kein Intervall.
  useEffect(() => {
    if (!latest || latest.status === 'fertig') return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(id);
  }, [latest?.id, latest?.status]);

  // Sekunden-Uhr der Koch-Choreografie, läuft nur solange "in Zubereitung":
  // sie schaltet die nächste Zutat frei, die Fall-Animation macht die Szene.
  const [cookNowMs, setCookNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!latest || latest.status !== 'in_zubereitung') return undefined;
    setCookNowMs(Date.now());
    const id = setInterval(() => setCookNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [latest?.id, latest?.status]);

  // Anrichte-Plan: Brühe (1) -> Bowl-Zutaten -> Begleiter. `cooked` = wie viele
  // Plan-Schritte sichtbar sind; Status hat Vorrang ("fertig" zeigt alles).
  // Zeitbasis created_at -> Wiederbesuch zeigt den Zwischenstand statt neu zu
  // kochen.
  const recipe = heroBowl ? bowlSceneIngredients(heroBowl) : [];
  const heroSteps = heroBowl ? 1 + recipe.length : 0;
  const planLength = heroSteps + companions.length;
  let cooked = 0;
  if (latest?.status === 'fertig') {
    cooked = planLength;
  } else if (latest?.status === 'in_zubereitung') {
    const elapsedS = (cookNowMs - new Date(latest.created_at).getTime()) / 1000;
    cooked = Math.max(0, Math.min(planLength, Math.floor((elapsedS - COOK_START_S) / COOK_STEP_S) + 1));
  }
  const visibleBroth = heroBowl && cooked >= 1 ? heroBowl.broth : null;
  const visibleIngredients = recipe.slice(0, Math.max(0, cooked - 1));
  const visibleCompanions = companions.slice(0, Math.max(0, cooked - heroSteps));
  // Position je Begleiter (stabil über alle companions, visibleCompanions ist ein Prefix).
  const companionStyles = layoutCompanions(companions);

  // Gesehene ids nach jedem orders-Commit nachziehen. Die frisch bestellte Runde
  // (lastPlacedOrderId) bleibt bewusst bis zum nächsten Refetch draußen: so
  // überlebt ihr isNew den Re-Render des Konsums und der Gold-Glow läuft zu Ende.
  // Konsumiert wird erst, wenn die Id wirklich geliefert wurde (sonst darf ein
  // späterer Refetch sie noch als neu animieren). lastPlacedOrderId fehlt
  // bewusst in den Deps: pro Daten-Lieferung zählt der Stand ihres Renders.
  useEffect(() => {
    if (!orders) return;
    if (seenIdsRef.current === null) seenIdsRef.current = new Set();
    const placedArrived =
      lastPlacedOrderId !== null && orders.some((o) => o.id === lastPlacedOrderId);
    for (const o of orders) {
      if (placedArrived && o.id === lastPlacedOrderId) continue;
      seenIdsRef.current.add(o.id);
    }
    if (placedArrived) consumeLastPlacedOrderId();
  }, [orders]);

  const grandTotal = (orders ?? []).reduce((sum, o) => sum + o.total, 0);

  // Summen-Ticker: zählt die Gesamtsumme sichtbar hoch, wenn eine Runde
  // dazukommt. Erst-Load und reduced-motion springen hart (jump), sonst animiert
  // ein Standalone-animate() den MotionValue (kein React-Re-Render pro Frame).
  // Ausnahme beim Erst-Load: enthält die erste Lieferung die frisch bestellte
  // Runde (Remount nach "Bestellen"), startet der Ticker bei der Summe OHNE
  // diese Runde und tickt sie sichtbar hoch. lastPlacedOrderId fehlt bewusst in
  // den Deps: One-Shot-Lesung beim Erst-Load, der Konsum im Effect oben darf
  // die laufende Animation nicht stoppen.
  const totalMv = useMotionValue(grandTotal);
  const totalRounded = useTransform(totalMv, (v) => Math.round(v));
  const tickerReadyRef = useRef(false);
  useEffect(() => {
    if (!tickerReadyRef.current) {
      if (orders) tickerReadyRef.current = true; // erst nach echten Daten "scharf"
      const placed =
        !reduceMotion && lastPlacedOrderId !== null
          ? (orders ?? []).find((o) => o.id === lastPlacedOrderId)
          : undefined;
      if (!placed) {
        totalMv.jump(grandTotal);
        return;
      }
      totalMv.jump(grandTotal - placed.total);
    } else if (reduceMotion) {
      totalMv.jump(grandTotal);
      return;
    }
    const controls = animate(totalMv, grandTotal, { duration: 0.8, ease: 'easeOut' });
    return () => controls.stop();
  }, [grandTotal, orders, reduceMotion, totalMv]);

  if (orders && !latest) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-4">
        <h2 className="text-h1">{t('status.emptyTitle')}</h2>
        <p className="text-body text-ink-400">{t('status.emptyHint')}</p>
        <Button onClick={() => onNavigate?.('builder')}>{t('status.emptyCta')}</Button>
      </section>
    );
  }

  // Headline erscheint nach dem Fill des letzten neuen Segments (synchron zum
  // Icon-Pop); bei Mehrstufen-Sprung entsprechend später, nie negativ.
  const headlineDelay = Math.max(
    0,
    (currentIndex - prevIndex - 1) * STEP_STAGGER_S + SEGMENT_FILL_S,
  );
  const headlineSpring = latest?.status === 'fertig' ? HEADLINE_SPRING_FERTIG : HEADLINE_SPRING;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-full min-h-0">
        {/* Aktuelle Runde: Status-Hero und Nachbestell-Weiche. Bezahlen sitzt bewusst
            rechts unter der Rechnungssumme (keine Dopplung mit der Gesamtsumme). */}
        {/* Scroll-Container: zentriert den Hero mittig, wenn Platz da ist (iPad/Tablet),
            und scrollt bei kurzer Hoehe (Handy quer) von oben, statt unter den Header
            zu laufen. min-h-full am Inneren haelt das Zentrieren, kappt den Kopf aber nie. */}
        <section className="min-w-0 flex-1 overflow-y-auto">
          {/* Zone 1: Status-Hero, guarded weil latest beim Laden undefined ist.
              Feste Hero-Breite (max-w-xl): sonst schrumpft der Container auf die
              jeweilige Headline und der Tracker (w-full) springt beim Wechsel mit. */}
          {latest && (
            <div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center gap-3 p-6 pb-12 text-center">
              <p className="text-body font-semibold text-ink-400">
                {t('status.round', { n: orders.length })}
              </p>
              {/* Grid-Stack: ein- und ausblendende Headline liegen in derselben
                  Zelle -> Wechsel ohne Layout-Sprung (kein popLayout). */}
              <div className="grid place-items-center">
                <AnimatePresence initial={false}>
                  <motion.h2
                    key={latest.status}
                    className="font-display text-h1 [grid-area:1/1]"
                    style={{ color: `var(--color-${STATUS_COLORS[latest.status]})` }}
                    initial={{ opacity: 0, scale: 0.75 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      transition: { ...headlineSpring, delay: headlineDelay },
                    }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15, ease: 'easeIn' } }}
                  >
                    {t(`status.headlines.${latest.status}`)}
                  </motion.h2>
                </AnimatePresence>
              </div>
              {/* Ruhige ETA-Zeile unter der Headline (jede Tracking-Referenz führt
                  mit Zeit): geschätzte Restzeit bzw. Gruß, wenn fertig. */}
              <p className="text-body font-medium text-ink-400">
                {etaText(latest.status, latest.created_at, nowMs)}
              </p>
              {/* Lebende Koch-Szene (Chipotle-Muster mit Yuges Wow-Asset): die
                  echte BowlScene kocht die Runde nach. "Aufgenommen" zeigt die
                  leere Schüssel, ab "in Zubereitung" füllt sich die Brühe und
                  die bestellten Zutaten fallen nacheinander (der Dampf kommt
                  aus der Szene, sobald Brühe drin ist), "fertig" steht komplett.
                  Links/rechts ploppt die Anrichte der Runde ein. Der Container
                  hat feste Höhe, damit beim Kochen nichts im Layout springt. */}
              {(heroBowl || companions.length > 0) &&
                (heroBowl ? (
                  <div className="relative flex h-52 w-full items-end justify-center">
                    {/* Begleiter absolut um die Bowl gefächert, HINTER dem Canvas
                        (Menü-Tiefe), ploppen beim Kochen einzeln ein. */}
                    {visibleCompanions.map((c, i) => (
                      <span
                        key={c.key}
                        className="absolute animate-cascade-in motion-reduce:animate-none"
                        style={companionStyles[i]}
                      >
                        {c.kind === 'bowl' ? (
                          <span className="block" style={{ width: `${BOWL_COMPANION_W}px` }}>
                            <BowlThumbnail config={c.config} className="w-full" />
                          </span>
                        ) : (
                          <HeroSideItem item={c.item} />
                        )}
                      </span>
                    ))}
                    <div className="relative z-10 aspect-[700/640] h-full">
                      <Suspense fallback={null}>
                        <BowlScene broth={visibleBroth} ingredients={visibleIngredients} />
                      </Suspense>
                    </div>
                  </div>
                ) : (
                  // Runde ohne Bowl: nur die Begleiter, eng zentrierte Reihe.
                  // Getränke stehen näher zusammen (DRINK_SPREAD) als Beilagen.
                  <div className="relative flex h-52 w-full items-end justify-center overflow-hidden">
                    {visibleCompanions.map((c, idx) => {
                      const n = visibleCompanions.length;
                      const spacing = visibleCompanions.every((x) => x.item.type === 'drink')
                        ? DRINK_SPREAD
                        : NOHERO_SPREAD;
                      const offset = (idx - (n - 1) / 2) * spacing;
                      return (
                        <span
                          key={c.key}
                          className="absolute animate-cascade-in motion-reduce:animate-none"
                          style={{
                            left: '50%',
                            bottom: '2rem',
                            transform: `translateX(calc(-50% + ${offset}px))`,
                            zIndex: 10 - idx,
                          }}
                        >
                          <HeroSideItem item={c.item} />
                        </span>
                      );
                    })}
                  </div>
                ))}
              <StatusTracker status={latest.status} prevIndex={prevIndex} />

              {/* Nachbestell-Weiche, direkt an den Tracker angedockt (keine
                  Trennlinie): "dein Essen kommt" und "du kannst nachbestellen"
                  sollen als EINE Botschaft lesbar sein (Runden-Modell, CLAUDE.md
                  §9). Warme Gold-Fläche macht die Zone zur Einladung statt zum
                  Fußbereich; Getränke/Beilagen ist der häufigste Fall, darf also
                  nicht hinter dem Bowl-Builder versteckt sein. */}
              <div className="mt-2 flex w-full flex-col gap-3 rounded-lg bg-gold/10 p-4">
                <h3 className="text-center text-body-lg">{t('status.reorderTitle')}</h3>
                <div className="flex gap-4">
                  <ReorderCard
                    icon={Soup}
                    label={t('status.reorderBowl')}
                    onClick={() => onNavigate?.('builder')}
                  />
                  <ReorderCard
                    icon={CupSoda}
                    label={t('status.reorderDrinks')}
                    onClick={() => onNavigate?.('cart')}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Rechnung / Tab: alle Runden dieser Session. Bewusst KEIN
            Zustands-Schild "offen/bezahlt": nach dem Bezahlen resettet die
            Session auf den Start, den Gegenzustand sähe also nie jemand.
            Die Zeile "Bezahlt wird am Ende" unten trägt die Botschaft. */}
        <aside className="flex w-2/5 min-w-0 flex-col gap-4 border-l border-line p-6">
          <h3 className="text-h2">{t('status.tab')}</h3>
          <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
            {(orders ?? []).map((order, index) => {
              const isLast = index === (orders?.length ?? 0) - 1;
              // Neu eingetroffene Runde: slidet mit Spring rein und leuchtet kurz
              // golden nach. Bekannte Runden (auch nach Refetch) stehen ruhig.
              // Beim allerersten Daten-Commit (Set noch null, typisch: Remount
              // direkt nach "Bestellen") zählt genau die frisch bestellte Runde
              // (lastPlacedOrderId) als neu, alle älteren stehen sofort.
              const isNew =
                seenIdsRef.current === null
                  ? order.id === lastPlacedOrderId
                  : !seenIdsRef.current.has(order.id);
              return (
                <motion.li
                  key={order.id}
                  className={`relative rounded-lg border bg-surface p-4 ${
                    isLast ? 'border-ink-400' : 'border-line'
                  }`}
                  initial={isNew ? { x: 48, opacity: 0 } : false}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                >
                  {/* Gold-Glow: statisches Overlay, das einmal von deckend auf
                      transparent fadet (nur opacity -> Compositor, kein boxShadow). */}
                  {isNew && (
                    <motion.span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-lg border-2"
                      style={{ borderColor: 'var(--color-gold)' }}
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 1.6, delay: 0.4 }}
                    />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-small font-semibold text-ink-900">
                      {t('status.round', { n: index + 1 })}
                    </span>
                    <motion.span
                      className="rounded-sm px-2 py-0.5 text-caption font-semibold text-surface"
                      initial={false}
                      animate={{ backgroundColor: `var(--color-${STATUS_COLORS[order.status]})` }}
                      transition={{ duration: 0.4 }}
                    >
                      {t(`status.states.${order.status}`)}
                    </motion.span>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {groupItems(order.items ?? []).map((item, itemIndex) => (
                      <li
                        key={`${item.name}-${itemIndex}`}
                        className="flex items-center justify-between gap-2 text-small text-ink-600"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {item.config ? (
                            <BowlThumbnail config={item.config} className="w-12 shrink-0" />
                          ) : (
                            <ItemThumbnail item={item} className="h-10 w-10 shrink-0" />
                          )}
                          <span className="min-w-0 break-words">
                            {item.count > 1 ? `${item.count}× ` : ''}
                            {item.name}
                          </span>
                        </span>
                        <span>{item.price * item.count} €</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex justify-between border-t border-line pt-2 text-small font-semibold text-ink-900">
                    <span>{t('cart.total')}</span>
                    <span>{order.total} €</span>
                  </div>
                </motion.li>
              );
            })}
            {/* Ghost-Zeile: die Rundenliste endet sichtbar offen (gleiche
                gestrichelte Karte wie im Warenkorb). Die Form der Liste sagt
                "hier kommt noch was", ohne Erklärtext. */}
            {(orders?.length ?? 0) > 0 && (
              <li>
                <AddCard label={t('status.nextRound')} onClick={() => onNavigate?.('builder')} />
              </li>
            )}
          </ul>
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <span className="text-small text-ink-400">{t('status.tabTotal')}</span>
            <span className="font-display text-h2 text-ink-900">
              {/* MotionValue als Text: der Ticker aktualisiert die Zahl pro Frame
                  ohne React-Re-Render. */}
              <motion.span>{totalRounded}</motion.span> €
            </span>
          </div>
          {/* Bezahlen sitzt direkt unter der Gesamtsumme der Rechnung: Summe und
              Bezahlweg an einem Ort, keine Dopplung mit der linken Spalte. Dunkel
              gefüllt (Button-Variante dark) statt ghost -> sticht unter der
              Gesamtsumme klar heraus, bleibt aber ruhiger als das Bestell-Rot
              (laute Zone ist die Nachbestell-Weiche). Gestapelt in voller Breite,
              damit die Labels einzeilig bleiben.
              Die Wahl Zusammen | Getrennt führt in den jeweiligen Bezahl-Weg. */}
          <p className="flex items-center justify-center gap-1.5 text-small text-ink-400">
            <Clock size={14} aria-hidden="true" />
            {t('status.payLater')}
          </p>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              variant="dark"
              className="w-full"
              onClick={() => onNavigate?.('pay', { payMode: 'together' })}
            >
              {t('pay.together')}
            </Button>
            <Button
              size="lg"
              variant="dark"
              className="w-full"
              onClick={() => onNavigate?.('pay', { payMode: 'split' })}
            >
              {t('pay.split')}
            </Button>
          </div>
        </aside>
      </div>
    </MotionConfig>
  );
}
