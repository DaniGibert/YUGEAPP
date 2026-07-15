import { useState } from 'react';
import { BROTHS, NOODLES, PROTEINS, TOPPINGS } from '../config/menu';
import {
  ANCHORS,
  ANCHOR_DEFAULT,
  BROTH_CY,
  BROTH_RX,
  BROTH_RY,
  SUBMERGE_FADE,
  SUBMERGE_TINT,
  WATERLINE_Y,
  WATER_BAND,
} from '../config/sceneConfig';
import { HERO_LAYOUT, companionWidth, layoutCompanions } from '../scene/heroCompanions';
import BowlScene from '../scene/BowlScene';
import BowlThumbnail from '../components/BowlThumbnail';
import ItemThumbnail from '../components/ItemThumbnail';

// ============================================================================
// Scene-Lab (Dev-Tool, NICHT im Gast-Flow): ?ansicht=lab.
// Zwei Modi:
//  - "Brühe": Geometrie der Brühen-Oberfläche (BROTH_CY/RX/RY) und das Abtauchen
//    der Zutaten (Wasserlinien-Shader: WATERLINE_Y/WATER_BAND/SUBMERGE_TINT/
//    SUBMERGE_FADE) live tunen. Abtauchen wirkt nur auf Zutaten -> zum Beurteilen
//    unten eine Zutat einschalten.
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
  // Abtauchen (Wasserlinien-Shader): gehört zur Brühen-Oberfläche, darum hier.
  const [waterlineY, setWaterlineY] = useState(WATERLINE_Y);
  const [band, setBand] = useState(WATER_BAND);
  const [tint, setTint] = useState(SUBMERGE_TINT);
  const [fade, setFade] = useState(SUBMERGE_FADE);
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

  const snippet =
    `export const BROTH_CY = ${cy};\nexport const BROTH_RX = ${rx};\nexport const BROTH_RY = ${ry};\n\n` +
    `export const WATERLINE_Y = ${waterlineY};\nexport const WATER_BAND = ${band};\n` +
    `export const SUBMERGE_TINT = ${tint};\nexport const SUBMERGE_FADE = ${fade};`;

  return (
    <>
      <div className="relative flex min-h-[45vh] flex-1 items-center justify-center p-4">
        <div className="aspect-[700/640] h-full max-h-full w-full max-w-[560px]">
          <BowlScene
            broth={brothId}
            ingredients={ingredients}
            brothGeom={{ cy, rx, ry }}
            submerge={{ waterlineY, band, tint, fade }}
          />
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
        {/* Abtauchen: wirkt nur auf Zutaten -> ohne aktive Zutat sieht man nichts,
            darum der Hinweis. Die Wasserlinie ist unabhängig von BROTH_CY: sie ist
            der Shader-Schnitt, BROTH_CY die sichtbare Oberflächen-Ellipse. */}
        <div className="flex flex-col gap-4 border-t border-line pt-4">
          <span className="text-small font-semibold text-ink-900">
            Abtauchen{' '}
            <span className="font-normal text-ink-400">(Zutat unten einschalten)</span>
          </span>
          <Slider label="Wasserlinie (WATERLINE_Y)" value={waterlineY} min={-80} max={80} defaultValue={WATERLINE_Y} onChange={setWaterlineY} />
          <Slider label="Übergang weich (WATER_BAND)" value={band} min={0} max={60} defaultValue={WATER_BAND} onChange={setBand} />
          <Slider label="Tönung (SUBMERGE_TINT)" value={tint} min={0} max={1} step={0.01} defaultValue={SUBMERGE_TINT} onChange={setTint} />
          <Slider label="Ausblenden (SUBMERGE_FADE)" value={fade} min={0} max={1} step={0.01} defaultValue={SUBMERGE_FADE} onChange={setFade} />
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
        <ValueBox
          snippet={snippet}
          onReset={() => {
            setCy(BROTH_CY);
            setRx(BROTH_RX);
            setRy(BROTH_RY);
            setWaterlineY(WATERLINE_Y);
            setBand(WATER_BAND);
            setTint(SUBMERGE_TINT);
            setFade(SUBMERGE_FADE);
          }}
        />
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

// Generischer Platzierungs-Modus (Nudeln, Protein, später Toppings): eine Zutat
// live in der echten Szene positionieren. Startwerte pro Sorte aus dem GESPEICHERTEN
// Anker (ANCHORS) laden, sonst defaultAnchor. Kontext = Brühe + andere Zutaten,
// damit realistisch platziert wird (nicht "allein", sonst sitzt es falsch).
function PlacementMode({ category, options, defaultAnchor, context, sortLabel, sizeListName }) {
  const [id, setId] = useState(options[0].id);
  const [broth, setBroth] = useState('tonkotsu');
  const [brothOn, setBrothOn] = useState(true);
  const [withContext, setWithContext] = useState(true);
  const base = (o) => {
    const a = ANCHORS[o.id] ?? defaultAnchor;
    return { x: a.x, y: a.y, scale: a.scale ?? 1, rot: a.rot ?? 0, stretch: a.stretch ?? 1, size: o.size };
  };
  const [cfgs, setCfgs] = useState(() => Object.fromEntries(options.map((o) => [o.id, base(o)])));
  const cur = cfgs[id];
  const dflt = base(options.find((o) => o.id === id));
  const setCur = (key, value) => setCfgs((c) => ({ ...c, [id]: { ...c[id], [key]: value } }));

  const ctx = withContext
    ? context.map((c, i) => ({ key: `ctx-${i}`, id: c.id, category: c.category, qty: 1 }))
    : [];
  const ingredients = [{ key: 'main', id, category, qty: 1 }, ...ctx];
  const anchorOverrides = { [id]: cur };

  const keyOut = (oid) => (/^[a-zA-Z_$][\w$]*$/.test(oid) ? oid : `'${oid}'`);
  const anchorLine = (oid, c) => {
    const p =
      (c.scale !== 1 ? ` scale: ${c.scale},` : '') +
      (c.rot !== 0 ? ` rot: ${c.rot},` : '') +
      (c.stretch !== 1 ? ` stretch: ${c.stretch},` : '');
    return `  ${keyOut(oid)}: { x: ${c.x}, y: ${c.y},${p} satellites: ANCHOR_DEFAULT.${category}.satellites },`;
  };
  const snippet =
    '// sceneConfig.js -> ANCHORS (eigener Eintrag pro Sorte, unabhängig)\n' +
    options.map((o) => anchorLine(o.id, cfgs[o.id])).join('\n') +
    `\n\n// config/menu.js -> ${sizeListName} size (pro Sorte)\n` +
    options.map((o) => `${o.id}: size ${cfgs[o.id].size}`).join('\n');

  return (
    <>
      <div className="relative flex min-h-[45vh] flex-1 items-center justify-center p-4">
        <div className="aspect-[700/640] h-full max-h-full w-full max-w-[560px]">
          <BowlScene broth={brothOn ? broth : null} ingredients={ingredients} anchorOverrides={anchorOverrides} />
        </div>
      </div>
      <div className="flex w-full flex-col gap-5 overflow-y-auto border-t border-line bg-surface p-5 lg:w-96 lg:border-l lg:border-t-0">
        <div className="flex flex-col gap-2">
          <span className="text-small font-semibold text-ink-900">{sortLabel}</span>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <Toggle key={o.id} on={id === o.id} onClick={() => setId(o.id)} color="primary">
                {o.name}
              </Toggle>
            ))}
          </div>
        </div>

        {/* Kontext: Brühe (Wasserlinie) + andere Zutaten (realistische Platzierung) */}
        <div className="flex flex-col gap-2">
          <span className="text-small font-semibold text-ink-900">Kontext</span>
          <div className="flex flex-wrap gap-2">
            <Toggle on={brothOn} onClick={() => setBrothOn((v) => !v)} color="primary">
              Brühe an
            </Toggle>
            <Toggle on={withContext} onClick={() => setWithContext((v) => !v)} color="gold">
              Andere Zutaten
            </Toggle>
            {brothOn &&
              BROTHS.map((b) => (
                <Toggle key={b.id} on={broth === b.id} onClick={() => setBroth(b.id)} color="gold">
                  {b.name}
                </Toggle>
              ))}
          </div>
        </div>

        {/* Regler */}
        <div className="flex flex-col gap-4">
          <Slider label="Position x (Anker)" value={cur.x} min={-260} max={260} defaultValue={dflt.x} onChange={(v) => setCur('x', v)} />
          <Slider label="Position y (Höhe/Tiefe)" value={cur.y} min={-260} max={200} defaultValue={dflt.y} onChange={(v) => setCur('y', v)} />
          <Slider label="Skala (Anker)" value={cur.scale} min={0.5} max={1.8} step={0.05} defaultValue={dflt.scale} onChange={(v) => setCur('scale', v)} />
          <Slider label="Drehung (Grad)" value={cur.rot} min={-180} max={180} step={1} defaultValue={dflt.rot} onChange={(v) => setCur('rot', v)} />
          <Slider label="Höhe / Streckung" value={cur.stretch} min={0.4} max={2} step={0.05} defaultValue={dflt.stretch} onChange={(v) => setCur('stretch', v)} />
          <Slider label={`Größe (${id})`} value={cur.size} min={60} max={460} step={5} defaultValue={dflt.size} onChange={(v) => setCur('size', v)} />
        </div>

        <ValueBox
          snippet={snippet}
          onReset={() => setCfgs((c) => ({ ...c, [id]: base(options.find((o) => o.id === id)) }))}
        />
      </div>
    </>
  );
}

// Kontext-Zutaten (andere Zutaten drumherum) je Modus, damit die getunte Zutat
// realistisch im Verbund sitzt statt allein.
const NOODLE_CONTEXT = [
  { id: 'chashu-schwein', category: 'protein' },
  { id: 'ajitama', category: 'topping' },
  { id: 'nori', category: 'topping' },
  { id: 'fruehlingszwiebeln', category: 'topping' },
];
const PROTEIN_CONTEXT = [
  { id: 'mittel', category: 'noodle' },
  { id: 'ajitama', category: 'topping' },
  { id: 'nori', category: 'topping' },
  { id: 'fruehlingszwiebeln', category: 'topping' },
];
// Toppings tunt man auf der Basis Nudel + Protein (die anderen Toppings lässt man
// weg, sonst überlagern sie sich gegenseitig beim Einzel-Tunen).
const TOPPING_CONTEXT = [
  { id: 'mittel', category: 'noodle' },
  { id: 'chashu-schwein', category: 'protein' },
];

function NoodleMode() {
  return (
    <PlacementMode
      category="noodle"
      options={NOODLES}
      defaultAnchor={ANCHOR_DEFAULT.noodle}
      context={NOODLE_CONTEXT}
      sortLabel="Nudel-Sorte"
      sizeListName="NOODLES"
    />
  );
}

function ProteinMode() {
  return (
    <PlacementMode
      category="protein"
      options={PROTEINS.filter((p) => p.size)}
      defaultAnchor={ANCHOR_DEFAULT.protein}
      context={PROTEIN_CONTEXT}
      sortLabel="Protein"
      sizeListName="PROTEINS"
    />
  );
}

function ToppingMode() {
  return (
    <PlacementMode
      category="topping"
      options={TOPPINGS}
      defaultAnchor={ANCHOR_DEFAULT.topping}
      context={TOPPING_CONTEXT}
      sortLabel="Topping"
      sizeListName="TOPPINGS"
    />
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
        <div className="flex flex-wrap gap-2">
          <Toggle on={mode === 'broth'} onClick={() => setMode('broth')} color="primary">
            Brühe
          </Toggle>
          <Toggle on={mode === 'noodle'} onClick={() => setMode('noodle')} color="primary">
            Nudeln
          </Toggle>
          <Toggle on={mode === 'protein'} onClick={() => setMode('protein')} color="primary">
            Protein
          </Toggle>
          <Toggle on={mode === 'topping'} onClick={() => setMode('topping')} color="primary">
            Toppings
          </Toggle>
          <Toggle on={mode === 'hero'} onClick={() => setMode('hero')} color="primary">
            Status-Komposition
          </Toggle>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row">
        {mode === 'broth' && <BrothMode />}
        {mode === 'noodle' && <NoodleMode />}
        {mode === 'protein' && <ProteinMode />}
        {mode === 'topping' && <ToppingMode />}
        {mode === 'hero' && <HeroMode />}
      </div>
    </div>
  );
}
