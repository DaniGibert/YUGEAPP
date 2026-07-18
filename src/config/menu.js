// ============================================================
// Yuge: Menü + Preise als Daten (Single Source of Truth fürs Menü)
//
// Alles hier ist Daten. Zutat hinzufügen/umbenennen/umpreisen = hier ändern,
// nirgends sonst.
//
// - Preise sind Ganzzahlen (Euro).
// - `id` ist gleichzeitig der Bild-Dateiname: public/assets/<kategorie>/<id>.png
// - Sichtbare Texte sind ZWEISPRACHIG als { de, en }-Objekt und werden über den
//   i18n-Helfer tx() (src/i18n) in die aktuelle Sprache aufgelöst. Japanische/
//   Marken-Namen (Tonkotsu, Miso, Nori, Cola ...) stehen in de und en gleich,
//   sind der Einheitlichkeit halber aber trotzdem Objekte.
// - `allergens` sind IDs aus ALLERGENS (siehe unten), keine sichtbaren Strings;
//   die Anzeige löst sie über ALLERGENS + tx() auf.
// - Varianten sind Objekte { id, label:{de,en} }. Die `id` ist Kennung (Bild-
//   Dateiname <id>-<variantId>.png, Warenkorb, DB), das `label` nur Anzeige.
// - Modifier (NOODLE_FIRMNESS, FINISH) tragen `label:{de,en}`, ihre `options`
//   sind { id, label:{de,en} }, `default` ist eine Options-ID.
// - `pairsWith` steuert die „Passend: …"-Hinweise (abhängig von der Brühe).
// - `sceneColor` = Farbe in der Bowl-Szene (Brühen-Tönung bzw. Platzhalter,
//   falls das PNG fehlt); `size` = Breite der Zutat in Welt-px (Höhe folgt
//   dem Seitenverhältnis des PNG). Werte aus dem abgestimmten Prototyp.
// - `sceneVariants` = deklarierte Mengen-Varianten-Assets eines Toppings, z. B.
//   `[1, 2]`, wenn `/assets/topping/<id>-x2.png` existiert (gleicher Anker,
//   vollerer Haufen). Mengen darüber streut composeBowl über Satelliten.
//   Pflege-Regel: Wer ein `-x2.png` generiert, trägt hier die `2` ein — sonst
//   `[1]` (nur Basis-Asset). KEIN Laufzeit-Probing, rein deklarativ.
//
// Ablage: src/config/menu.js
// ============================================================

import { tx } from '../i18n';

// ---- Allergene (IDs -> zweisprachiges Label) ----
// Items tragen `allergens` als ID-Array (z. B. ['soy','gluten']); die Anzeige
// (OptionCard) löst über diese Map + tx() auf.
export const ALLERGENS = {
  soy: { de: 'Soja', en: 'Soy' },
  gluten: { de: 'Gluten', en: 'Gluten' },
  fish: { de: 'Fisch', en: 'Fish' },
  egg: { de: 'Ei', en: 'Egg' },
  sesame: { de: 'Sesam', en: 'Sesame' },
};

// ---- 1. Brühe (Einfach-Auswahl) ----
export const BROTHS = [
  {
    id: 'tonkotsu',
    name: { de: 'Tonkotsu', en: 'Tonkotsu' },
    sceneColor: '#e3c9ac',
    desc: {
      de: 'Cremige Brühe aus Schweineknochen, die stundenlang köchelt. Kräftig und macht richtig satt.',
      en: 'Creamy broth from pork bones, simmered for hours. Rich and really filling.',
    },
    allergens: ['soy', 'gluten'],
  },
  {
    id: 'shoyu',
    name: { de: 'Shoyu', en: 'Shoyu' },
    sceneColor: '#c69160',
    desc: {
      de: 'Klare Brühe auf Basis von Sojasoße. Etwas leichter als Tonkotsu und ein Klassiker aus Tokyo.',
      en: 'Clear broth based on soy sauce. A little lighter than tonkotsu and a Tokyo classic.',
    },
    allergens: ['soy', 'gluten', 'fish'],
  },
  {
    id: 'miso',
    name: { de: 'Miso', en: 'Miso' },
    sceneColor: '#c68d62',
    desc: {
      de: 'Herzhafte Brühe mit Miso-Paste. Kräftig im Geschmack, mit einer leicht süßlichen Note.',
      en: 'Savoury broth with miso paste. Bold in flavour, with a slightly sweet note.',
    },
    // Bewusst ohne Fisch-Dashi (Restaurant-Entscheidung): die vegetarische Brühe
    // des Hauses, damit Veggie-Gäste ein Ramen bestellen können.
    allergens: ['soy', 'gluten'],
    diet: 'vegetarian',
  },
  {
    id: 'shio',
    name: { de: 'Shio', en: 'Shio' },
    sceneColor: '#e4d2b8',
    desc: {
      de: 'Unsere leichteste und feinste Brühe, klar und mild gesalzen.',
      en: 'Our lightest and most delicate broth, clear and mildly salted.',
    },
    allergens: ['soy', 'fish'],
  },
];

// ---- 2. Nudeln (Einfach-Auswahl) + Härte-Modifier ----
export const NOODLES = [
  {
    id: 'duenn',
    name: { de: 'Dünn', en: 'Thin' },
    sceneColor: '#e8d8a0',
    size: 310,
    desc: {
      de: 'Dünne, glatte Nudeln mit Biss. Passen besonders gut zu cremigen Brühen.',
      en: 'Thin, smooth noodles with bite. They go especially well with creamy broths.',
    },
    pairsWith: ['tonkotsu'],
    allergens: ['gluten'],
    diet: 'vegan',
  },
  {
    id: 'mittel',
    name: { de: 'Mittel', en: 'Medium' },
    sceneColor: '#e8d8a0',
    size: 320,
    desc: {
      de: 'Der Allrounder, der zu jeder Brühe passt. Wenn du unsicher bist, nimm diese.',
      en: "The all-rounder that suits every broth. If you're unsure, pick these.",
    },
    pairsWith: ['shoyu', 'shio'],
    allergens: ['gluten'],
    diet: 'vegan',
  },
  {
    id: 'dick',
    name: { de: 'Dick', en: 'Thick' },
    sceneColor: '#e8d8a0',
    size: 320,
    desc: {
      de: 'Dicke Nudeln mit ordentlich Biss. Machen satt und halten kräftigen Brühen stand.',
      en: 'Thick noodles with plenty of bite. Filling and a match for bold broths.',
    },
    pairsWith: ['miso'],
    allergens: ['gluten'],
    diet: 'vegan',
  },
];
// Modifier: ändert keine sichtbare Zutat in der Bowl. options = { id, label:{de,en} }.
export const NOODLE_FIRMNESS = {
  label: { de: 'Nudelhärte', en: 'Noodle firmness' },
  options: [
    { id: 'weich', label: { de: 'Weich', en: 'Soft' } },
    { id: 'normal', label: { de: 'Normal', en: 'Normal' } },
    { id: 'fest', label: { de: 'Fest', en: 'Firm' } },
    { id: 'extra-fest', label: { de: 'Extra fest', en: 'Extra firm' } },
  ],
  default: 'normal',
};

// ---- 3. Protein (Einfach-Auswahl, Aufpreis auf die Bowl) ----
export const PROTEINS = [
  {
    id: 'chashu-schwein',
    name: { de: 'Chashu Schwein', en: 'Chashu pork' },
    sceneColor: '#b5651d',
    size: 285,
    desc: {
      de: 'Schweinebauch, der so lange gegart wird, bis er ganz zart ist.',
      en: "Pork belly slow-cooked until it's meltingly tender.",
    },
    price: 3,
    pairsWith: ['tonkotsu'],
    allergens: ['soy', 'gluten'],
  },
  {
    id: 'chashu-haehnchen',
    name: { de: 'Chashu Hähnchen', en: 'Chashu chicken' },
    sceneColor: '#d9a066',
    size: 285,
    desc: {
      de: 'Die leichtere Wahl statt Schwein. Saftiges Hähnchen, mild im Geschmack.',
      en: 'The lighter choice instead of pork. Juicy chicken, mild in flavour.',
    },
    price: 3,
    pairsWith: ['shio', 'shoyu'],
    allergens: ['soy', 'gluten'],
  },
  {
    id: 'tofu',
    name: { de: 'Tofu', en: 'Tofu' },
    sceneColor: '#f0ead0',
    size: 290,
    desc: {
      de: 'Gebratener Tofu, der den Geschmack der Brühe aufnimmt. Die vegane Wahl.',
      en: 'Fried tofu that soaks up the flavour of the broth. The vegan choice.',
    },
    price: 2,
    pairsWith: ['miso'],
    allergens: ['soy', 'gluten'],
    diet: 'vegan',
  },
  {
    id: 'ohne',
    name: { de: 'Ohne Protein', en: 'No protein' },
    desc: {
      de: 'Nur Brühe, Nudeln und Toppings, für alle die es leichter mögen.',
      en: 'Just broth, noodles and toppings, for anyone who likes it lighter.',
    },
    price: 0,
    allergens: [],
    diet: 'vegan',
  },
];

// ---- 4. Toppings (Mehrfach-Auswahl mit Menge) ----
export const TOPPINGS = [
  {
    id: 'ajitama',
    name: { de: 'Ajitama', en: 'Ajitama' },
    sceneColor: '#f5d76e',
    size: 365,
    sceneVariants: [1],
    desc: {
      de: 'Weich gekochtes Ei, das in einer süßlich-salzigen Marinade zieht. Innen noch schön weich.',
      en: 'Soft-boiled egg marinated in a sweet-salty broth. Still lovely and soft inside.',
    },
    pairsWith: 'alle',
    allergens: ['egg', 'soy', 'gluten'],
    diet: 'vegetarian',
  },
  {
    id: 'naruto',
    name: { de: 'Naruto', en: 'Naruto' },
    sceneColor: '#e8a0a8',
    size: 245,
    sceneVariants: [1],
    desc: {
      de: 'Fischkuchen mit der typisch rosa Spirale. Vor allem was fürs Auge.',
      en: 'Fish cake with the classic pink spiral. Mostly one for the eyes.',
    },
    allergens: ['fish', 'gluten', 'soy'],
  },
  {
    id: 'nori',
    name: { de: 'Nori', en: 'Nori' },
    sceneColor: '#2f4f3a',
    size: 415,
    sceneVariants: [1],
    desc: {
      de: 'Ein Blatt getrocknete Alge mit leicht rauchigem Geschmack.',
      en: 'A sheet of dried seaweed with a slightly smoky taste.',
    },
    allergens: [],
    diet: 'vegan',
  },
  {
    id: 'mais',
    name: { de: 'Mais', en: 'Corn' },
    sceneColor: '#f2c14e',
    size: 340,
    sceneVariants: [1],
    desc: {
      de: 'Süße, knackige Maiskörner.',
      en: 'Sweet, crunchy corn kernels.',
    },
    pairsWith: ['miso'],
    allergens: [],
    diet: 'vegan',
  },
  {
    id: 'bambussprossen',
    name: { de: 'Bambussprossen', en: 'Bamboo shoots' },
    sceneColor: '#d9b96a',
    size: 345,
    sceneVariants: [1],
    desc: {
      de: 'Knackige Bambussprossen mit einer leicht säuerlichen Note.',
      en: 'Crunchy bamboo shoots with a slightly sour note.',
    },
    allergens: ['soy'],
    diet: 'vegan',
  },
  {
    id: 'fruehlingszwiebeln',
    name: { de: 'Frühlingszwiebeln', en: 'Spring onions' },
    sceneColor: '#6aa84f',
    size: 295,
    sceneVariants: [1],
    desc: {
      de: 'Frische Frühlingszwiebeln mit einer leicht scharfen Note.',
      en: 'Fresh spring onions with a slightly sharp note.',
    },
    allergens: [],
    diet: 'vegan',
  },
];
// Regel: Summe aller Topping-Mengen ≤ 4 (z. B. 4× Mais, oder 2× Mais + 2× Ajitama).
// Toppings sind im Bowl-Preis inklusive.
export const TOPPING_MAX = 4;

// ---- 5. Finish (nur Modifier, keine sichtbare Zutat) ----
// label:{de,en}, options = { id, label:{de,en} }, default = Options-ID.
export const FINISH = {
  schaerfe: {
    label: { de: 'Schärfe', en: 'Spiciness' },
    options: [
      { id: 'keine', label: { de: 'Keine', en: 'None' } },
      { id: 'mild', label: { de: 'Mild', en: 'Mild' } },
      { id: 'mittel', label: { de: 'Mittel', en: 'Medium' } },
      { id: 'scharf', label: { de: 'Scharf', en: 'Hot' } },
    ],
    default: 'keine',
  },
  fett: {
    label: { de: 'Fettgehalt', en: 'Richness' },
    options: [
      { id: 'leicht', label: { de: 'Leicht', en: 'Light' } },
      { id: 'normal', label: { de: 'Normal', en: 'Normal' } },
      { id: 'reich', label: { de: 'Reich', en: 'Rich' } },
    ],
    default: 'leicht',
  },
  knoblauch: {
    label: { de: 'Knoblauch', en: 'Garlic' },
    options: [
      { id: 'kein', label: { de: 'Kein', en: 'None' } },
      { id: 'etwas', label: { de: 'Etwas', en: 'Some' } },
      { id: 'viel', label: { de: 'Viel', en: 'Lots' } },
    ],
    default: 'kein',
  },
};

// ---- Bowl-Preis ----
// Grundpreis (Brühe + Nudeln + Toppings + Finish). Protein kommt als Aufpreis oben drauf.
// Bowl-Preis = BOWL_BASE_PRICE + gewähltes Protein.price
// Beispiel: Miso + Mittel + Chashu Schwein + 3 Toppings = 10 + 3 = 13
export const BOWL_BASE_PRICE = 10;

// ---- Getränke ----
export const DRINKS = [
  {
    id: 'wasser',
    name: { de: 'Wasser', en: 'Water' },
    desc: { de: 'Stilles Wasser, jederzeit kostenlos.', en: 'Still water, free any time.' },
    price: 0,
    allergens: [],
  },
  {
    id: 'bier',
    name: { de: 'Japanisches Bier', en: 'Japanese beer' },
    desc: {
      de: 'Helles japanisches Lagerbier. Asahi ist trocken und herb, Sapporo milder und leicht malzig.',
      en: 'Pale Japanese lager. Asahi is dry and crisp, Sapporo milder and slightly malty.',
    },
    price: 5,
    variants: [
      { id: 'asahi', label: { de: 'Asahi', en: 'Asahi' } },
      { id: 'sapporo', label: { de: 'Sapporo', en: 'Sapporo' } },
    ],
    allergens: ['gluten'],
  },
  {
    id: 'matcha',
    name: { de: 'Matcha Tee', en: 'Matcha tea' },
    desc: {
      de: 'Grüner Tee aus fein gemahlenem Matcha, cremig im Geschmack.',
      en: 'Green tea made from finely ground matcha, creamy in taste.',
    },
    price: 4,
    variants: [
      { id: 'warm', label: { de: 'Warm', en: 'Warm' } },
      { id: 'kalt', label: { de: 'Kalt', en: 'Cold' } },
    ],
    allergens: [],
  },
  {
    id: 'ramune',
    name: { de: 'Ramune', en: 'Ramune' },
    desc: {
      de: 'Japanische Limonade mit der bekannten Murmel im Flaschenhals.',
      en: 'Japanese soda with the famous marble in the bottleneck.',
    },
    price: 4,
    allergens: [],
  },
  {
    id: 'softdrink',
    name: { de: 'Softdrink', en: 'Soft drink' },
    desc: { de: 'Erfrischend und eiskalt serviert.', en: 'Served refreshing and ice-cold.' },
    price: 3,
    variants: [
      { id: 'cola', label: { de: 'Cola', en: 'Cola' } },
      { id: 'fanta', label: { de: 'Fanta', en: 'Fanta' } },
      { id: 'sprite', label: { de: 'Sprite', en: 'Sprite' } },
    ],
    allergens: [],
  },
];

// ---- Beilagen ----
export const SIDES = [
  {
    id: 'gyoza',
    name: { de: 'Gyoza', en: 'Gyoza' },
    desc: {
      de: 'Gefüllte Teigtaschen, der Klassiker zum Ramen.',
      en: 'Filled dumplings, the classic alongside ramen.',
    },
    price: 6,
    variants: [
      { id: 'gebraten', label: { de: 'Gebraten', en: 'Fried' } },
      { id: 'gedaempft', label: { de: 'Gedämpft', en: 'Steamed' } },
    ],
    allergens: ['gluten', 'soy', 'sesame'],
  },
  {
    id: 'edamame',
    name: { de: 'Edamame', en: 'Edamame' },
    desc: {
      de: 'Gesalzene Sojabohnen in der Schote, ideal zum Teilen.',
      en: 'Salted soybeans in the pod, ideal for sharing.',
    },
    price: 4,
    allergens: ['soy'],
    diet: 'vegan',
  },
  {
    id: 'karaage',
    name: { de: 'Karaage', en: 'Karaage' },
    desc: {
      de: 'Frittierte Hähnchenstücke, außen knusprig und innen saftig.',
      en: 'Fried chicken pieces, crispy outside and juicy inside.',
    },
    price: 7,
    allergens: ['gluten', 'soy'],
  },
  {
    id: 'reis',
    name: { de: 'Reis', en: 'Rice' },
    desc: {
      de: 'Eine Schale gedämpfter Reis, gut zum Auftunken der Brühe.',
      en: 'A bowl of steamed rice, great for soaking up the broth.',
    },
    price: 3,
    allergens: [],
    diet: 'vegan',
  },
];

// ---- Empfehlungen (Start-Screen) ----
// Fertige Beispiel-Bowls als Daten (Feldnamen wie im orderStore-Bau-Zustand).
// Kein Preis hier hinterlegen: die Anzeige rechnet ihn über bowlPrice(config),
// damit es nur eine Preisquelle gibt. hardness/finish referenzieren Options-IDs
// (NOODLE_FIRMNESS.default bzw. group.default).
const RECOMMENDED_FINISH = Object.fromEntries(
  Object.entries(FINISH).map(([key, group]) => [key, group.default]),
);

export const RECOMMENDED_BOWLS = [
  {
    id: 'tonkotsu-klassiker',
    name: { de: 'Tonkotsu Klassiker', en: 'Tonkotsu classic' },
    config: {
      broth: 'tonkotsu',
      noodle: 'duenn',
      hardness: NOODLE_FIRMNESS.default,
      protein: 'chashu-schwein',
      toppings: { ajitama: 1, nori: 1, fruehlingszwiebeln: 1 },
      finish: RECOMMENDED_FINISH,
    },
  },
  {
    id: 'miso-garten',
    name: { de: 'Miso Veggie', en: 'Veggie miso' },
    config: {
      broth: 'miso',
      noodle: 'dick',
      hardness: NOODLE_FIRMNESS.default,
      protein: 'tofu',
      toppings: { mais: 1, ajitama: 1, fruehlingszwiebeln: 1 },
      finish: RECOMMENDED_FINISH,
    },
  },
];

// ---- Nach dem Essen: Nudeln nachbestellen ----
// Erscheint als Ein-Tipp-Option in der Nachbestell-/Status-Ansicht.
// Hinweistext im UI: „nur sinnvoll, wenn noch Brühe da ist".
export const KAEDAMA = {
  id: 'kaedama',
  name: { de: 'Kae-Dama', en: 'Kae-Dama' },
  desc: {
    de: 'Eine Extra-Portion Nudeln für die übrig gebliebene Brühe.',
    en: 'An extra portion of noodles for the broth you have left.',
  },
  price: 3,
  allergens: ['gluten'],
  diet: 'vegan',
};

// ============================================================
// Anzeige-Label-Helfer
// ============================================================
// Leitet aus einer bestellten Position ODER einer Warenkorb-Zeile den LOKALISIERTEN
// Anzeigenamen ab (tx() liest die aktuelle Sprache live):
//  - Bowl (config hat broth):        `${tx(broth.name)}-Bowl` ("Bowl" bleibt bewusst
//    unverändert, ist bestehende Konvention).
//  - Getränk/Beilage:                aus refId + variant (IDs) ->
//    `${tx(menuItem.name)}${variant ? ' (' + tx(variantLabel) + ')' : ''}`.
//  - Fallback:                       das gespeicherte deutsche `name`, falls die
//    Referenzen fehlen (alte Bestellungen ohne refId/variant im config-JSON).
// Warenkorb-Zeilen tragen refId/variant direkt; bestellte Positionen tragen sie
// im config-JSON (dataService.toOrderItems). Beides wird hier abgedeckt.
export function itemDisplayName(item) {
  const config = item?.config ?? null;

  // Bowl: über die Brühe benannt. Gast-facing heißt es „Ramen", nie „Bowl"
  // (CLAUDE.md §3.8: Code bleibt `bowl`, sichtbarer Text ist „Ramen").
  if (config && config.broth) {
    const broth = BROTHS.find((b) => b.id === config.broth);
    const brothName = tx(broth?.name);
    return brothName ? `${brothName}-Ramen` : 'Ramen';
  }

  const refId = config?.refId ?? item?.refId ?? null;
  const variantId = config?.variant ?? item?.variant ?? null;
  if (refId) {
    const list = item?.type === 'side' ? SIDES : item?.type === 'drink' ? DRINKS : [...DRINKS, ...SIDES];
    const menuItem = list.find((m) => m.id === refId);
    if (menuItem) {
      const variantLabel =
        variantId && menuItem.variants
          ? menuItem.variants.find((v) => v.id === variantId)?.label
          : null;
      return variantLabel ? `${tx(menuItem.name)} (${tx(variantLabel)})` : tx(menuItem.name);
    }
  }

  // Fallback: gespeicherter (deutscher) Name aus alten Datensätzen.
  return item?.name ?? '';
}
