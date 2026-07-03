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
  { id: 'tonkotsu', name: 'Tonkotsu', sceneColor: '#e8ddc8', desc: 'Cremige Schweineknochenbrühe. Reich, fettig, intensiv. Stundenlang gekocht.' },
  { id: 'shoyu',    name: 'Shoyu',    sceneColor: '#8a5a3b', desc: 'Klare Brühe mit Sojasoße. Leichter, salzig, aromatisch. Klassiker aus Tokyo.' },
  { id: 'miso',     name: 'Miso',     sceneColor: '#f0a868', desc: 'Mit fermentierter Sojabohnenpaste. Erdig, komplex, leicht süßlich.' },
  { id: 'shio',     name: 'Shio',     sceneColor: '#f5e6c5', desc: 'Die leichteste Brühe. Klar, salzig, sehr fein. Man schmeckt jede Zutat einzeln.' },
];

// ---- 2. Nudeln (Einfach-Auswahl) + Härte-Modifier ----
export const NOODLES = [
  { id: 'duenn',  name: 'Dünn',   sceneColor: '#e8d8a0', size: 300, desc: 'Fein, glatt und bissfest. Nimmt cremige Brühen perfekt auf.',        pairsWith: ['tonkotsu'] },
  { id: 'mittel', name: 'Mittel', sceneColor: '#e8d8a0', size: 310, desc: 'Der Allrounder. Ausgewogen im Biss, fängt den Geschmack optimal ein.', pairsWith: ['shoyu', 'shio'] },
  { id: 'dick',   name: 'Dick',   sceneColor: '#e8d8a0', size: 320, desc: 'Kräftig, sättigend, viel Biss. Hält intensiven, deftigen Aromen stand.', pairsWith: ['miso'] },
];
// Modifier: ändert keine sichtbare Zutat in der Bowl
export const NOODLE_FIRMNESS = { label: 'Nudelhärte', options: ['Weich', 'Normal', 'Fest', 'Extra fest'], default: 'Normal' };

// ---- 3. Protein (Einfach-Auswahl, Aufpreis auf die Bowl) ----
export const PROTEINS = [
  { id: 'chashu-schwein',  name: 'Chashu Schwein',  sceneColor: '#b5651d', size: 165, desc: 'Langsam gegarter Schweinebauch. Zart, karamellisiert, schmilzt fast.', price: 3, pairsWith: ['tonkotsu'] },
  { id: 'chashu-haehnchen', name: 'Chashu Hähnchen', sceneColor: '#d9a066', size: 150, desc: 'Die leichtere Alternative. Saftig, mild, weniger fettig.',           price: 3, pairsWith: ['shio', 'shoyu'] },
  { id: 'tofu',            name: 'Tofu',            sceneColor: '#f0ead0', size: 140, desc: 'Gebratener fester Tofu. Nimmt den Geschmack der Brühe auf.',           price: 2, pairsWith: ['miso'] },
  { id: 'ohne',            name: 'Ohne Protein',    desc: 'Nur Brühe, Nudeln und Toppings. Für alle, die es leicht mögen.',       price: 0 },
];

// ---- 4. Toppings (Mehrfach-Auswahl mit Menge) ----
export const TOPPINGS = [
  { id: 'ajitama',           name: 'Ajitama',           sceneColor: '#f5d76e', size: 150, desc: 'Mariniertes Ei, halbweich. Dotter cremig, außen süßlich-salzig.', pairsWith: 'alle' },
  { id: 'naruto',            name: 'Naruto',            sceneColor: '#e8a0a8', size: 115, desc: 'Fischkuchen-Rädchen mit rosa Spirale. Sehr ikonisch fürs Aussehen.' },
  { id: 'nori',              name: 'Nori',              sceneColor: '#2f4f3a', size: 130, desc: 'Getrocknetes Meeresalgenblatt. Leicht rauchig, maritim.' },
  { id: 'mais',              name: 'Mais',              sceneColor: '#f2c14e', size: 130, desc: 'Süßlich, knackig.', pairsWith: ['miso'] },
  { id: 'bambussprossen',    name: 'Bambussprossen',    sceneColor: '#d9b96a', size: 120, desc: 'Knackig, leicht säuerlich, sehr authentisch.' },
  { id: 'fruehlingszwiebeln', name: 'Frühlingszwiebeln', sceneColor: '#6aa84f', size: 100, desc: 'Frisch, leicht scharf. Gibt der Schüssel Farbe.' },
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
  { id: 'wasser',    name: 'Wasser',           desc: 'Kostenlos, steht am Tisch.',                  price: 0 },
  { id: 'bier',      name: 'Japanisches Bier', desc: 'Asahi oder Sapporo.',                         price: 5, variants: ['Asahi', 'Sapporo'] },
  { id: 'matcha',    name: 'Matcha Tee',       desc: 'Warm oder kalt.',                             price: 4, variants: ['Warm', 'Kalt'] },
  { id: 'ramune',    name: 'Ramune',           desc: 'Japanische Limonade. Passt zum Erlebnis.',    price: 4 },
  { id: 'softdrink', name: 'Softdrink',        desc: 'Cola, Fanta oder Sprite.',                    price: 3, variants: ['Cola', 'Fanta', 'Sprite'] },
];

// ---- Beilagen ----
export const SIDES = [
  { id: 'gyoza',   name: 'Gyoza',   desc: 'Japanische Teigtaschen, gebraten oder gedämpft. Der Klassiker neben Ramen.', price: 6, variants: ['Gebraten', 'Gedämpft'] },
  { id: 'edamame', name: 'Edamame', desc: 'Gesalzene Sojabohnen. Leicht, schnell, perfekt zum Teilen.',                price: 4 },
  { id: 'karaage', name: 'Karaage', desc: 'Japanisches frittiertes Hähnchen. Knusprig außen, saftig innen.',           price: 7 },
  { id: 'reis',    name: 'Reis',    desc: 'Weiß, gedämpft. Zum Eintunken in die Brühe oder als Sättigungsbeilage.',    price: 3 },
];

// ---- Nach dem Essen: Nudeln nachbestellen ----
// Erscheint als Ein-Tipp-Option in der Nachbestell-/Status-Ansicht.
// Hinweistext im UI: „nur sinnvoll, wenn noch Brühe da ist".
export const KAEDAMA = { id: 'kaedama', name: 'Kae-Dama', desc: 'Extra Nudeln für die restliche Brühe.', price: 3 };
