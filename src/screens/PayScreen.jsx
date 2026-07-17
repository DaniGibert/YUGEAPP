import { useEffect, useRef, useState } from 'react';
import { Plus, Check, X, Banknote, CreditCard } from 'lucide-react';
import { fetchSessionOrders, markSessionPaid, resetSession } from '../services/dataService';
import { itemDisplayName } from '../config/menu';
import AnimatedNumber from '../components/AnimatedNumber';
import Button from '../components/Button';
import BowlGraphic from '../components/BowlGraphic';
import BowlThumbnail from '../components/BowlThumbnail';
import ItemThumbnail from '../components/ItemThumbnail';
import SteamPuffs from '../components/SteamPuffs';
import { t } from '../i18n';

// Bezahlen (CLAUDE.md §9): zuerst die Wahl „Zusammen | Getrennt".
// - Zusammen: ganze Rechnung mit einem Tipp begleichen.
// - Getrennt: Drag-to-split, Positionen per Ziehen (oder Antippen, dann Person
//   antippen) auf Personen verteilen; Personen sind hinzufüg- UND entfernbar.
// Am Ende markiert dataService die Session als bezahlt.

// Schwebender Chip: Drag-Geist und Drag-Hinweis teilen dieselbe Optik.
function GhostChip({ item, className = '', style, ...props }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none fixed left-0 top-0 z-50 flex items-center gap-2 rounded-md border border-gold bg-surface px-3 py-2 text-small font-semibold text-ink-900 shadow-lg ${className}`}
      style={style}
      {...props}
    >
      {itemDisplayName(item)} · {item.price} €
    </span>
  );
}

// Demo-Chip: gleitet vom Pool zur ersten offenen Person und zeigt so die Drag-Geste.
function DragHintGhost({ item, from, to, onDone }) {
  return (
    <GhostChip
      item={item}
      className="animate-drag-hint"
      style={{
        '--drag-hint-from-x': `${from.x}px`,
        '--drag-hint-from-y': `${from.y}px`,
        '--drag-hint-to-x': `${to.x}px`,
        '--drag-hint-to-y': `${to.y}px`,
      }}
      onAnimationEnd={onDone}
    />
  );
}

// Eine Rechnungs-Position: draggbar (Pointer) + antippbar (Auswahl).
function BillChip({ item, locked, selected, onSelect, onDrop }) {
  const stateRef = useRef(null);
  const [ghost, setGhost] = useState(null); // {x, y} während des Ziehens

  function handlePointerDown(e) {
    if (locked) return;
    stateRef.current = { x: e.clientX, y: e.clientY, moved: false, suppressClick: false };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* synthetische Events (Tests) haben keine echte pointerId */
    }
  }

  function handlePointerMove(e) {
    const s = stateRef.current;
    if (!s) return;
    if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6) s.moved = true;
    if (s.moved) setGhost({ x: e.clientX, y: e.clientY });
  }

  function handlePointerUp(e) {
    const s = stateRef.current;
    if (!s) return;
    if (s.moved) {
      s.suppressClick = true;
      const zone = document
        .elementsFromPoint(e.clientX, e.clientY)
        .map((el) => (el.closest ? el.closest('[data-dropzone]') : null))
        .find(Boolean);
      if (zone) onDrop(zone.dataset.dropzone);
    }
    setGhost(null);
    stateRef.current = { suppressClick: s.suppressClick };
  }

  function handleClick() {
    if (stateRef.current?.suppressClick) {
      stateRef.current = null;
      return;
    }
    if (!locked) onSelect();
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        aria-pressed={selected}
        className={`flex w-full touch-none items-center justify-between gap-2 rounded-md border bg-surface px-3 py-2 text-left text-small transition-colors ${
          locked
            ? 'border-line text-ink-400'
            : selected
              ? 'border-gold bg-gold/10 text-ink-900'
              : 'cursor-grab border-line text-ink-600 hover:border-ink-400'
        } ${ghost ? 'opacity-40' : ''}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {item.type === 'bowl' ? (
            <BowlThumbnail config={item.config} className="w-12 shrink-0" />
          ) : (
            <ItemThumbnail item={item} className="h-10 w-10 shrink-0" />
          )}
          <span className="min-w-0 break-words font-semibold">{itemDisplayName(item)}</span>
        </span>
        <span className="shrink-0">{item.price} €</span>
      </button>
      {ghost && (
        <GhostChip item={item} style={{ transform: `translate(${ghost.x + 12}px, ${ghost.y + 12}px)` }} />
      )}
    </>
  );
}

export default function PayScreen({ onNavigate, payMode }) {
  const [items, setItems] = useState(null); // null = lädt
  // Der Weg wird schon auf dem Status-Screen gewählt (payMode) -> kein
  // Zwischenscreen. 'split' = getrennt (Drag-to-split); alles andere = zusammen,
  // dann direkt in den Bezahlart-Schritt für die ganze Rechnung ('all').
  const mode = payMode === 'split' ? 'split' : null;
  const [assignment, setAssignment] = useState({}); // itemKey -> personId
  const [persons, setPersons] = useState([
    { id: 'p1', paid: false },
    { id: 'p2', paid: false },
  ]);
  const personSeq = useRef(3); // nächste Personen-Id (Ids nie wiederverwenden)
  const [selectedKey, setSelectedKey] = useState(null);
  const [activePerson, setActivePerson] = useState(null); // Id der aktiven Person (Person-zuerst-Modus)
  // null | 'all' | Personen-Id: zeigt den Bezahlart-Schritt. Bei "Zusammen" direkt
  // 'all' (die ganze Rechnung), bei "Getrennt" erst null (zuerst aufteilen).
  const [methodTarget, setMethodTarget] = useState(payMode === 'split' ? null : 'all');
  const [payMethods, setPayMethods] = useState({}); // personId -> 'cash' | 'card' (nur UI, nicht in DB)
  const [finished, setFinished] = useState(false);
  const [bowlMissing, setBowlMissing] = useState(false); // bowl_back fehlt -> Platzhalter
  const [error, setError] = useState(false);
  const [hint, setHint] = useState(null); // aktueller Drag-Hinweis (Demo-Chip) oder null
  const hintStoppedRef = useRef(false); // ab erster Zuweisung dauerhaft aus
  const pointerDownRef = useRef(false); // Hinweis pausiert, solange der Gast tippt
  const firstPoolChipRef = useRef(null); // Startpunkt: erster Pool-Chip
  const firstUnpaidCardRef = useRef(null); // Zielpunkt: erste offene Person

  useEffect(() => {
    let active = true;
    fetchSessionOrders()
      .then((orders) => {
        if (!active) return;
        const open = orders.filter((o) => !o.paid);
        setItems(
          open.flatMap((order, oi) =>
            (order.items ?? []).map((item, ii) => ({
              key: item.id ?? `${order.id ?? oi}-${ii}`,
              // type + config bleiben erhalten: type steuert das Bild (Bowl vs.
              // Produkt), config (bowl-config bzw. { refId, variant }) speist den
              // lokalisierten Namen (itemDisplayName) und ItemThumbnail.
              type: item.type,
              name: item.name,
              price: item.price,
              config: item.config ?? null,
            })),
          ),
        );
      })
      .catch((err) => {
        console.error('Rechnung laden fehlgeschlagen:', err);
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const itemsFor = (zone) => (items ?? []).filter((i) => (assignment[i.key] ?? 'pool') === zone);
  const sumOf = (list) => list.reduce((sum, i) => sum + i.price, 0);
  const poolItems = itemsFor('pool');
  const hasAssigned = Object.keys(assignment).length > 0;

  // Drag-Hinweis: solange nichts zugewiesen ist, zeigt ein Demo-Chip die Geste
  // (Pool -> erste offene Person). Stoppt dauerhaft ab der ersten Zuweisung,
  // pausiert beim Tippen und respektiert prefers-reduced-motion.
  useEffect(() => {
    if (mode !== 'split') return undefined;
    if (hasAssigned) {
      hintStoppedRef.current = true;
      setHint(null);
      return undefined;
    }
    if (hintStoppedRef.current) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const play = () => {
      if (pointerDownRef.current) return;
      const item = poolItems[0];
      const fromEl = firstPoolChipRef.current;
      const toEl = firstUnpaidCardRef.current;
      // Nur zeigen, wenn wirklich eine Pool-Position da ist: der Getrennt-Screen
      // wird jetzt direkt betreten (payMode), die Rechnung lädt evtl. noch.
      if (!item || !fromEl || !toEl) return;
      const a = fromEl.getBoundingClientRect();
      const b = toEl.getBoundingClientRect();
      setHint({
        item,
        from: { x: a.left, y: a.top },
        to: { x: b.left + b.width * 0.25, y: b.top + b.height * 0.45 },
      });
    };

    const onPointerDown = () => {
      pointerDownRef.current = true;
      setHint(null);
    };
    const onPointerUp = () => {
      pointerDownRef.current = false;
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    const initial = setTimeout(play, 800);
    const repeat = setInterval(play, 12000);
    return () => {
      clearTimeout(initial);
      clearInterval(repeat);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      setHint(null);
    };
    // items in den Deps: der Effekt läuft nach dem Laden der Rechnung erneut, damit
    // play() eine gefüllte poolItems-Closure hat (poolItems selbst ist stabil,
    // solange nichts zugewiesen ist -> dann greift hasAssigned).
  }, [mode, hasAssigned, items]);

  async function finishPayment() {
    setError(false);
    try {
      await markSessionPaid();
      setFinished(true);
    } catch (err) {
      console.error('Bezahlen fehlgeschlagen:', err);
      setError(true);
    }
  }

  function assign(key, zone) {
    const person = persons.find((p) => p.id === zone);
    if (person?.paid) return; // bezahlte Person ist abgeschlossen
    setAssignment((prev) => ({ ...prev, [key]: zone }));
    setSelectedKey(null);
  }

  function addPerson() {
    setPersons((prev) => [...prev, { id: `p${personSeq.current++}`, paid: false }]);
  }

  // Person entfernen: ihre Positionen wandern zurück in die offene Rechnung.
  function removePerson(person) {
    if (person.paid) return;
    if (activePerson === person.id) setActivePerson(null); // Aktiv-Zustand aufheben
    setPersons((prev) => prev.filter((p) => p.id !== person.id));
    setAssignment((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (next[key] === person.id) delete next[key];
      }
      return next;
    });
  }

  // Tipp auf eine Personen-Karte: schaltet den Person-zuerst-Modus für sie um.
  function toggleActive(person) {
    if (person.paid) return; // bezahlte Person kann nicht aktiv werden
    setSelectedKey(null); // aktiver Modus und Positions-Auswahl schließen sich aus
    setActivePerson((cur) => (cur === person.id ? null : person.id));
  }

  // Tipp auf eine Position bei aktiver Person: direkt zuweisen oder zurück in den Pool.
  function tapItem(item) {
    if (activePerson) {
      const target = (assignment[item.key] ?? 'pool') === activePerson ? 'pool' : activePerson;
      assign(item.key, target);
      return;
    }
    // Ohne aktive Person: bisheriges Auswahl-Verhalten (Position vormerken).
    setSelectedKey(selectedKey === item.key ? null : item.key);
  }

  // Person als bezahlt markieren (nach Wahl der Bezahlart).
  async function markPersonPaid(person, method) {
    if (activePerson === person.id) setActivePerson(null); // Aktiv-Zustand aufheben
    if (method) setPayMethods((prev) => ({ ...prev, [person.id]: method }));
    const next = persons.map((p) => (p.id === person.id ? { ...p, paid: true } : p));
    setPersons(next);

    // Fertig, wenn nichts mehr offen ist und jede belegte Person bezahlt hat
    const done =
      (items?.length ?? 0) > 0 &&
      poolItems.length === 0 &&
      next.every((p) => p.paid || itemsFor(p.id).length === 0);
    if (done) await finishPayment();
  }

  // Bezahlart gewählt: bei 'all' die ganze Rechnung, sonst die einzelne Person begleichen.
  async function chooseMethod(method) {
    const target = methodTarget;
    setMethodTarget(null);
    if (target === 'all') {
      await finishPayment();
      return;
    }
    const person = persons.find((p) => p.id === target);
    if (person) await markPersonPaid(person, method);
  }

  function finishSession() {
    resetSession();
    window.location.reload();
  }

  if (finished) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-8 animate-fade-in motion-reduce:animate-none">
        {/* Warmer Abschied im Vokabular des Starts: die leere, dampfende Schüssel
            (bowl_back) mit Boden-Schatten und Dampf, nur kleiner als am Start. */}
        <span className="relative block w-2/5 max-w-xs">
          <span aria-hidden="true" className="start-bowl-shadow pointer-events-none" />
          <SteamPuffs className="absolute inset-x-0 top-6" />
          <span className="animate-float block">
            {bowlMissing ? (
              <BowlGraphic className="relative h-auto w-full" />
            ) : (
              <img
                src="/assets/bowl/bowl_back.png"
                alt=""
                onError={() => setBowlMissing(true)}
                className="relative h-auto w-full object-contain"
              />
            )}
          </span>
        </span>
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-h1">{t('pay.doneTitle')}</h2>
          <p className="text-body text-ink-400">{t('pay.doneHint')}</p>
          <Button size="lg" onClick={finishSession}>
            {t('pay.newSession')}
          </Button>
        </div>
      </section>
    );
  }

  if (items && items.length === 0) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-4">
        <h2 className="text-h1">{t('pay.emptyTitle')}</h2>
        <p className="text-body text-ink-400">{t('pay.emptyHint')}</p>
        <Button onClick={() => onNavigate?.('builder')}>{t('pay.emptyCta')}</Button>
      </section>
    );
  }

  if (items === null) return null; // lädt noch

  // ---- Bezahlart-Schritt (Bar | Karte): eigener Screen, kein Overlay ----
  if (methodTarget) {
    const person = methodTarget === 'all' ? null : persons.find((p) => p.id === methodTarget);
    const amount =
      methodTarget === 'all'
        ? sumOf(items)
        : sumOf(itemsFor(methodTarget));
    const personIndex = person ? persons.findIndex((p) => p.id === person.id) + 1 : 0;
    return (
      <section className="mx-auto flex h-full w-full max-w-xl flex-col justify-center gap-6 p-6">
        <div className="flex flex-col gap-1 text-center">
          <h2 className="text-h1">{t('pay.methodTitle')}</h2>
          {person && (
            <span className="text-body text-ink-400">{t('pay.person', { n: personIndex })}</span>
          )}
          <span className="font-display text-h2 text-ink-900">{amount} €</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => chooseMethod('cash')}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-line bg-surface p-5 text-body font-semibold text-ink-900 transition-colors hover:border-ink-400"
          >
            <Banknote size={40} aria-hidden="true" className="text-ink-600" />
            {t('pay.cash')}
          </button>
          <button
            type="button"
            onClick={() => chooseMethod('card')}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-line bg-surface p-5 text-body font-semibold text-ink-900 transition-colors hover:border-ink-400"
          >
            <CreditCard size={40} aria-hidden="true" className="text-ink-600" />
            {t('pay.card')}
          </button>
        </div>

        {error && <p className="text-small text-error">{t('pay.error')}</p>}

        {/* Zurück: bei "Zusammen" (ganze Rechnung) zum Status, bei einer einzelnen
            Person zurück in die Aufteilung. */}
        <Button
          variant="ghost"
          onClick={() => (methodTarget === 'all' ? onNavigate?.('status') : setMethodTarget(null))}
        >
          {t('pay.back')}
        </Button>
      </section>
    );
  }

  // ---- Getrennt zahlen (Drag-to-split); die Wahl kam vom Status-Screen ----
  return (
    <div className="flex h-full min-h-0">
      {hint && <DragHintGhost {...hint} onDone={() => setHint(null)} />}
      {/* Offene Rechnung (Pool) */}
      <aside
        data-dropzone="pool"
        onClick={() => selectedKey && assign(selectedKey, 'pool')}
        className="flex w-2/5 min-w-0 flex-col gap-3 border-r border-line p-6"
      >
        <div>
          <Button size="sm" variant="ghost" onClick={() => onNavigate?.('status')}>
            {t('pay.back')}
          </Button>
        </div>
        <h2 className="text-h1">{t('pay.title')}</h2>
        <p className="text-small text-ink-400">{t('pay.hint')}</p>
        {/* Ruhige Zustands-Zeile (wie der Topping-Zähler im Builder): wie viele
            Positionen schon einer Person zugeordnet sind. */}
        <p className="text-small text-ink-400">
          {t('pay.assignedCounter', { used: items.length - poolItems.length, max: items.length })}
        </p>
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {poolItems.map((item, i) => (
            <li key={item.key} ref={i === 0 ? firstPoolChipRef : undefined}>
              <BillChip
                item={item}
                selected={selectedKey === item.key}
                onSelect={() => tapItem(item)}
                onDrop={(zone) => assign(item.key, zone)}
              />
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-small text-ink-400">{t('pay.open')}</span>
          {/* from={0} + ready: die offene Rechnung zählt beim Öffnen des
              Getrennt-Screens von 0 hoch, aber erst wenn die Positionen geladen
              sind (sonst liefe die Animation gegen 0 ins Leere). Danach zählt
              jede Zuweisung von dort aus runter. */}
          <span className="font-display text-h2 text-ink-900">
            <AnimatedNumber value={sumOf(poolItems)} from={0} ready={!!items} /> €
          </span>
        </div>
        {error && <p className="text-small text-error">{t('pay.error')}</p>}
      </aside>

      {/* Personen (Drop-Zonen) */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
        <div className="@container min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
          <div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
            {(() => {
              const firstUnpaidId = persons.find((p) => !p.paid)?.id;
              return persons.map((person, index) => {
              const list = itemsFor(person.id);
              const isActive = activePerson === person.id;
              return (
                <section
                  key={person.id}
                  ref={person.id === firstUnpaidId ? firstUnpaidCardRef : undefined}
                  data-dropzone={person.id}
                  onClick={() =>
                    activePerson || selectedKey === null
                      ? toggleActive(person) // Karte antippen: Person-zuerst-Modus
                      : assign(selectedKey, person.id) // vorgemerkte Position zuweisen
                  }
                  style={isActive ? { borderColor: 'var(--color-gold)' } : undefined}
                  className={`flex min-h-44 flex-col gap-2 rounded-lg border-2 bg-surface p-4 transition-colors ${
                    person.paid
                      ? 'border-success'
                      : isActive
                        ? '' // Rahmenfarbe kommt aus dem style-Attribut (gold)
                        : selectedKey
                          ? 'border-gold'
                          : 'border-line'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-body font-semibold text-ink-900">
                      {t('pay.person', { n: index + 1 })}
                    </span>
                    {person.paid ? (
                      <span className="flex items-center gap-1 rounded-sm bg-success px-2 py-0.5 text-caption font-semibold text-surface">
                        <Check size={12} aria-hidden="true" /> {t('pay.paid')}
                        {payMethods[person.id] && ` · ${t(`pay.${payMethods[person.id]}`)}`}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          disabled={list.length === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMethodTarget(person.id);
                          }}
                        >
                          {t('pay.markPaid')}
                        </Button>
                        {persons.length > 2 && (
                          <button
                            type="button"
                            aria-label={t('pay.removePerson')}
                            onClick={(e) => {
                              e.stopPropagation();
                              removePerson(person);
                            }}
                            className="cursor-pointer p-1 text-ink-400 transition-colors hover:text-error"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <p className="text-caption font-semibold text-gold">{t('pay.activeHint')}</p>
                  )}
                  <ul
                    className="flex min-h-16 flex-1 flex-col gap-2"
                    onClick={(e) => e.stopPropagation()} // Klick auf eine Position toggelt nicht die Karte
                  >
                    {list.length === 0 && (
                      <li
                        // Freie Fläche verhält sich wie die Karte: Person aktivieren oder Vorgemerktes zuweisen
                        onClick={() =>
                          activePerson || selectedKey === null
                            ? toggleActive(person)
                            : assign(selectedKey, person.id)
                        }
                        className="flex flex-1 items-center justify-center rounded-md border border-dashed border-line p-2 text-caption text-ink-400"
                      >
                        {t('pay.dropHere')}
                      </li>
                    )}
                    {list.map((item) => (
                      <li key={item.key} className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <BillChip
                            item={item}
                            locked={person.paid}
                            selected={selectedKey === item.key}
                            onSelect={() => tapItem(item)}
                            onDrop={(zone) => assign(item.key, zone)}
                          />
                        </div>
                        {!person.paid && (
                          <button
                            type="button"
                            aria-label={t('pay.removeItem')}
                            // Position zurück in die offene Rechnung (Pool) legen
                            onClick={(e) => {
                              e.stopPropagation();
                              assign(item.key, 'pool');
                            }}
                            className="shrink-0 cursor-pointer p-1 text-ink-400 transition-colors hover:text-error"
                          >
                            <X size={16} aria-hidden="true" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-baseline justify-between border-t border-line pt-2">
                    <span className="text-small text-ink-400">{t('cart.total')}</span>
                    <span className="text-body font-semibold text-ink-900">
                      <AnimatedNumber value={sumOf(list)} /> €
                    </span>
                  </div>
                </section>
              );
              });
            })()}
          </div>
        </div>
        <Button variant="ghost" disabled={persons.length >= 8} onClick={addPerson}>
          <Plus size={18} aria-hidden="true" /> {t('pay.addPerson')}
        </Button>
      </div>
    </div>
  );
}
