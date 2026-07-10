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
export const BROTH_CY = 2;
export const BROTH_RX = 180;
export const BROTH_RY = 58;

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
  ajitama:            { x: 82,  y: -10, satellites: [{ dx: -30, dy: 8, scale: 0.9 }, { dx: 30, dy: 12, scale: 0.85 }, { dx: 0, dy: -14, scale: 0.8 }] },
  naruto:             { x: 6,   y: -26, satellites: [{ dx: -26, dy: 6, scale: 0.85 }, { dx: 26, dy: 10, scale: 0.82 }, { dx: 2, dy: -14, scale: 0.78 }] },
  nori:               { x: -70, y: 92,  layer: 'back', float: 0.35, satellites: [{ dx: 24, dy: -4, scale: 0.92 }, { dx: -24, dy: -2, scale: 0.9 }, { dx: 0, dy: 6, scale: 0.88 }] },
  mais:               { x: 92,  y: 30,  satellites: [{ dx: -24, dy: 6, scale: 0.82 }, { dx: 22, dy: 14, scale: 0.78 }, { dx: -4, dy: -16, scale: 0.72 }] },
  bambussprossen:     { x: -92, y: 26,  satellites: [{ dx: 22, dy: 8, scale: 0.85 }, { dx: -20, dy: 12, scale: 0.8 }, { dx: 4, dy: -12, scale: 0.75 }] },
  fruehlingszwiebeln: { x: 8,   y: 16,  satellites: [{ dx: -34, dy: 8, scale: 0.85 }, { dx: 30, dy: 6, scale: 0.8 }, { dx: 0, dy: -12, scale: 0.75 }] },
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
// ausgeblendet -> Zutaten sehen aus, als steckten sie in der Suppe.
export const WATERLINE_Y = 6; // Welt-y der Brühen-Oberfläche
export const WATER_BAND = 18; // weiche Übergangsbreite (halb)
export const SUBMERGE_TINT = 0.5; // wie stark der Unterteil zur Brühenfarbe tönt (0..1)
export const SUBMERGE_FADE = 0.22; // wie stark der Unterteil ausblendet (0..1, klein = bleibt sichtbar)

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
