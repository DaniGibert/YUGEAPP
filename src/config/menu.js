// ============================================================
// Yuge: Menü + Preise als Daten (Single Source of Truth fürs Menü)
//
// Alles hier ist Daten, keine Logik. Zutat hinzufügen/umbenennen/umpreisen
// = hier ändern, nirgends sonst.
//
// - Preise sind Ganzzahlen (Euro).
// - `id` ist gleichzeitig der Bild-Dateiname: public/assets/<kategorie>/<id>.png
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

// ---- 1. Brühe (Einfach-Auswahl) ----
export const BROTHS = [
  { id: 'tonkotsu', name: 'Tonkotsu', sceneColor: '#e3c9ac', desc: 'Cremige Brühe aus Schweineknochen, die stundenlang köchelt. Kräftig und macht richtig satt.' },
  { id: 'shoyu',    name: 'Shoyu',    sceneColor: '#c69160', desc: 'Klare Brühe auf Basis von Sojasoße. Etwas leichter als Tonkotsu und ein Klassiker aus Tokyo.' },
  { id: 'miso',     name: 'Miso',     sceneColor: '#c68d62', desc: 'Herzhafte Brühe mit Miso-Paste. Kräftig im Geschmack, mit einer leicht süßlichen Note.' },
  { id: 'shio',     name: 'Shio',     sceneColor: '#e4d2b8', desc: 'Unsere leichteste und feinste Brühe, klar und mild gesalzen.' },
];

// ---- 2. Nudeln (Einfach-Auswahl) + Härte-Modifier ----
export const NOODLES = [
  { id: 'duenn',  name: 'Dünn',   sceneColor: '#e8d8a0', size: 310, desc: 'Dünne, glatte Nudeln mit Biss. Passen besonders gut zu cremigen Brühen.',        pairsWith: ['tonkotsu'] },
  { id: 'mittel', name: 'Mittel', sceneColor: '#e8d8a0', size: 320, desc: 'Der Allrounder, der zu jeder Brühe passt. Wenn du unsicher bist, nimm diese.', pairsWith: ['shoyu', 'shio'] },
  { id: 'dick',   name: 'Dick',   sceneColor: '#e8d8a0', size: 320, desc: 'Dicke Nudeln mit ordentlich Biss. Machen satt und halten kräftigen Brühen stand.', pairsWith: ['miso'] },
];
// Modifier: ändert keine sichtbare Zutat in der Bowl
export const NOODLE_FIRMNESS = { label: 'Nudelhärte', options: ['Weich', 'Normal', 'Fest', 'Extra fest'], default: 'Normal' };

// ---- 3. Protein (Einfach-Auswahl, Aufpreis auf die Bowl) ----
export const PROTEINS = [
  { id: 'chashu-schwein',  name: 'Chashu Schwein',  sceneColor: '#b5651d', size: 245, desc: 'Schweinebauch, der so lange gegart wird, bis er ganz zart ist.', price: 3, pairsWith: ['tonkotsu'] },
  { id: 'chashu-haehnchen', name: 'Chashu Hähnchen', sceneColor: '#d9a066', size: 245, desc: 'Die leichtere Wahl statt Schwein. Saftiges Hähnchen, mild im Geschmack.',           price: 3, pairsWith: ['shio', 'shoyu'] },
  { id: 'tofu',            name: 'Tofu',            sceneColor: '#f0ead0', size: 300, desc: 'Gebratener Tofu, der den Geschmack der Brühe aufnimmt. Die vegetarische Wahl.',           price: 2, pairsWith: ['miso'] },
  { id: 'ohne',            name: 'Ohne Protein',    desc: 'Nur Brühe, Nudeln und Toppings, für alle die es leichter mögen.',       price: 0 },
];

// ---- 4. Toppings (Mehrfach-Auswahl mit Menge) ----
export const TOPPINGS = [
  { id: 'ajitama',           name: 'Ajitama',           sceneColor: '#f5d76e', size: 150, sceneVariants: [1], desc: 'Weich gekochtes Ei, das in einer süßlich-salzigen Marinade zieht. Innen noch schön weich.', pairsWith: 'alle' },
  { id: 'naruto',            name: 'Naruto',            sceneColor: '#e8a0a8', size: 115, sceneVariants: [1], desc: 'Fischkuchen mit der typisch rosa Spirale. Vor allem was fürs Auge.' },
  { id: 'nori',              name: 'Nori',              sceneColor: '#2f4f3a', size: 130, sceneVariants: [1], desc: 'Ein Blatt getrocknete Alge mit leicht rauchigem Geschmack.' },
  { id: 'mais',              name: 'Mais',              sceneColor: '#f2c14e', size: 130, sceneVariants: [1], desc: 'Süße, knackige Maiskörner.', pairsWith: ['miso'] },
  { id: 'bambussprossen',    name: 'Bambussprossen',    sceneColor: '#d9b96a', size: 120, sceneVariants: [1], desc: 'Knackige Bambussprossen mit einer leicht säuerlichen Note.' },
  { id: 'fruehlingszwiebeln', name: 'Frühlingszwiebeln', sceneColor: '#6aa84f', size: 100, sceneVariants: [1], desc: 'Frische Frühlingszwiebeln mit einer leicht scharfen Note.' },
];
// Regel: Summe aller Topping-Mengen ≤ 4 (z. B. 4× Mais, oder 2× Mais + 2× Ajitama).
// Toppings sind im Bowl-Preis inklusive.
export const TOPPING_MAX = 4;

// ---- 5. Finish (nur Modifier, keine sichtbare Zutat) ----
export const FINISH = {
  schaerfe:  { label: 'Schärfe',    options: ['Keine', 'Mild', 'Mittel', 'Scharf'], default: 'Keine' },
  fett:      { label: 'Fettgehalt', options: ['Leicht', 'Normal', 'Reich'],         default: 'Leicht' },
  knoblauch: { label: 'Knoblauch',  options: ['Kein', 'Etwas', 'Viel'],             default: 'Kein' },
};

// ---- Bowl-Preis ----
// Grundpreis (Brühe + Nudeln + Toppings + Finish). Protein kommt als Aufpreis oben drauf.
// Bowl-Preis = BOWL_BASE_PRICE + gewähltes Protein.price
// Beispiel: Miso + Mittel + Chashu Schwein + 3 Toppings = 10 + 3 = 13
export const BOWL_BASE_PRICE = 10;

// ---- Getränke ----
export const DRINKS = [
  { id: 'wasser',    name: 'Wasser',           desc: 'Stilles Wasser, jederzeit kostenlos.', price: 0 },
  { id: 'bier',      name: 'Japanisches Bier', desc: 'Helles japanisches Bier, frisch und leicht herb.',    price: 5, variants: ['Asahi', 'Sapporo'] },
  { id: 'matcha',    name: 'Matcha Tee',       desc: 'Grüner Tee aus fein gemahlenem Matcha, cremig im Geschmack.', price: 4, variants: ['Warm', 'Kalt'] },
  { id: 'ramune',    name: 'Ramune',           desc: 'Japanische Limonade mit der bekannten Murmel im Flaschenhals.', price: 4 },
  { id: 'softdrink', name: 'Softdrink',        desc: 'Erfrischend und eiskalt serviert.',           price: 3, variants: ['Cola', 'Fanta', 'Sprite'] },
];

// ---- Beilagen ----
export const SIDES = [
  { id: 'gyoza',   name: 'Gyoza',   desc: 'Gefüllte Teigtaschen, der Klassiker zum Ramen.', price: 6, variants: ['Gebraten', 'Gedämpft'] },
  { id: 'edamame', name: 'Edamame', desc: 'Gesalzene Sojabohnen in der Schote, ideal zum Teilen.',                price: 4 },
  { id: 'karaage', name: 'Karaage', desc: 'Frittierte Hähnchenstücke, außen knusprig und innen saftig.',           price: 7 },
  { id: 'reis',    name: 'Reis',    desc: 'Eine Schale gedämpfter Reis, gut zum Auftunken der Brühe.',    price: 3 },
];

// ---- Empfehlungen (Start-Screen) ----
// Fertige Beispiel-Bowls als Daten (Feldnamen wie im orderStore-Bau-Zustand).
// Kein Preis hier hinterlegen: die Anzeige rechnet ihn ueber bowlPrice(config),
// damit es nur eine Preisquelle gibt.
const RECOMMENDED_FINISH = Object.fromEntries(
  Object.entries(FINISH).map(([key, group]) => [key, group.default]),
);

export const RECOMMENDED_BOWLS = [
  {
    id: 'tonkotsu-klassiker',
    name: 'Tonkotsu Klassiker',
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
    name: 'Miso Garten',
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
export const KAEDAMA = { id: 'kaedama', name: 'Kae-Dama', desc: 'Eine Extra-Portion Nudeln für die übrig gebliebene Brühe.', price: 3 };
