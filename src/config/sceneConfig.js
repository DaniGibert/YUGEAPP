/* =============================================================================
 * Yuge: Szenen-Konstanten (CLAUDE.md §3.5: ALLE Look-/Tuning-Werte hier).
 * Weltkoordinaten = Pixel, Ursprung = Bowl-Mitte, y nach oben. Die 30°-Aufsicht
 * steckt in den gemalten Assets; die Szene ist ein 2.5D-"Papier-Diorama":
 * flache Ebenen, per renderOrder (Maler-Algorithmus) gestapelt.
 *
 * Werte übernommen aus dem abgestimmten Referenz-Prototyp (referenz/TestAufbau).
 * ===========================================================================*/

// Komposition der Szene (die Kamera passt diese Fläche per Zoom in den
// Container ein, nach außen bleibt das Layout fluid)
export const CANVAS_W = 700;
export const CANVAS_H = 640;

// Schüssel-Ebene (Breite in Welt-px; Höhe folgt dem Seitenverhältnis des PNG)
export const BOWL_W = 640;
export const BOWL_H = 350; // nur Fallback, falls Textur-Maße fehlen
export const BOWL_CY = -30; // Schüssel-Mitte (etwas tief, lässt oben Platz für Dampf)

// Boden-/Steh-Schatten: weicher, flacher Fleck UNTER der Schüssel (liegt hinter
// bowlBack). Erdet die Schüssel, statt sie schweben zu lassen. Weiche Kante über
// die softCircle-Textur; Ellipse durch unterschiedliche Breite/Höhe.
export const GROUND_SHADOW_CX = 60; // Welt-x: leicht nach rechts versetzt
export const GROUND_SHADOW_CY = -150; // Welt-y am Fuß der Schüssel
export const GROUND_SHADOW_W = 400; // Gesamtbreite
export const GROUND_SHADOW_H = 96; // Gesamthöhe (flach)
export const GROUND_SHADOW_OPACITY = 0.3;

// Brühe-Oberfläche (füllt die Schüssel-Öffnung). Nutzt das Brühe-PNG als Textur.
// Werte im Scene-Lab (?ansicht=lab) an der echten Szene eingestellt.
export const BROTH_CY = 20;
export const BROTH_RX = 247;
// RY an das Seitenverhältnis der Brühen-PNGs angepasst (frame ~1.83:1): sonst
// staucht die Ebene das Oval flach und die Brühe wirkt kleiner als im Thumbnail.
export const BROTH_RY = 118;

// Referenz-Band für die frontness-Ableitung (aus y): 1 = vorne (unten, kleines y),
// 0 = hinten (oben). Ein Wert steuert Position, renderOrder und Perspektiv-Scale
// konsistent. (SCAT_CY/SCAT_RY dienen jetzt nur noch als Normalisierungs-Band der
// Anrichte-Karte, nicht mehr als Streu-Ellipse — die Platzierung läuft über ANCHORS.)
export const SCAT_CY = 8;
export const SCAT_RY = 42;

// ---- Anrichte-Karte: fester Anker pro Zutaten-id (statt Goldener-Winkel-Spirale) ----
// Jede Zutat landet an ihrem kuratierten Platz; Mengen 3/4 an den deterministischen
// Satelliten-Offsets. Ein Anker sieht auch allein gut aus (Anrichte-Dreieck aus
// Basis + Akzent). Felder: { x, y, scale?, layer?, float?, satellites: [{dx,dy,scale}×3] }.
//  - x/y: Welt-px, Ursprung Bowl-Mitte (y nach oben). Höheres y = weiter hinten.
//  - scale: optionaler Feintuning-Multiplikator (Default 1); finale Skala =
//    (1 + frontness·0.16) · anchor.scale · satellite.scale.
//  - layer: überschreibt die Kategorie-Grundebene (Nori steht hinten: 'back').
//  - float: dämpft das Wippen (Nori wippt kaum: 0.35). Default 1.
//  - satellites: 3 Offsets für die Mengen jenseits der Bild-Variante (voller Haufen).
// Anker verschieben = ein Wert hier ändern (CLAUDE.md §3.5).
export const ANCHORS = {
  // Nudeln: pro Sorte eigener Anker (im Scene-Lab getunt). rot = Drehung (Grad),
  // stretch = Höhen-Streckung. Keine satellites nötig (Nudeln immer Menge 1).
  duenn:              { x: -1,  y: 14, scale: 1.45, rot: -2, stretch: 0.85 },
  mittel:             { x: -8,  y: 14, scale: 1.4,  rot: -4, stretch: 0.75 },
  dick:               { x: -11, y: 14, scale: 1.3,           stretch: 0.85 },
  // Protein: eigener Anker pro Sorte (im Scene-Lab getunt). Menge immer 1.
  'chashu-schwein':   { x: -89, y: 62 },
  'chashu-haehnchen': { x: -72, y: 61 },
  tofu:               { x: -82, y: 59 },
  // Toppings: x/y/scale/stretch im Scene-Lab getunt; satellites (Mengen 2-4)
  // und Nori-Ebene ('back') bleiben kuratiert.
  ajitama:            { x: 104, y: 40,  satellites: [{ dx: -30, dy: 8, scale: 0.9 }, { dx: 30, dy: 12, scale: 0.85 }, { dx: 0, dy: -14, scale: 0.8 }] },
  naruto:             { x: 35,  y: -25, satellites: [{ dx: -26, dy: 6, scale: 0.85 }, { dx: 26, dy: 10, scale: 0.82 }, { dx: 2, dy: -14, scale: 0.78 }] },
  nori:               { x: -15, y: 92,  layer: 'back', float: 0.35, satellites: [{ dx: 24, dy: -4, scale: 0.92 }, { dx: -24, dy: -2, scale: 0.9 }, { dx: 0, dy: 6, scale: 0.88 }] },
  mais:               { x: 80,  y: -3,  scale: 1.05, stretch: 0.75, satellites: [{ dx: -24, dy: 6, scale: 0.82 }, { dx: 22, dy: 14, scale: 0.78 }, { dx: -4, dy: -16, scale: 0.72 }] },
  bambussprossen:     { x: -92, y: 2,   stretch: 0.85, satellites: [{ dx: 22, dy: 8, scale: 0.85 }, { dx: -20, dy: 12, scale: 0.8 }, { dx: 4, dy: -12, scale: 0.75 }] },
  fruehlingszwiebeln: { x: 8,   y: 29,  stretch: 0.9, satellites: [{ dx: -34, dy: 8, scale: 0.85 }, { dx: 30, dy: 6, scale: 0.8 }, { dx: 0, dy: -12, scale: 0.75 }] },
};

// Fallback-Anker je Kategorie (neue Zutat ohne eigenen ANCHORS-Eintrag). Nudeln
// bilden die Basis (Mitte), Protein liegt vorne links, uncurated Toppings mittig.
export const ANCHOR_DEFAULT = {
  noodle:  { x: 0,   y: 6,   satellites: [{ dx: -24, dy: 6, scale: 0.85 }, { dx: 24, dy: 8, scale: 0.82 }, { dx: 0, dy: -12, scale: 0.8 }] },
  protein: { x: -75, y: -14, satellites: [{ dx: -22, dy: 6, scale: 0.85 }, { dx: 22, dy: 10, scale: 0.82 }, { dx: 0, dy: -12, scale: 0.8 }] },
  topping: { x: 0,   y: 2,   satellites: [{ dx: -28, dy: 8, scale: 0.82 }, { dx: 26, dy: 12, scale: 0.8 }, { dx: 0, dy: -14, scale: 0.75 }] },
};

// Mini-Plop: Hubhöhe beim Mengen-/Varianten-Wechsel (Haupt-Item hüpft kurz an
// und fällt zurück -> Ripple beim Wieder-Landen). Kleiner als DROP_FROM (Erst-Fall).
export const PLOP_DROP = 56;

// Fallhöhe (Startversatz über dem Ziel)
export const DROP_FROM = 340;

// "Wasserlinie": Alles unterhalb dieser Welt-y wird zur Brühenfarbe getönt & leicht
// ausgeblendet -> Zutaten sehen aus, als steckten sie in der Suppe. Das macht der
// Shader in scene/Ingredient3D.jsx pro Pixel (nicht pro Zutat), darum taucht eine
// Zutat beim Fallen weich ein statt hart umzuschalten.
// Getunt wird das im Scene-Lab (?ansicht=lab, Modus "Brühe").
export const WATERLINE_Y = 6; // Welt-y der Brühen-Oberfläche (wo der Schnitt sitzt)
export const WATER_BAND = 18; // weiche Übergangsbreite (halb; größer = weicherer Verlauf)
export const SUBMERGE_TINT = 0.5; // wie stark der Unterteil zur Brühenfarbe tönt (0..1)
export const SUBMERGE_FADE = 0.08; // wie stark der Unterteil ausblendet (0..1, klein = bleibt sichtbar)

// Neigung der Wasserlinie. Die Brühen-Oberfläche ist eine ELLIPSE, also eine
// geneigte Ebene — im 2.5D-Bild heißt "weiter hinten" schlicht "höher". Eine
// einzige waagerechte Linie taucht darum hintere Zutaten (hoch) zu WENIG und
// vordere (tief) zu VIEL ein; das lässt sich mit WATERLINE_Y allein nicht
// beheben. Deshalb bekommt jede Zutat ihre eigene Wasserlinie, gedreht um
// WATERLINE_Y als Angelpunkt:
//   waterY(zutat) = WATERLINE_Y + WATERLINE_TILT * (ankerY - WATERLINE_Y)
//   0   = eine flache Linie für alle (Verhalten vor der Neigung)
//   1   = jede Zutat wird auf ihrer eigenen Anker-Höhe geschnitten, die Linie
//         folgt also dem Winkel der Brühen-Ebene (alle gleich tief drin)
//   >1  = hintere Zutaten tauchen zusätzlich tiefer ein, vordere ragen mehr raus
export const WATERLINE_TILT = 0;

// Gebündelt als Default fürs Durchreichen: BowlScene/Ingredient3D nehmen ohne
// `submerge`-Prop genau diese Werte (Normalbetrieb), das Lab überschreibt sie live.
export const SUBMERGE_DEFAULT = {
  waterlineY: WATERLINE_Y,
  tilt: WATERLINE_TILT,
  band: WATER_BAND,
  tint: SUBMERGE_TINT,
  fade: SUBMERGE_FADE,
};

// Wasserlinie EINER Zutat (die Regel lebt nur hier). itemY = Anker-Höhe.
// Gedreht um waterlineY als Angelpunkt: tilt=0 -> flache Linie für alle,
// tilt=1 -> Schnitt auf der eigenen Anker-Höhe, tilt>1 -> hinten tiefer rein.
export function waterlineFor(itemY, cfg = SUBMERGE_DEFAULT) {
  const base = cfg.waterlineY ?? WATERLINE_Y;
  const tilt = cfg.tilt ?? WATERLINE_TILT;
  return base + tilt * (itemY - base);
}

// ---- Szenen-Animationen (Brühe füllen/blenden, Zutaten versinken, Dampf) ----
// A) Erste Brühe in leerer Bowl "füllt sich von unten": die Oberflächen-Ellipse
// startet tief und klein (Flüssigkeitsspiegel am Schüsselboden) und steigt/wächst
// zur Endposition — die Perspektiv-Logik des Dioramas (tiefer Pegel = kleinere
// sichtbare Oberfläche). Clock-getrieben in Broth.
export const FILL_DURATION = 1.1; // s: Dauer des Füllens (easeOutCubic)
export const FILL_RISE = 40; // Welt-px: Start-Tiefe des Pegels unter BROTH_CY
export const FILL_START_SCALE = 0.55; // Start-Skala der Oberflächen-Ellipse (0..1)
// Begleit-Ripples während des Füllens: at = Anteil der Fülldauer (0..1), x/y = Welt-px
// relativ zur Oberfläche (wandern beim Steigen/Wachsen mit der Plane mit).
export const FILL_RIPPLES = [
  { at: 0.15, x: 0, y: 0 },
  { at: 0.45, x: -42, y: 10 },
  { at: 0.78, x: 38, y: -8 },
];
// Stärke der Füll-Ripples (0..1): dezenter als die vollen Aufprall-Ripples der
// Zutaten (die bleiben 1). Kleiner = ruhigere Wellen beim Füllen.
export const FILL_RIPPLE_STRENGTH = 0.4;
// B) Brühen-Wechsel: weicher Farb-/Textur-Crossfade statt hartem Umschalten.
export const BLEND_DURATION = 0.4; // s: Dauer des Crossfades (smoothstep)
// C) Entfernte Zutat versinkt in der Brühe (Fallback ohne Brühe: Schrumpfen + Ausblenden).
export const SINK_DEPTH = 46; // Welt-px: wie tief die Zutat beim Entfernen absinkt
export const SINK_DURATION = 650; // ms: Dauer des Versinkens (useTransition leave)
export const SINK_FADE_TAIL = 0.35; // Anteil der Reststrecke, über den es ausblendet
// Dampf blendet nach dem ersten Füllen sanft ein (statt schlagartig da zu sein).
export const STEAM_FADE_IN = 1.0; // s: Einblenddauer des Dampfs

// ---- Dampf-Look (Steam): deutlich sichtbar über der Suppe, aber weich/additiv,
// kein Nebel-Teppich. Wenige Partikel (Tablet-freundlich). ----
export const STEAM_COUNT = 18; // Anzahl Partikel
export const STEAM_OPACITY = 0.3; // Peak-Opacity eines Partikels (Sinus-Zyklus)
export const STEAM_SCALE_MIN = 60; // kleinste Sprite-Grundgröße (Welt-px)
export const STEAM_SCALE_MAX = 130; // größte Sprite-Grundgröße (Welt-px)

// renderOrder-Strata (hinten -> vorne). Maler-Algorithmus, depthTest aus.
export const RO = {
  groundShadow: -10, // Boden-Schatten hinter/unter der Schüssel
  bowlBack: 0,
  submerged: 10, // (optional) hinter der Brühe
  broth: 20,
  back: 22, // stehende Zutaten hinten am Rand (Nori), hinter Nudeln/Toppings
  shadow: 23, // Kontaktschatten der Surface-Zutaten
  noodle: 26, // Nudeln: auf der Brühe, aber unter Protein/Toppings
  surface: 30, // + frontness*9  (Protein, Toppings)
  meniscus: 40,
  splash: 45,
  bowlFront: 50,
  steam: 60,
};

// Gemeinsame Ebenen-Map (Zutat-layer -> Basis-renderOrder) für beide Renderpfade:
// WebGL-Szene (Ingredient3D) UND DOM-Thumbnail (BowlThumbnail). +round(frontness·9)
// staffelt innerhalb einer Ebene. Nur diese Ebenen kommen für Zutaten in Frage.
export const LAYER_RO = {
  back: RO.back,
  submerged: RO.submerged,
  noodle: RO.noodle,
  surface: RO.surface,
};
