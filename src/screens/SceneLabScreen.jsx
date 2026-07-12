import { useState } from 'react';
import { BROTHS } from '../config/menu';
import { BROTH_CY, BROTH_RX, BROTH_RY } from '../config/sceneConfig';
import { HERO_LAYOUT, companionWidth, layoutCompanions } from '../scene/heroCompanions';
import BowlScene from '../scene/BowlScene';
import BowlThumbnail from '../components/BowlThumbnail';
import ItemThumbnail from '../components/ItemThumbnail';

// ============================================================================
// Scene-Lab (Dev-Tool, NICHT im Gast-Flow): ?ansicht=lab.
// Zwei Modi:
//  - "Brühe": Geometrie der Brühen-Oberfläche (BROTH_CY/RX/RY) live tunen.
//  - "Status-Komposition": Anordnung der Begleiter (weitere Bowls, Getränke,
//    Beilagen) um die Hero-Bowl, exakt mit der echten Logik aus
//    scene/heroCompanions (HERO_LAYOUT). Werte ablesen -> in heroCompanions.js
//    (bzw. sceneConfig.js) eintragen oder mir durchgeben.
// ============================================================================

// --- Brühen-Modus ---
function Slider({ label, value, min, max, step = 1, defaultValue, onChange }) {
  const changed = defaultValue !== undefined && value !== defaultValue;
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between gap-2 text-small font-semibold text-ink-900">
        <span>{label}</span>
        <span className="flex items-center gap-1.5">
          {changed && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              title={`Zurück auf ${defaultValue}`}
              aria-label={`${label} zurücksetzen`}
              className="text-body leading-none text-ink-400 hover:text-primary"
            >
              ↺
            </button>
          )}
          <span className="font-display text-body tabular-nums text-primary">{value}</span>
        </span>
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
    </div>
  );
}

// --- Status-Modus: Test-Begleiter & Beispiel-Bowl ---
const SAMPLE_BOWL = {
  broth: 'tonkotsu',
  noodle: 'mittel',
  hardness: 'Normal',
  protein: 'chashu-schwein',
  toppings: { ajitama: 1, mais: 1, nori: 1 },
  finish: {},
};
const DRINK_PRESETS = [
  { name: 'Wasser', type: 'drink', refId: 'wasser' },
  { name: 'Softdrink (Cola)', type: 'drink', refId: 'softdrink', variant: 'Cola' },
  { name: 'Japanisches Bier (Asahi)', type: 'drink', refId: 'bier', variant: 'Asahi' },
  { name: 'Matcha Tee (Warm)', type: 'drink', refId: 'matcha', variant: 'Warm' },
];
const SIDE_PRESETS = [
  { name: 'Gyoza (Gebraten)', type: 'side', refId: 'gyoza', variant: 'Gebraten' },
  { name: 'Karaage', type: 'side', refId: 'karaage' },
  { name: 'Edamame', type: 'side', refId: 'edamame' },
  { name: 'Reis', type: 'side', refId: 'reis' },
];

// Regler-Felder für HERO_LAYOUT (numerisch; itemWOverride bleibt fix).
const HERO_FIELDS = [
  ['companionLimit', 'Max. Begleiter', 1, 6, 1],
  ['sideW', 'Beilage Breite', 100, 320, 5],
  ['drinkW', 'Getränk Breite', 120, 360, 5],
  ['bowlW', 'Weitere Bowl Breite', 120, 340, 5],
  ['fanBase', 'Flanker Basis-Versatz', 40, 220, 5],
  ['fanStep', 'Flanker Zuwachs', 40, 200, 5],
  ['flankRise', 'Flanker Anhebung', 0, 60, 1],
  ['flankBottomRem', 'Flanker Standlinie (rem)', 0, 8, 0.25],
  ['drinkLiftRem', 'Getränk Höhe (rem)', 0, 8, 0.25],
  ['drinkX0', 'Getränk Start-x', 0, 260, 5],
  ['drinkSpread', 'Getränk Abstand', 20, 140, 5],
  ['drinkShift', 'Getränk Links-Rück', 0, 1, 0.05],
  ['drinkBowlShift', 'Getränk Versatz bei Bowl', 0, 160, 5],
  ['noheroSpread', 'Ohne Bowl: Abstand', 40, 220, 5],
];

function Toggle({ on, onClick, children, color = 'nori' }) {
  // Aktive Farbe über Token-CSS-Variablen inline (dynamische Tailwind-Klassen
  // wie bg-${color} würde der Scanner nicht erzeugen).
  const style = on
    ? { backgroundColor: `var(--color-${color})`, borderColor: `var(--color-${color})`, color: 'var(--color-surface)' }
    : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`rounded-md border px-3 py-1 text-small transition-colors ${
        on ? '' : 'border-line text-ink-600 hover:border-ink-400'
      }`}
    >
      {children}
    </button>
  );
}

function BrothMode() {
  const [brothId, setBrothId] = useState('miso');
  const [cy, setCy] = useState(BROTH_CY);
  const [rx, setRx] = useState(BROTH_RX);
  const [ry, setRy] = useState(BROTH_RY);
  const [active, setActive] = useState({});

  const items = [
    { id: 'mittel', category: 'noodle', label: 'Nudeln' },
    { id: 'tofu', category: 'protein', label: 'Tofu' },
    { id: 'ajitama', category: 'topping', label: 'Ajitama' },
    { id: 'mais', category: 'topping', label: 'Mais' },
    { id: 'nori', category: 'topping', label: 'Nori' },
  ];
  const ingredients = items
    .filter((it) => active[it.id])
    .map((it) => ({ key: it.id, id: it.id, category: it.category, qty: 1 }));

  const snippet = `export const BROTH_CY = ${cy};\nexport const BROTH_RX = ${rx};\nexport const BROTH_RY = ${ry};`;

  return (
    <>
      <div className="relative flex min-h-[45vh] flex-1 items-center justify-center p-4">
        <div className="aspect-[700/640] h-full max-h-full w-full max-w-[560px]">
          <BowlScene broth={brothId} ingredients={ingredients} brothGeom={{ cy, rx, ry }} />
        </div>
      </div>
      <div className="flex w-full flex-col gap-5 border-t border-line bg-surface p-5 lg:w-96 lg:border-l lg:border-t-0">
        <div className="flex flex-wrap gap-2">
          {BROTHS.map((b) => (
            <Toggle key={b.id} on={brothId === b.id} onClick={() => setBrothId(b.id)} color="primary">
              {b.name}
            </Toggle>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Slider label="Höhe (BROTH_CY)" value={cy} min={-80} max={80} defaultValue={BROTH_CY} onChange={setCy} />
          <Slider label="Breite (BROTH_RX)" value={rx} min={100} max={280} defaultValue={BROTH_RX} onChange={setRx} />
          <Slider label="Form / Flachheit (BROTH_RY)" value={ry} min={30} max={140} defaultValue={BROTH_RY} onChange={setRy} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-small font-semibold text-ink-900">Zutaten testen</span>
          <div className="flex flex-wrap gap-2">
            {items.map((it) => (
              <Toggle key={it.id} on={!!active[it.id]} onClick={() => setActive((a) => ({ ...a, [it.id]: !a[it.id] }))}>
                {it.label}
              </Toggle>
            ))}
          </div>
        </div>
        <ValueBox snippet={snippet} onReset={() => { setCy(BROTH_CY); setRx(BROTH_RX); setRy(BROTH_RY); }} />
      </div>
    </>
  );
}

function HeroMode() {
  const [cfg, setCfg] = useState({ ...HERO_LAYOUT });
  const [heroOn, setHeroOn] = useState(true);
  const [bowlCount, setBowlCount] = useState(1);
  const [drinks, setDrinks] = useState({ 1: true }); // Cola an
  const [sides, setSides] = useState({ 0: true }); // Gyoza an

  const set = (key, value) => setCfg((c) => ({ ...c, [key]: value }));

  // Begleiter in Status-Reihenfolge: weitere Bowls zuerst, dann Getränke/Beilagen.
  const companions = [];
  for (let i = 0; i < bowlCount; i += 1) {
    companions.push({ kind: 'bowl', key: `bowl-${i}`, config: SAMPLE_BOWL });
  }
  DRINK_PRESETS.forEach((d, i) => {
    if (drinks[i]) companions.push({ kind: 'item', key: `drink-${i}`, item: d });
  });
  SIDE_PRESETS.forEach((s, i) => {
    if (sides[i]) companions.push({ kind: 'item', key: `side-${i}`, item: s });
  });
  const shown = companions.slice(0, cfg.companionLimit);
  const styles = layoutCompanions(shown, cfg);

  const snippet =
    'export const HERO_LAYOUT = {\n' +
    HERO_FIELDS.map(([k]) => `  ${k}: ${cfg[k]},`).join('\n') +
    `\n  itemWOverride: ${JSON.stringify(cfg.itemWOverride)},\n};`;

  return (
    <>
      <div className="relative flex min-h-[45vh] flex-1 items-end justify-center overflow-visible p-6">
        <div className="relative flex h-56 w-full max-w-[600px] items-end justify-center">
          {shown.map((c, i) => (
            <span key={c.key} className="absolute" style={styles[i]}>
              {c.kind === 'bowl' ? (
                <span className="block" style={{ width: `${cfg.bowlW}px` }}>
                  <BowlThumbnail config={c.config} className="w-full" />
                </span>
              ) : (
                <span className="block" style={{ width: `${companionWidth(c.item, cfg)}px` }}>
                  <ItemThumbnail item={c.item} className="w-full" />
                </span>
              )}
            </span>
          ))}
          {heroOn && (
            <div className="relative z-10 aspect-[700/640] h-full">
              <BowlScene broth={SAMPLE_BOWL.broth} ingredients={[]} />
            </div>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col gap-5 overflow-y-auto border-t border-line bg-surface p-5 lg:w-96 lg:border-l lg:border-t-0">
        {/* Szenario */}
        <div className="flex flex-col gap-2">
          <span className="text-small font-semibold text-ink-900">Szenario</span>
          <div className="flex flex-wrap items-center gap-2">
            <Toggle on={heroOn} onClick={() => setHeroOn((v) => !v)} color="primary">
              Hero-Bowl
            </Toggle>
            <span className="flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-small text-ink-600">
              Bowls
              <button type="button" onClick={() => setBowlCount((n) => Math.max(0, n - 1))} className="px-1.5 font-bold">
                −
              </button>
              <span className="w-4 text-center tabular-nums">{bowlCount}</span>
              <button type="button" onClick={() => setBowlCount((n) => Math.min(3, n + 1))} className="px-1.5 font-bold">
                +
              </button>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DRINK_PRESETS.map((d, i) => (
              <Toggle key={d.name} on={!!drinks[i]} onClick={() => setDrinks((s) => ({ ...s, [i]: !s[i] }))}>
                {d.name.replace(/ \(.*\)/, '')}
              </Toggle>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {SIDE_PRESETS.map((s, i) => (
              <Toggle key={s.name} on={!!sides[i]} onClick={() => setSides((v) => ({ ...v, [i]: !v[i] }))} color="gold">
                {s.name.replace(/ \(.*\)/, '')}
              </Toggle>
            ))}
          </div>
        </div>

        {/* Regler */}
        <div className="flex flex-col gap-3">
          {HERO_FIELDS.map(([key, label, min, max, step]) => (
            <Slider
              key={key}
              label={label}
              value={cfg[key]}
              min={min}
              max={max}
              step={step}
              defaultValue={HERO_LAYOUT[key]}
              onChange={(v) => set(key, v)}
            />
          ))}
        </div>

        <ValueBox snippet={snippet} onReset={() => setCfg({ ...HERO_LAYOUT })} />
      </div>
    </>
  );
}

function ValueBox({ snippet, onReset }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-small font-semibold text-ink-900">Werte</span>
      <pre className="max-h-40 overflow-auto rounded-md bg-bg p-3 text-caption text-ink-600">{snippet}</pre>
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
          onClick={onReset}
          className="rounded-md border border-line px-3 py-1.5 text-small font-semibold text-ink-600 hover:border-ink-400"
        >
          Zurücksetzen
        </button>
      </div>
    </div>
  );
}

export default function SceneLabScreen() {
  const [mode, setMode] = useState('broth');
  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className="flex items-center gap-3 border-b border-line bg-surface px-5 py-3">
        <h1 className="font-display text-h2 text-ink-900">Scene-Lab</h1>
        <div className="flex gap-2">
          <Toggle on={mode === 'broth'} onClick={() => setMode('broth')} color="primary">
            Brühe
          </Toggle>
          <Toggle on={mode === 'hero'} onClick={() => setMode('hero')} color="primary">
            Status-Komposition
          </Toggle>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row">
        {mode === 'broth' ? <BrothMode /> : <HeroMode />}
      </div>
    </div>
  );
}
