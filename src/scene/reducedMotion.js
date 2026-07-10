/* =============================================================================
 * Reduced-Motion: einmalige matchMedia-Abfrage fürs Kiosk-Tablet. NUR die neuen
 * Szenen-Animationen (Brühe füllen/blenden, Zutaten versinken, Dampf einblenden)
 * richten sich danach; die bestehende Fall-Feder und das Float bleiben unberührt.
 * Einmal beim Laden ausgewertet — der Kiosk wechselt die Einstellung nicht zur
 * Laufzeit, darum kein Listener nötig.
 * ===========================================================================*/
export const PREFERS_REDUCED_MOTION =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
