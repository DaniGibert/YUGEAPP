import { useEffect, useRef, useState } from 'react';
import { Palette, X, RotateCcw } from 'lucide-react';
import { Slider, Toggle, ValueBox } from './labControls';
import { STEAM_DEFAULTS, setSteamLabOverrides, getSteamDefaultTonedColor } from '../components/SteamBackdrop';

// ============================================================================
// Design-Lab (Dev-Tool, NICHT im Gast-Flow): ?ansicht=design.
// Anders als das Scene-Lab hat dieses Panel keinen eigenen Screen: die ECHTE
// Gast-App laeuft normal weiter, das Panel schwebt nur darueber. So lassen sich
// Fonts, Radien und Farben live durch die ganze App (Navigation, Header, Flug)
// durchspielen.
//
// Wie es wirkt: alle Tokens aus theme.css liegen dank "@theme static" als
// CSS-Variablen auf :root. Inline-Overrides auf document.documentElement.style
// gewinnen ueber die Stylesheet-Regel, ohne theme.css anzufassen (weiter die
// Single Source of Truth). Das Panel liest die Defaults EINMAL per
// getComputedStyle und schreibt nur abweichende Werte als Inline-Override.
// Die Gewinner-Werte gibt es als theme.css-fertiges Snippet zum Kopieren.
// ============================================================================

const STORAGE_KEY = 'yuge-design-lab';

// Eigener Speicher-Key fuer den Dampf: der Haupt-STORAGE_KEY landet 1:1 als
// CSS-Property auf :root, da duerfen keine JS-Konstanten hineingemischt werden.
const STEAM_STORAGE_KEY = 'yuge-design-lab-steam';

// Dampf-Regler (SteamBackdrop, Tinten-Marmorierung): Key, Label, min, max,
// step. Reihenfolge = Anzeige und Snippet. Der Backdrop laeuft nur auf dem
// Start-Screen, getunt wird also dort.
const STEAM_FIELDS = [
  ['BAND_COUNT', 'Baender', 2, 8, 1],
  ['ALPHA', 'Deckkraft je Band', 0, 1, 0.02],
  ['SHADE_VAR', 'Farb-Variation', 0, 1, 0.05],
  ['SPEED', 'Tempo', 0.1, 3, 0.05],
  ['DRIFT', 'Drift', -2, 2, 0.1],
  ['WAVELENGTH', 'Wellenlaenge', 0.3, 2, 0.05],
  ['BAND_THICK', 'Banddicke', 0.01, 0.15, 0.005],
  ['SWIRL', 'Verwirbelung', 0, 0.12, 0.005],
  ['WISP_TONE', 'Ton (Token-Mischung)', 0, 1, 0.05],
  ['CANVAS_OPACITY', 'Gesamt-Deckkraft', 0, 1, 0.05],
  ['CANVAS_BLUR_PX', 'Weichzeichnung (px)', 0, 40, 1],
];

// Radien: Token, Label, Slider-Grenzen (px). Defaults kommen live aus theme.css
// (getComputedStyle), damit hier keine zweite Wahrheit steht.
const RADIUS_TOKENS = [
  ['--radius-sm', 'Klein (sm)', 0, 20],
  ['--radius-md', 'Mittel (md)', 0, 28],
  ['--radius-lg', 'Gross (lg)', 0, 36],
  ['--radius-xl', 'Extra (xl)', 0, 56],
];

// Preset-Saetze: setzen alle vier Radien auf einmal (sm, md, lg, xl).
const RADIUS_PRESETS = [
  { label: 'Eckig', values: [4, 6, 8, 12] },
  { label: 'Standard', values: [8, 12, 16, 24] },
  { label: 'Rund', values: [12, 18, 24, 36] },
  { label: 'Extra rund', values: [16, 24, 32, 48] },
];

// Farb-Tokens mit einzelnem Farbwaehler. Reihenfolge = Anzeige und Snippet.
const COLOR_TOKENS = [
  ['--color-bg', 'Hintergrund'],
  ['--color-surface', 'Flaeche'],
  ['--color-line', 'Linie'],
  ['--color-ink-400', 'Text leise'],
  ['--color-ink-600', 'Fliesstext'],
  ['--color-ink-900', 'Ueberschrift'],
  ['--color-primary', 'Primaer'],
  ['--color-primary-700', 'Primaer dunkel'],
  ['--color-gold', 'Gold'],
  ['--color-nori', 'Nori'],
];

// Schrift-Kandidaten als Daten. `stack` ist der komplette font-family-String,
// `import` der css2-Familien-Parameter fuer die spaetere @import-Zeile (null =
// laedt theme.css schon, kein Nachladen noetig; beginnt der Wert mit "https",
// ist es eine komplette Stylesheet-URL und wird unveraendert geladen, weil
// Fontshare eine eigene gehostete CSS-API hat statt der Google-css2-API). Die
// zwei "aktuell"-Eintraege
// (Dela Gothic One, Inter) tragen exakt die theme.css-Stacks, damit sie beim Start
// ohne Override als aktiv erkannt werden.
// `headingWeight` (optional, nur Display) traegt ein Single-Weight-Font: liegt es
// an, pinnt das Panel die drei Ueberschriften-Gewichte darauf, sonst faket der
// Browser Bold und verzerrt die Glyphen (siehe applyFont). Die Richtung der
// Kandidaten ist bold/verspielt/food, nicht technisch.
// `weightRange` (optional, nur Display) markiert Fonts mit mehreren echten
// Gewichten: dann bietet der Schrift-Abschnitt den "Dicke"-Regler an, mit dem
// das Ueberschriften-Gewicht live zwischen min und max verstellt wird. Fonts
// ohne weightRange koennen nur ein Gewicht und bekommen keinen Regler.
const FONT_OPTIONS = [
  { label: 'Dela Gothic One', stack: '"Dela Gothic One", ui-sans-serif, sans-serif', import: null, for: 'display' },
  { label: 'Fraunces', stack: '"Fraunces", ui-serif, serif', import: 'Fraunces:opsz,wght,SOFT@9..144,600..900,100', for: 'display', weightRange: { min: 600, max: 900, step: 25 } },
  // Chubbo ist eine variable Schrift (200..700); die statischen Schnitte kennen
  // kein echtes 600. Darum laedt der variable Face (chubbo@1) das ganze Band und
  // der Regler stellt 500..700 wahrhaftig ein (kein Fake-Bold).
  { label: 'Chubbo', stack: '"Chubbo", ui-serif, serif', import: 'https://api.fontshare.com/v2/css?f[]=chubbo@1&display=swap', headingWeight: '700', for: 'display', weightRange: { min: 500, max: 700, step: 100 } },
  { label: 'Chonburi', stack: '"Chonburi", ui-serif, serif', import: 'Chonburi', headingWeight: '400', for: 'display' },
  { label: 'Shrikhand', stack: '"Shrikhand", ui-serif, serif', import: 'Shrikhand', headingWeight: '400', for: 'display' },
  { label: 'Bagel Fat One', stack: '"Bagel Fat One", ui-sans-serif, sans-serif', import: 'Bagel+Fat+One', headingWeight: '400', for: 'display' },
  { label: 'Tanker', stack: '"Tanker", ui-sans-serif, sans-serif', import: 'https://api.fontshare.com/v2/css?f[]=tanker@400&display=swap', headingWeight: '400', for: 'display' },
  { label: 'Baloo 2', stack: '"Baloo 2", ui-sans-serif, sans-serif', import: 'Baloo+2:wght@600..800', for: 'display', weightRange: { min: 600, max: 800, step: 25 } },
  { label: 'Gabarito', stack: '"Gabarito", ui-sans-serif, sans-serif', import: 'Gabarito:wght@600..800', for: 'display', weightRange: { min: 600, max: 800, step: 25 } },
  { label: 'Bricolage Grotesque', stack: '"Bricolage Grotesque", ui-sans-serif, sans-serif', import: 'Bricolage+Grotesque:opsz,wght@12..96,600..800', headingWeight: '700', for: 'display', weightRange: { min: 600, max: 800, step: 25 } },
  { label: 'Potta One', stack: '"Potta One", ui-sans-serif, sans-serif', import: 'Potta+One', headingWeight: '400', for: 'display' },
  { label: 'Cherry Bomb One', stack: '"Cherry Bomb One", ui-sans-serif, sans-serif', import: 'Cherry+Bomb+One', headingWeight: '400', for: 'display' },
  { label: 'Comico', stack: '"Comico", ui-sans-serif, sans-serif', import: 'https://api.fontshare.com/v2/css?f[]=comico@400&display=swap', headingWeight: '400', for: 'display' },

  { label: 'Inter', stack: '"Inter", ui-sans-serif, system-ui, sans-serif', import: null, for: 'sans' },
  { label: 'M PLUS Rounded 1c', stack: '"M PLUS Rounded 1c", ui-sans-serif, sans-serif', import: 'M+PLUS+Rounded+1c:wght@400;500;700', for: 'sans' },
  { label: 'Quicksand', stack: '"Quicksand", ui-sans-serif, sans-serif', import: 'Quicksand:wght@400..700', for: 'sans' },
  { label: 'DM Sans', stack: '"DM Sans", ui-sans-serif, sans-serif', import: 'DM+Sans:opsz,wght@9..40,400..600', for: 'sans' },
  { label: 'Figtree', stack: '"Figtree", ui-sans-serif, sans-serif', import: 'Figtree:wght@400..600', for: 'sans' },
];

// Ueberschriften-Gewichte: nur Single-Weight-Display-Fonts pinnen diese drei
// Tokens (sonst synthetisiert der Browser Fake-Bold). Reihenfolge = Snippet,
// direkt nach den Font-Zeilen.
const WEIGHT_TOKENS = ['--text-display--font-weight', '--text-h1--font-weight', '--text-h2--font-weight'];

// Farb-Paletten: jede setzt einen kompletten Satz Farb-Tokens (Werte je Token,
// hex, damit sie direkt in <input type="color"> passen). "Aktuell" hat keine
// Werte und setzt damit alle Farben auf die theme.css-Defaults zurueck. Kontrast
// (Text auf bg und surface) bewusst lesbar gehalten.
// Farb-Richtung: Kinari/Sumi greifen traditionelle japanische Farbnamen auf
// (Kinari = naturweisses Ungebleicht, Sumi = Tusche-Schwarz, hoechster Kontrast);
// Tokyo folgt dem gesaettigten Dopamine-Trend (waermer, lauter). Alle Werte sind
// kontrastgeprueft (Text auf bg und surface).
// Matcha/Sakura/Aizome/Miso sind bewusst andere Farbrichtungen zum Ausprobieren
// (Gruen, Rosa, Indigo, Gelb), nicht die Evolution des Bestands.
const PALETTE_PRESETS = [
  { label: 'Aktuell', values: null },
  {
    label: 'Kinari',
    values: {
      '--color-bg': '#FBF3E8',
      '--color-surface': '#FFFFFF',
      '--color-line': '#E8DCC8',
      '--color-ink-400': '#7A6350',
      '--color-ink-600': '#5C4433',
      '--color-ink-900': '#2B1B12',
      '--color-primary': '#E13A2E',
      '--color-primary-700': '#B02A20',
      '--color-gold': '#F2A93D',
      '--color-nori': '#1F5C42',
    },
  },
  {
    label: 'Tokyo',
    values: {
      '--color-bg': '#FFF4E3',
      '--color-surface': '#FFFFFF',
      '--color-line': '#F2D9B8',
      '--color-ink-400': '#7D6250',
      '--color-ink-600': '#52362A',
      '--color-ink-900': '#241512',
      '--color-primary': '#F03526',
      '--color-primary-700': '#C92E23',
      '--color-gold': '#FFB627',
      '--color-nori': '#146356',
    },
  },
  {
    label: 'Sumi',
    values: {
      '--color-bg': '#F7F2E9',
      '--color-surface': '#FFFFFF',
      '--color-line': '#DCD3C4',
      '--color-ink-400': '#6E6156',
      '--color-ink-600': '#3A322B',
      '--color-ink-900': '#171412',
      '--color-primary': '#C1272D',
      '--color-primary-700': '#8E1B20',
      '--color-gold': '#E0A526',
      '--color-nori': '#16472F',
    },
  },
  {
    label: 'Matcha',
    values: {
      '--color-bg': '#F0F2E2',
      '--color-surface': '#FFFFFF',
      '--color-line': '#D6DDBE',
      '--color-ink-400': '#66714F',
      '--color-ink-600': '#3E4A2C',
      '--color-ink-900': '#181F0E',
      '--color-primary': '#2E6B3E',
      '--color-primary-700': '#1F5230',
      '--color-gold': '#D9A62E',
      '--color-nori': '#2E5D4B',
    },
  },
  {
    label: 'Sakura',
    values: {
      '--color-bg': '#FBECEE',
      '--color-surface': '#FFFFFF',
      '--color-line': '#EFD2D8',
      '--color-ink-400': '#7E5D66',
      '--color-ink-600': '#54333E',
      '--color-ink-900': '#291218',
      '--color-primary': '#C22B57',
      '--color-primary-700': '#9C1F44',
      '--color-gold': '#E8A63C',
      '--color-nori': '#33604A',
    },
  },
  {
    label: 'Aizome',
    values: {
      '--color-bg': '#ECF0F5',
      '--color-surface': '#FFFFFF',
      '--color-line': '#D3DCE7',
      '--color-ink-400': '#5C6A80',
      '--color-ink-600': '#333F55',
      '--color-ink-900': '#111927',
      '--color-primary': '#D23B22',
      '--color-primary-700': '#A82D18',
      '--color-gold': '#DFA42F',
      '--color-nori': '#2F5D57',
    },
  },
  {
    label: 'Miso',
    values: {
      '--color-bg': '#F7DE9B',
      '--color-surface': '#FFF6DC',
      '--color-line': '#DDBC66',
      '--color-ink-400': '#6E5526',
      '--color-ink-600': '#4C3A14',
      '--color-ink-900': '#211806',
      '--color-primary': '#C93A1E',
      '--color-primary-700': '#A02D15',
      '--color-gold': '#8F6A12',
      '--color-nori': '#3A5F33',
    },
  },
  {
    label: 'Abend',
    values: {
      '--color-bg': '#1A1614',
      '--color-surface': '#262019',
      '--color-line': '#3A322A',
      '--color-ink-400': '#9A8F84',
      '--color-ink-600': '#D8CEC3',
      '--color-ink-900': '#F7F1E9',
      '--color-primary': '#F26A4B',
      '--color-primary-700': '#D8462B',
      '--color-gold': '#F2B33D',
      '--color-nori': '#4C9576',
    },
  },
];

// Snippet-Reihenfolge: Fonts zuerst (brauchen den Import-Kommentar darueber),
// direkt darunter die drei Ueberschriften-Gewichte (haengen am Display-Font),
// dann Farben, dann Radien.
const SNIPPET_ORDER = [
  '--font-display',
  '--font-sans',
  ...WEIGHT_TOKENS,
  ...COLOR_TOKENS.map(([t]) => t),
  ...RADIUS_TOKENS.map(([t]) => t),
];

// Alle Tokens, deren Default wir beim Mount aus theme.css lesen.
const ALL_TOKENS = ['--font-display', '--font-sans', ...SNIPPET_ORDER.slice(2)];

function readDefaults() {
  const cs = getComputedStyle(document.documentElement);
  const map = {};
  ALL_TOKENS.forEach((t) => {
    map[t] = cs.getPropertyValue(t).trim();
  });
  return map;
}

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadStoredSteam() {
  try {
    const raw = localStorage.getItem(STEAM_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    // Nur bekannte Keys behalten: der Backdrop wurde intern mehrfach umgebaut,
    // alte localStorage-Staende koennen tote Keys (SPRITE_RADIUS,
    // PARTICLE_COUNT, FILAMENT_COUNT, RISE_SPEED, ...) tragen, die sonst ewig
    // mitgeschleppt wuerden.
    return Object.fromEntries(
      Object.entries(parsed).filter(([key]) => key in STEAM_DEFAULTS)
    );
  } catch {
    return {};
  }
}

// SteamBackdrop.jsx-fertiges Snippet: nur abweichende Keys, als Konstanten-
// Zeilen zum direkten Einsetzen. Floats auf 3 Nachkommastellen gerundet, sonst
// landet Slider-Float-Muell (0.030000000000000002) im Code. BLEND und
// WISP_COLOR sind Strings und duerfen nie in Math.round landen (NaN), darum
// eigene Zeilen.
function buildSteamSnippet(steam) {
  const lines = [];
  if ('BLEND' in steam) lines.push(`const BLEND = '${steam.BLEND}';`);
  STEAM_FIELDS
    .filter(([key]) => key in steam)
    .forEach(([key]) => lines.push(`const ${key} = ${Math.round(steam[key] * 1000) / 1000};`));
  // WISP_COLOR nur mit Anfuehrungszeichen emittieren, wenn es wirklich ein
  // String ist: ein null-Override (Alt-Stand) wuerde sonst als kaputtes
  // 'null' landen. null ist der einzig gueltige Nicht-String-Wert und steht
  // ohne Anfuehrungszeichen.
  if (typeof steam.WISP_COLOR === 'string') {
    lines.push(`const WISP_COLOR = '${steam.WISP_COLOR}';`);
  } else if ('WISP_COLOR' in steam) {
    lines.push('const WISP_COLOR = null;');
  }
  if (!lines.length) return '/* Keine Aenderungen */';
  return ['/* SteamBackdrop.jsx */', ...lines].join('\n');
}

// theme.css-fertiges Snippet: nur abweichende Tokens, eine Zeile pro Token. Bei
// geaenderten Fonts oben als Kommentar die noetige @import-Ergaenzung.
function buildSnippet(overrides) {
  const lines = [];
  const families = []; // Google-css2-Familien, kombinierbar in eine family=-Zeile
  const urls = []; // volle Stylesheet-URLs (Fontshare hat eine eigene gehostete CSS-API)
  ['--font-display', '--font-sans'].forEach((t) => {
    if (overrides[t]) {
      const opt = FONT_OPTIONS.find((o) => o.stack === overrides[t]);
      if (opt?.import) {
        if (opt.import.startsWith('https')) urls.push(opt.import);
        else families.push(opt.import);
      }
    }
  });
  if (families.length) {
    lines.push('/* theme.css @import ergaenzen: ' + families.map((f) => `family=${f}`).join('&') + ' */');
  }
  // Fontshare-URLs stehen komplett da, je eine eigene Import-Zeile.
  urls.forEach((u) => lines.push(`/* theme.css @import ergaenzen: ${u} */`));
  SNIPPET_ORDER.forEach((t) => {
    if (t in overrides) lines.push(`${t}: ${overrides[t]};`);
  });
  return lines.length ? lines.join('\n') : '/* Keine Aenderungen */';
}

// Hex-Eingabe fuer die Dampf-Farbe: das native OS-Farbfenster (Windows) hat
// kein Hex-Feld, darum die eigene Eingabe. Der Feldtext lebt lokal, damit
// halbe Eingaben beim Tippen nicht committen (sonst spraenge die Farbe);
// committet wird bei Enter und Blur. Aenderungen von aussen (Farbwaehler,
// Token-Reset, Ton-Regler) ziehen per Effekt nach.
function SteamHexInput({ value, onCommit }) {
  const [text, setText] = useState(value);
  useEffect(() => {
    setText(value);
  }, [value]);
  const commit = () => {
    const m = /^#?([0-9a-f]{6})$/i.exec(text.trim());
    if (m) {
      const hex = '#' + m[1].toUpperCase();
      setText(hex); // Eingabe normalisieren (fuehrendes #, Grossbuchstaben)
      onCommit(hex);
    } else {
      setText(value); // ungueltig: zurueck auf den letzten gueltigen Wert
    }
  };
  return (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
      aria-label="Farbe als Hex"
      className="w-24 rounded-sm border border-line bg-surface px-2 py-1 text-caption tabular-nums text-ink-600"
    />
  );
}

export default function DesignLabPanel() {
  const [open, setOpen] = useState(false);
  const [overrides, setOverrides] = useState(loadStored);
  // Dampf-Overrides (SteamBackdrop): haelt nur echte Abweichungen von
  // STEAM_DEFAULTS, Muster von overrides/setToken.
  const [steam, setSteam] = useState(loadStoredSteam);

  // Defaults nur einmal lesen (theme.css bleibt die Wahrheit). Ref, damit sie
  // nicht bei jedem Render neu aus dem DOM gezogen werden.
  const defaultsRef = useRef(null);
  if (defaultsRef.current === null) defaultsRef.current = readDefaults();
  const defaults = defaultsRef.current;

  // Bereits nachgeladene Font-Imports (einmal pro Font ein <link>).
  const loadedFontsRef = useRef(new Set());
  // Vorherige Override-Keys, um entfernte Inline-Styles wieder abzuraeumen.
  const prevKeysRef = useRef(new Set());

  // Overrides auf :root anwenden: entfernte Keys abraeumen, aktuelle setzen,
  // noetige Fonts nachladen, Stand persistieren. Laeuft auch beim Mount, damit
  // ein gespeicherter Stand sofort wieder greift.
  useEffect(() => {
    const root = document.documentElement;
    prevKeysRef.current.forEach((k) => {
      if (!(k in overrides)) root.style.removeProperty(k);
    });
    Object.entries(overrides).forEach(([k, v]) => root.style.setProperty(k, v));
    prevKeysRef.current = new Set(Object.keys(overrides));

    ['--font-display', '--font-sans'].forEach((t) => {
      const opt = FONT_OPTIONS.find((o) => o.stack === overrides[t]);
      if (opt?.import && !loadedFontsRef.current.has(opt.import)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        // Fontshare hat eine eigene gehostete CSS-API: beginnt `import` mit
        // "https", ist es die komplette Stylesheet-URL und wird direkt benutzt;
        // sonst der Google-css2-Familien-Parameter.
        link.href = opt.import.startsWith('https')
          ? opt.import
          : `https://fonts.googleapis.com/css2?family=${opt.import}&display=swap`;
        document.head.appendChild(link);
        loadedFontsRef.current.add(opt.import);
      }
    });

    if (Object.keys(overrides).length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [overrides]);

  // Dampf-Stand in den SteamBackdrop-Seitenkanal schieben und persistieren.
  // Laeuft auch beim Mount, damit ein gespeicherter Stand sofort wieder greift.
  useEffect(() => {
    setSteamLabOverrides(steam);
    if (Object.keys(steam).length) {
      localStorage.setItem(STEAM_STORAGE_KEY, JSON.stringify(steam));
    } else {
      localStorage.removeItem(STEAM_STORAGE_KEY);
    }
  }, [steam]);

  // Einen Dampf-Wert setzen; Wert == Default fliegt raus (Muster von setToken).
  const setSteamField = (key, value) => {
    setSteam((s) => {
      const next = { ...s };
      if (value === STEAM_DEFAULTS[key]) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  // Ein Token setzen; entspricht der Wert dem Default, faellt der Override raus
  // (overrides haelt so nur echte Abweichungen).
  const setToken = (token, value) => {
    setOverrides((o) => {
      const next = { ...o };
      if (value == null || value === defaults[token]) delete next[token];
      else next[token] = value;
      return next;
    });
  };

  // Font waehlen: Font-Token und (nur beim Display-Font) die drei Ueberschriften-
  // Gewichte in EINEM Update setzen, damit kein halber Zustand entsteht. Traegt der
  // Display-Font `headingWeight`, werden die Gewichte darauf gepinnt (Fake-Bold
  // vermeiden), sonst fallen die Overrides zurueck auf Default. Manuelle Radien-
  // und Farb-Overrides bleiben unberuehrt.
  const applyFont = (opt) => {
    const token = opt.for === 'display' ? '--font-display' : '--font-sans';
    setOverrides((o) => {
      const next = { ...o };
      if (opt.stack === defaults[token]) delete next[token];
      else next[token] = opt.stack;
      if (opt.for === 'display') {
        WEIGHT_TOKENS.forEach((wt) => {
          if (opt.headingWeight && opt.headingWeight !== defaults[wt]) next[wt] = opt.headingWeight;
          else delete next[wt];
        });
      }
      return next;
    });
  };

  // Ueberschriften-Gewicht per "Dicke"-Regler setzen (nur Display-Fonts mit
  // weightRange). Display bekommt den Slider-Wert, H1/H2 folgen mit Abstand
  // (Slider-Wert - 100, nach unten auf range.min begrenzt): so bleibt die
  // Hierarchie erhalten, das Display steht immer fetter als H1/H2. Alles in EINEM
  // Update; Werte gleich dem theme.css-Default fallen aus den Overrides (Muster
  // aus setToken).
  const setHeadingWeight = (range, val) => {
    const displayVal = String(val);
    const followVal = String(Math.max(val - 100, range.min));
    setOverrides((o) => {
      const next = { ...o };
      const put = (token, v) => {
        if (v === defaults[token]) delete next[token];
        else next[token] = v;
      };
      put('--text-display--font-weight', displayVal);
      put('--text-h1--font-weight', followVal);
      put('--text-h2--font-weight', followVal);
      return next;
    });
  };

  const applyRadiusPreset = (values) => {
    setOverrides((o) => {
      const next = { ...o };
      RADIUS_TOKENS.forEach(([token], i) => {
        const v = `${values[i]}px`;
        if (v === defaults[token]) delete next[token];
        else next[token] = v;
      });
      return next;
    });
  };

  const applyPalette = (preset) => {
    setOverrides((o) => {
      const next = { ...o };
      COLOR_TOKENS.forEach(([token]) => {
        const v = preset.values?.[token];
        if (v && v !== defaults[token]) next[token] = v;
        else delete next[token]; // "Aktuell" oder Wert == Default
      });
      return next;
    });
  };

  const resetAll = () => {
    setOverrides({});
    setSteam({});
  };

  // Aktiver Display-Font + sein aktuelles Gewicht fuer den Dicke-Regler.
  const activeDisplay = FONT_OPTIONS.find(
    (o) => o.for === 'display' && o.stack === (overrides['--font-display'] ?? defaults['--font-display'])
  );
  const displayWeightDefault = parseInt(defaults['--text-display--font-weight'], 10) || 400;
  const displayWeightCur =
    '--text-display--font-weight' in overrides
      ? parseInt(overrides['--text-display--font-weight'], 10) || displayWeightDefault
      : displayWeightDefault;

  const snippet = buildSnippet(overrides);

  // Angezeigte Dampf-Farbe: expliziter Override, sonst der wirksame
  // Code-Default (STEAM_DEFAULTS.WISP_COLOR). Die Token-Mischung zum aktuellen
  // Ton bleibt der Fallback fuer den Fall, dass der Code-Default irgendwann
  // wieder null ist; pro Render neu berechnet (billig), damit das Feld dann
  // auch Live-Paletten-Overrides folgt.
  const steamColor =
    steam.WISP_COLOR ??
    STEAM_DEFAULTS.WISP_COLOR ??
    getSteamDefaultTonedColor(steam.WISP_TONE ?? STEAM_DEFAULTS.WISP_TONE);

  // Eingeklappt: nur ein runder Knopf am rechten Rand.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Design-Lab oeffnen"
        className="fixed right-3 top-1/2 z-[100] -translate-y-1/2 rounded-full border border-line bg-ink-900 p-3 text-surface shadow-lg hover:bg-ink-600"
      >
        <Palette size={20} />
      </button>
    );
  }

  return (
    <div className="fixed right-3 top-1/2 z-[100] flex max-h-[85vh] w-80 -translate-y-1/2 flex-col overflow-y-auto rounded-lg border border-line bg-surface shadow-lg">
      {/* Kopf: Titel, Alles zuruecksetzen, Schliessen */}
      <div className="sticky top-0 flex items-center justify-between gap-2 border-b border-line bg-surface px-4 py-3">
        <h2 className="font-display text-h2 text-ink-900">Design-Lab</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={resetAll}
            title="Alles zuruecksetzen"
            aria-label="Alles zuruecksetzen"
            className="rounded-md p-1.5 text-ink-400 hover:text-primary"
          >
            <RotateCcw size={18} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            title="Schliessen"
            aria-label="Design-Lab schliessen"
            className="rounded-md p-1.5 text-ink-400 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-4">
        {/* Sektion 1: Schrift */}
        <section className="flex flex-col gap-3">
          <h3 className="font-display text-body-lg text-ink-900">Schrift</h3>
          {[
            ['display', '--font-display', 'Display (Ueberschriften)'],
            ['sans', '--font-sans', 'UI-Text (Fliesstext)'],
          ].map(([group, token, label]) => (
            <div key={group} className="flex flex-col gap-1.5">
              <span className="text-small font-semibold text-ink-900">{label}</span>
              <div className="flex flex-wrap gap-2">
                {FONT_OPTIONS.filter((o) => o.for === group).map((opt) => {
                  const active = (overrides[token] ?? defaults[token]) === opt.stack;
                  return (
                    <Toggle key={opt.label} on={active} onClick={() => applyFont(opt)} color="primary">
                      {/* Label in der eigenen Schrift, damit man sie im Knopf sieht */}
                      <span style={{ fontFamily: opt.stack }}>{opt.label}</span>
                    </Toggle>
                  );
                })}
              </div>
              {/* Dicke-Regler nur beim Display-Font, und nur wenn der aktive Font
                  mehrere Gewichte kann (weightRange). Wert = aktuelles Display-
                  Gewicht (Override, sonst theme.css-Default). defaultValue = das
                  Gewicht, das der Font beim Anklicken setzt (headingWeight, sonst
                  Default), damit der Ruecksetz-Pfeil sinnvoll trifft. */}
              {group === 'display' && activeDisplay?.weightRange && (
                <Slider
                  label="Dicke (Ueberschriften)"
                  value={displayWeightCur}
                  min={activeDisplay.weightRange.min}
                  max={activeDisplay.weightRange.max}
                  step={activeDisplay.weightRange.step}
                  defaultValue={
                    activeDisplay.headingWeight ? parseInt(activeDisplay.headingWeight, 10) : displayWeightDefault
                  }
                  onChange={(v) => setHeadingWeight(activeDisplay.weightRange, v)}
                />
              )}
            </div>
          ))}
        </section>

        {/* Sektion 2: Radien */}
        <section className="flex flex-col gap-3 border-t border-line pt-4">
          <h3 className="font-display text-body-lg text-ink-900">Radien</h3>
          <div className="flex flex-wrap gap-2">
            {RADIUS_PRESETS.map((p) => (
              <Toggle key={p.label} on={false} onClick={() => applyRadiusPreset(p.values)} color="gold">
                {p.label}
              </Toggle>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            {RADIUS_TOKENS.map(([token, label, min, max]) => {
              const dflt = parseInt(defaults[token], 10) || 0;
              const cur = token in overrides ? parseInt(overrides[token], 10) || 0 : dflt;
              return (
                <Slider
                  key={token}
                  label={label}
                  value={cur}
                  min={min}
                  max={max}
                  step={1}
                  defaultValue={dflt}
                  onChange={(v) => setToken(token, `${v}px`)}
                />
              );
            })}
          </div>
        </section>

        {/* Sektion 3: Farben */}
        <section className="flex flex-col gap-3 border-t border-line pt-4">
          <h3 className="font-display text-body-lg text-ink-900">Farben</h3>
          <div className="flex flex-wrap gap-2">
            {PALETTE_PRESETS.map((p) => (
              <Toggle key={p.label} on={false} onClick={() => applyPalette(p)} color="primary">
                {p.label}
              </Toggle>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            {COLOR_TOKENS.map(([token, label]) => {
              const value = overrides[token] ?? defaults[token];
              return (
                <label key={token} className="flex items-center justify-between gap-3 text-small text-ink-600">
                  <span>{label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-display text-caption tabular-nums text-ink-400">{value}</span>
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
                      onChange={(e) => setToken(token, e.target.value.toUpperCase())}
                      aria-label={label}
                      className="h-7 w-9 cursor-pointer rounded-sm border border-line bg-surface"
                    />
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Sektion 4: Dampf-Hintergrund des Start-Screens (SteamBackdrop),
            eine gekaemmte Tinten-Marmorierung (Ebru): wenige goldene Baender,
            die langsam durchs Papier ziehen. Laeuft nur auf dem Start-Screen,
            getunt wird also dort. Eigene ValueBox mit eigenem Snippet, weil
            die Werte nicht nach theme.css wandern, sondern als Konstanten
            nach SteamBackdrop.jsx. */}
        <section className="flex flex-col gap-3 border-t border-line pt-4">
          <h3 className="font-display text-body-lg text-ink-900">Dampf (Start-Screen)</h3>
          {/* Blend-Umschalter: Tinte (multiply) toent das Papier statt milchig
              darueber zu liegen. */}
          <div className="flex flex-wrap gap-2">
            {[['normal', 'Normal'], ['multiply', 'Tinte']].map(([value, label]) => (
              <Toggle
                key={value}
                on={(steam.BLEND ?? STEAM_DEFAULTS.BLEND) === value}
                onClick={() => setSteamField('BLEND', value)}
                color="gold"
              >
                {label}
              </Toggle>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            {STEAM_FIELDS.map(([key, label, min, max, step]) => (
              <Slider
                key={key}
                label={label}
                value={steam[key] ?? STEAM_DEFAULTS[key]}
                min={min}
                max={max}
                step={step}
                defaultValue={STEAM_DEFAULTS[key]}
                onChange={(v) => setSteamField(key, v)}
              />
            ))}
          </div>
          {/* Freie Element-Farbe (WISP_COLOR): ohne Override zeigt das Feld
              den wirksamen Code-Default. Der Ton-Regler wirkt nur auf dem
              Token-Pfad (WISP_COLOR null), bei gesetzter Farbe ist er
              wirkungslos. */}
          <label className="flex items-center justify-between gap-3 text-small text-ink-600">
            <span>Farbe</span>
            <span className="flex items-center gap-2">
              {/* Zuruecksetzen loescht den Override (Wert === Default fliegt
                  raus): bei null-Default hiess das Token-Farbe, mit gesetztem
                  Farb-Default heisst zuruecksetzen jetzt Standard-Farbe. */}
              {'WISP_COLOR' in steam && (
                <button
                  type="button"
                  onClick={() => setSteamField('WISP_COLOR', STEAM_DEFAULTS.WISP_COLOR)}
                  title="Zurueck zum Standard"
                  aria-label="Dampf-Farbe zuruecksetzen"
                  className="text-body leading-none text-ink-400 hover:text-primary"
                >
                  ↺
                </button>
              )}
              <SteamHexInput
                value={steamColor}
                onCommit={(hex) => setSteamField('WISP_COLOR', hex)}
              />
              <input
                type="color"
                value={steamColor}
                onChange={(e) => setSteamField('WISP_COLOR', e.target.value.toUpperCase())}
                aria-label="Farbe"
                className="h-7 w-9 cursor-pointer rounded-sm border border-line bg-surface"
              />
            </span>
          </label>
          <ValueBox snippet={buildSteamSnippet(steam)} onReset={() => setSteam({})} />
        </section>

        {/* Sektion 5: Werte */}
        <section className="border-t border-line pt-4">
          <ValueBox snippet={snippet} onReset={resetAll} />
        </section>
      </div>
    </div>
  );
}
