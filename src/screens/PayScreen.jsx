import { useEffect, useRef, useState } from 'react';
import { PartyPopper, Plus, Check, X } from 'lucide-react';
import { fetchSessionOrders, markSessionPaid, resetSession } from '../services/dataService';
import Button from '../components/Button';
import BowlThumbnail from '../components/BowlThumbnail';
import { t } from '../i18n';

// Bezahlen (CLAUDE.md §9): zuerst die Wahl „Zusammen | Getrennt".
// - Zusammen: ganze Rechnung mit einem Tipp begleichen.
// - Getrennt: Drag-to-split, Positionen per Ziehen (oder Antippen, dann Person
//   antippen) auf Personen verteilen; Personen sind hinzufüg- UND entfernbar.
// Am Ende markiert dataService die Session als bezahlt.

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
          {item.config && <BowlThumbnail config={item.config} className="w-12 shrink-0" />}
          <span className="min-w-0 break-words font-semibold">{item.name}</span>
        </span>
        <span className="shrink-0">{item.price} €</span>
      </button>
      {ghost && (
        <span
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-50 flex items-center gap-2 rounded-md border border-gold bg-surface px-3 py-2 text-small font-semibold text-ink-900 shadow-lg"
          style={{ transform: `translate(${ghost.x + 12}px, ${ghost.y + 12}px)` }}
        >
          {item.name} · {item.price} €
        </span>
      )}
    </>
  );
}

export default function PayScreen({ onNavigate }) {
  const [items, setItems] = useState(null); // null = lädt
  const [mode, setMode] = useState(null); // null = Wahl, 'split' = getrennt
  const [assignment, setAssignment] = useState({}); // itemKey -> personId
  const [persons, setPersons] = useState([
    { id: 'p1', paid: false },
    { id: 'p2', paid: false },
  ]);
  const personSeq = useRef(3); // nächste Personen-Id (Ids nie wiederverwenden)
  const [selectedKey, setSelectedKey] = useState(null);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState(false);

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
              name: item.name,
              price: item.price,
              config: item.type === 'bowl' ? item.config : null,
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
    setPersons((prev) => prev.filter((p) => p.id !== person.id));
    setAssignment((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (next[key] === person.id) delete next[key];
      }
      return next;
    });
  }

  async function togglePaid(person) {
    if (!person.paid && itemsFor(person.id).length === 0) return;
    const next = persons.map((p) => (p.id === person.id ? { ...p, paid: !p.paid } : p));
    setPersons(next);

    // Fertig, wenn nichts mehr offen ist und jede belegte Person bezahlt hat
    const done =
      (items?.length ?? 0) > 0 &&
      poolItems.length === 0 &&
      next.every((p) => p.paid || itemsFor(p.id).length === 0);
    if (done) await finishPayment();
  }

  function finishSession() {
    resetSession();
    window.location.reload();
  }

  if (finished) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-4">
        <PartyPopper size={56} className="text-gold" aria-hidden="true" />
        <h2 className="text-h1">{t('pay.doneTitle')}</h2>
        <p className="text-body text-ink-400">{t('pay.doneHint')}</p>
        <Button size="lg" onClick={finishSession}>
          {t('pay.newSession')}
        </Button>
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

  // ---- Schritt 1: Wahl „Zusammen | Getrennt" (mit Rechnungsübersicht) ----
  if (mode !== 'split') {
    return (
      <section className="mx-auto flex h-full w-full max-w-xl flex-col justify-center gap-4 p-6">
        <h2 className="text-h1">{t('pay.title')}</h2>
        <p className="text-body text-ink-400">{t('pay.chooseHint')}</p>

        <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-small text-ink-600"
            >
              <span className="flex min-w-0 items-center gap-2">
                {item.config && <BowlThumbnail config={item.config} className="w-12 shrink-0" />}
                <span className="min-w-0 break-words font-semibold">{item.name}</span>
              </span>
              <span className="shrink-0">{item.price} €</span>
            </li>
          ))}
        </ul>

        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-small text-ink-400">{t('pay.total')}</span>
          <span className="font-display text-h2 text-ink-900">{sumOf(items)} €</span>
        </div>
        {error && <p className="text-small text-error">{t('pay.error')}</p>}

        <div className="flex gap-3">
          <Button size="lg" className="flex-1" onClick={finishPayment}>
            {t('pay.together')}
          </Button>
          <Button size="lg" variant="ghost" className="flex-1" onClick={() => setMode('split')}>
            {t('pay.split')}
          </Button>
        </div>
      </section>
    );
  }

  // ---- Schritt 2: Getrennt zahlen (Drag-to-split) ----
  return (
    <div className="flex h-full min-h-0">
      {/* Offene Rechnung (Pool) */}
      <aside
        data-dropzone="pool"
        onClick={() => selectedKey && assign(selectedKey, 'pool')}
        className="flex w-2/5 min-w-0 flex-col gap-3 border-r border-line p-6"
      >
        <div>
          <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
            {t('pay.back')}
          </Button>
        </div>
        <h2 className="text-h1">{t('pay.title')}</h2>
        <p className="text-small text-ink-400">{t('pay.hint')}</p>
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {poolItems.map((item) => (
            <li key={item.key}>
              <BillChip
                item={item}
                selected={selectedKey === item.key}
                onSelect={() => setSelectedKey(selectedKey === item.key ? null : item.key)}
                onDrop={(zone) => assign(item.key, zone)}
              />
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-small text-ink-400">{t('pay.open')}</span>
          <span className="font-display text-h2 text-ink-900">{sumOf(poolItems)} €</span>
        </div>
        {error && <p className="text-small text-error">{t('pay.error')}</p>}
      </aside>

      {/* Personen (Drop-Zonen) */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
        <div className="@container min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
          <div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
            {persons.map((person, index) => {
              const list = itemsFor(person.id);
              return (
                <section
                  key={person.id}
                  data-dropzone={person.id}
                  onClick={() => selectedKey && assign(selectedKey, person.id)}
                  className={`flex min-h-44 flex-col gap-2 rounded-lg border-2 bg-surface p-4 transition-colors ${
                    person.paid ? 'border-success' : selectedKey ? 'border-gold' : 'border-line'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-body font-semibold text-ink-900">
                      {t('pay.person', { n: index + 1 })}
                    </span>
                    {person.paid ? (
                      <span className="flex items-center gap-1 rounded-sm bg-success px-2 py-0.5 text-caption font-semibold text-surface">
                        <Check size={12} aria-hidden="true" /> {t('pay.paid')}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={list.length === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePaid(person);
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
                  <ul className="flex min-h-16 flex-1 flex-col gap-2">
                    {list.length === 0 && (
                      <li className="flex flex-1 items-center justify-center rounded-md border border-dashed border-line p-2 text-caption text-ink-400">
                        {t('pay.dropHere')}
                      </li>
                    )}
                    {list.map((item) => (
                      <li key={item.key}>
                        <BillChip
                          item={item}
                          locked={person.paid}
                          selected={selectedKey === item.key}
                          onSelect={() => setSelectedKey(selectedKey === item.key ? null : item.key)}
                          onDrop={(zone) => assign(item.key, zone)}
                        />
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-baseline justify-between border-t border-line pt-2">
                    <span className="text-small text-ink-400">{t('cart.total')}</span>
                    <span className="text-body font-semibold text-ink-900">{sumOf(list)} €</span>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
        <Button variant="ghost" disabled={persons.length >= 8} onClick={addPerson}>
          <Plus size={18} aria-hidden="true" /> {t('pay.addPerson')}
        </Button>
      </div>
    </div>
  );
}
