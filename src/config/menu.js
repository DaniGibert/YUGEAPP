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
//
// Ablage: src/config/menu.js
// ============================================================

// ---- 1. Brühe (Einfach-Auswahl) ----
export const BROTHS = [
  { id: 'tonkotsu', name: 'Tonkotsu', sceneColor: '#e8ddc8', desc: 'Cremige Brühe aus Schweineknochen, die stundenlang köchelt. Kräftig und macht richtig satt.' },
  { id: 'shoyu',    name: 'Shoyu',    sceneColor: '#8a5a3b', desc: 'Klare Brühe auf Basis von Sojasoße. Etwas leichter als Tonkotsu und ein Klassiker aus Tokyo.' },
  { id: 'miso',     name: 'Miso',     sceneColor: '#f0a868', desc: 'Herzhafte Brühe mit Miso-Paste. Kräftig im Geschmack, mit einer leicht süßlichen Note.' },
  { id: 'shio',     name: 'Shio',     sceneColor: '#f5e6c5', desc: 'Unsere leichteste und feinste Brühe, klar und mild gesalzen.' },
];

// ---- 2. Nudeln (Einfach-Auswahl) + Härte-Modifier ----
export const NOODLES = [
  { id: 'duenn',  name: 'Dünn',   sceneColor: '#e8d8a0', size: 300, desc: 'Dünne, glatte Nudeln mit Biss. Passen besonders gut zu cremigen Brühen.',        pairsWith: ['tonkotsu'] },
  { id: 'mittel', name: 'Mittel', sceneColor: '#e8d8a0', size: 310, desc: 'Der Allrounder, der zu jeder Brühe passt. Wenn du unsicher bist, nimm diese.', pairsWith: ['shoyu', 'shio'] },
  { id: 'dick',   name: 'Dick',   sceneColor: '#e8d8a0', size: 320, desc: 'Dicke Nudeln mit ordentlich Biss. Machen satt und halten kräftigen Brühen stand.', pairsWith: ['miso'] },
];
// Modifier: ändert keine sichtbare Zutat in der Bowl
export const NOODLE_FIRMNESS = { label: 'Nudelhärte', options: ['Weich', 'Normal', 'Fest', 'Extra fest'], default: 'Normal' };

// ---- 3. Protein (Einfach-Auswahl, Aufpreis auf die Bowl) ----
export const PROTEINS = [
  { id: 'chashu-schwein',  name: 'Chashu Schwein',  sceneColor: '#b5651d', size: 165, desc: 'Schweinebauch, der so lange gegart wird, bis er ganz zart ist.', price: 3, pairsWith: ['tonkotsu'] },
  { id: 'chashu-haehnchen', name: 'Chashu Hähnchen', sceneColor: '#d9a066', size: 150, desc: 'Die leichtere Wahl statt Schwein. Saftiges Hähnchen, mild im Geschmack.',           price: 3, pairsWith: ['shio', 'shoyu'] },
  { id: 'tofu',            name: 'Tofu',            sceneColor: '#f0ead0', size: 140, desc: 'Gebratener Tofu, der den Geschmack der Brühe aufnimmt. Die vegetarische Wahl.',           price: 2, pairsWith: ['miso'] },
  { id: 'ohne',            name: 'Ohne Protein',    desc: 'Nur Brühe, Nudeln und Toppings, für alle die es leichter mögen.',       price: 0 },
];

// ---- 4. Toppings (Mehrfach-Auswahl mit Menge) ----
export const TOPPINGS = [
  { id: 'ajitama',           name: 'Ajitama',           sceneColor: '#f5d76e', size: 150, desc: 'Weich gekochtes Ei, das in einer süßlich-salzigen Marinade zieht. Innen noch schön weich.', pairsWith: 'alle' },
  { id: 'naruto',            name: 'Naruto',            sceneColor: '#e8a0a8', size: 115, desc: 'Fischkuchen mit der typisch rosa Spirale. Vor allem was fürs Auge.' },
  { id: 'nori',              name: 'Nori',              sceneColor: '#2f4f3a', size: 130, desc: 'Ein Blatt getrocknete Alge mit leicht rauchigem Geschmack.' },
  { id: 'mais',              name: 'Mais',              sceneColor: '#f2c14e', size: 130, desc: 'Süße, knackige Maiskörner.', pairsWith: ['miso'] },
  { id: 'bambussprossen',    name: 'Bambussprossen',    sceneColor: '#d9b96a', size: 120, desc: 'Knackige Bambussprossen mit einer leicht säuerlichen Note.' },
  { id: 'fruehlingszwiebeln', name: 'Frühlingszwiebeln', sceneColor: '#6aa84f', size: 100, desc: 'Frische Frühlingszwiebeln mit einer leicht scharfen Note.' },
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

// ---- Nach dem Essen: Nudeln nachbestellen ----
// Erscheint als Ein-Tipp-Option in der Nachbestell-/Status-Ansicht.
// Hinweistext im UI: „nur sinnvoll, wenn noch Brühe da ist".
export const KAEDAMA = { id: 'kaedama', name: 'Kae-Dama', desc: 'Eine Extra-Portion Nudeln für die übrig gebliebene Brühe.', price: 3 };
