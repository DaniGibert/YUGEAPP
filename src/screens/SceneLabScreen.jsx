import { useState } from 'react';
import { BROTHS } from '../config/menu';
import { BROTH_CY, BROTH_RX, BROTH_RY } from '../config/sceneConfig';
import BowlScene from '../scene/BowlScene';

// ============================================================================
// Scene-Lab (Dev-Tool, NICHT im Gast-Flow): erreichbar über ?ansicht=lab.
// Rendert die ECHTE BowlScene und lässt Brühen-Geometrie live per Regler
// verstellen, damit Platzierung/Form/Höhe ohne Screenshot-Iteration getunt
// werden kann. Die Werte stehen groß dabei -> ablesen und in sceneConfig.js
// eintragen (oder mir durchgeben). Später erweiterbar um Zutaten-Anker.
// ============================================================================

// Zutaten zum Zuschalten (um Einsinken/Überlappung mit der Brühe zu sehen).
const TEST_ITEMS = [
  { id: 'mittel', category: 'noodle', label: 'Nudeln' },
  { id: 'tofu', category: 'protein', label: 'Tofu' },
  { id: 'ajitama', category: 'topping', label: 'Ajitama' },
  { id: 'mais', category: 'topping', label: 'Mais' },
  { id: 'nori', category: 'topping', label: 'Nori' },
];

function Slider({ label, value, min, max, step = 1, onChange }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between text-small font-semibold text-ink-900">
        {label}
        <span className="font-display text-body tabular-nums text-primary">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );
}

export default function SceneLabScreen() {
  const [brothId, setBrothId] = useState('miso');
  const [cy, setCy] = useState(BROTH_CY);
  const [rx, setRx] = useState(BROTH_RX);
  const [ry, setRy] = useState(BROTH_RY);
  const [active, setActive] = useState({}); // { id: true }

  const ingredients = TEST_ITEMS.filter((it) => active[it.id]).map((it) => ({
    key: it.id,
    id: it.id,
    category: it.category,
    qty: 1,
  }));

  const snippet = `export const BROTH_CY = ${cy};\nexport const BROTH_RX = ${rx};\nexport const BROTH_RY = ${ry};`;

  const reset = () => {
    setCy(BROTH_CY);
    setRx(BROTH_RX);
    setRy(BROTH_RY);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-bg lg:flex-row">
      {/* Bühne mit der echten Szene */}
      <div className="relative flex min-h-[45vh] flex-1 items-center justify-center p-4">
        <div className="aspect-[700/640] h-full max-h-full w-full max-w-[560px]">
          <BowlScene broth={brothId} ingredients={ingredients} brothGeom={{ cy, rx, ry }} />
        </div>
      </div>

      {/* Regler-Panel */}
      <div className="flex w-full flex-col gap-5 border-t border-line bg-surface p-5 lg:w-96 lg:border-l lg:border-t-0">
        <div>
          <h1 className="font-display text-h2 text-ink-900">Scene-Lab</h1>
          <p className="text-small text-ink-400">Brühen-Geometrie live testen. Werte ablesen und weitergeben.</p>
        </div>

        {/* Brühe wählen */}
        <div className="flex flex-wrap gap-2">
          {BROTHS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBrothId(b.id)}
              className={`rounded-md border-2 px-3 py-1.5 text-small font-semibold transition-colors ${
                brothId === b.id
                  ? 'border-primary bg-primary text-surface'
                  : 'border-line text-ink-600 hover:border-ink-400'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>

        {/* Regler */}
        <div className="flex flex-col gap-4">
          <Slider label="Höhe (BROTH_CY)" value={cy} min={-80} max={80} onChange={setCy} />
          <Slider label="Breite (BROTH_RX)" value={rx} min={100} max={280} onChange={setRx} />
          <Slider label="Form / Flachheit (BROTH_RY)" value={ry} min={30} max={140} onChange={setRy} />
        </div>

        {/* Zutaten zuschalten */}
        <div className="flex flex-col gap-2">
          <span className="text-small font-semibold text-ink-900">Zutaten testen</span>
          <div className="flex flex-wrap gap-2">
            {TEST_ITEMS.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => setActive((a) => ({ ...a, [it.id]: !a[it.id] }))}
                className={`rounded-md border px-3 py-1 text-small transition-colors ${
                  active[it.id]
                    ? 'border-nori bg-nori text-surface'
                    : 'border-line text-ink-600 hover:border-ink-400'
                }`}
              >
                {it.label}
              </button>
            ))}
          </div>
        </div>

        {/* Werte zum Ablesen / Kopieren */}
        <div className="flex flex-col gap-2">
          <span className="text-small font-semibold text-ink-900">Werte für sceneConfig.js</span>
          <pre className="overflow-x-auto rounded-md bg-bg p-3 text-caption text-ink-600">{snippet}</pre>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(snippet)}
              className="rounded-md bg-ink-900 px-3 py-1.5 text-small font-semibold text-surface"
            >
              Kopieren
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-line px-3 py-1.5 text-small font-semibold text-ink-600 hover:border-ink-400"
            >
              Zurücksetzen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
