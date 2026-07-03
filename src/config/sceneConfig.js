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

// Brühe-Oberfläche (füllt die Schüssel-Öffnung). Nutzt das Brühe-PNG als Textur.
export const BROTH_CY = 2;
export const BROTH_RX = 180;
export const BROTH_RY = 58;

// Streu-Ellipse: hier verteilen sich die Zutaten (im sichtbaren Brühe-Band)
export const SCAT_CX = 0;
export const SCAT_CY = 8;
export const SCAT_RX = 140;
export const SCAT_RY = 42;

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
  bowlBack: 0,
  submerged: 10, // (optional) hinter der Brühe
  broth: 20,
  shadow: 23, // Kontaktschatten der Surface-Zutaten
  noodle: 26, // Nudeln: auf der Brühe, aber unter Protein/Toppings
  surface: 30, // + frontness*9  (Protein, Toppings)
  meniscus: 40,
  splash: 45,
  bowlFront: 50,
  steam: 60,
};
