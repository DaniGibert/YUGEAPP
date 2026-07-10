/* =============================================================================
 * Textur-Helfer: lädt Asset-PNGs, mit prozeduralem Platzhalter-Fallback.
 * (Analog zum DOM-IngredientVisual: fehlt eine Datei -> farbige Form.)
 * ===========================================================================*/
import { useEffect, useState } from "react";
import * as THREE from "three";

const loader = new THREE.TextureLoader();
const texPromiseCache = new Map(); // src -> Promise<Texture>
const failed = new Set(); // src, deren Laden fehlschlug
const placeholderCache = new Map(); // key -> CanvasTexture

function canvas2d(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function toTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* Weicher weißer Kreis (Dampf, Schatten, Glanz). */
export function softCircleTexture() {
  const key = "soft";
  if (placeholderCache.has(key)) return placeholderCache.get(key);
  const [c, ctx] = canvas2d(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = toTexture(c);
  placeholderCache.set(key, t);
  return t;
}

/* Platzhalter-Zutat: farbiger Blob mit etwas Tiefe. */
export function placeholderIngredientTexture(color = "#cccccc") {
  const key = `ing:${color}`;
  if (placeholderCache.has(key)) return placeholderCache.get(key);
  const [c, ctx] = canvas2d(128, 128);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fill();
  // sanfter Schatten unten + Glanz oben
  const sh = ctx.createLinearGradient(0, 12, 0, 116);
  sh.addColorStop(0, "rgba(255,255,255,0.30)");
  sh.addColorStop(0.5, "rgba(255,255,255,0)");
  sh.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = sh;
  ctx.fillRect(0, 0, 128, 128);
  ctx.globalCompositeOperation = "source-over";
  const t = toTexture(c);
  placeholderCache.set(key, t);
  return t;
}

/* Platzhalter-Schüssel hinten (Innenraum/Keramik in Aufsicht). */
export function placeholderBowlBackTexture() {
  const key = "bowlBack";
  if (placeholderCache.has(key)) return placeholderCache.get(key);
  const [c, ctx] = canvas2d(512, 460);
  // Außenkörper
  ctx.fillStyle = "#f0eadf";
  ctx.beginPath();
  ctx.ellipse(256, 200, 250, 220, 0, 0, Math.PI * 2);
  ctx.fill();
  // Schatten unten
  const body = ctx.createLinearGradient(0, 120, 0, 430);
  body.addColorStop(0, "rgba(255,255,255,0.4)");
  body.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, 512, 460);
  ctx.globalCompositeOperation = "source-over";
  // Rand
  ctx.strokeStyle = "#d8cdba";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(256, 150, 230, 92, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Innenraum
  ctx.fillStyle = "#e3d8c4";
  ctx.beginPath();
  ctx.ellipse(256, 158, 222, 86, 0, 0, Math.PI * 2);
  ctx.fill();
  const t = toTexture(c);
  placeholderCache.set(key, t);
  return t;
}

/* Platzhalter-Schüssel vorne (nahe Lippe als Sichel, sonst transparent). */
export function placeholderBowlFrontTexture() {
  const key = "bowlFront";
  if (placeholderCache.has(key)) return placeholderCache.get(key);
  const [c, ctx] = canvas2d(512, 460);
  // untere Hälfte des Rands als gefüllte Sichel
  ctx.fillStyle = "#ece2d0";
  ctx.beginPath();
  ctx.ellipse(256, 158, 230, 92, 0, 0, Math.PI, false); // untere Hälfte
  ctx.ellipse(256, 158, 222, 86, 0, Math.PI, 0, true); // inneres abziehen
  ctx.fill();
  ctx.strokeStyle = "#d8cdba";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(256, 158, 230, 92, 0, 0, Math.PI, false);
  ctx.stroke();
  const t = toTexture(c);
  placeholderCache.set(key, t);
  return t;
}

function loadTexture(src) {
  if (texPromiseCache.has(src)) return texPromiseCache.get(src);
  const p = new Promise((resolve, reject) => loader.load(src, resolve, undefined, reject));
  texPromiseCache.set(src, p);
  return p;
}

/* Setzt Farbraum/Anisotropie und gibt die Textur zurück. */
function tuneTexture(t) {
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* Hook: liefert die geladene Textur. Fallback-Leiter bei Fehler (gespiegelt zum
   DOM-Thumbnail): src -> fallbackSrc (z. B. Varianten-Asset -> Basis-Asset) ->
   Farb-Blob (Platzhalter). fallbackSrc ist optional (Satelliten/Basis-Assets). */
export function useTextureOrColor(src, color, fallbackSrc = null) {
  const [map, setMap] = useState(null);
  useEffect(() => {
    let alive = true;
    const setIfAlive = (t) => alive && setMap(t);
    const toColor = () => setIfAlive(placeholderIngredientTexture(color));

    // Versucht das Fallback-Asset, fällt sonst auf den Farb-Blob zurück.
    const tryFallback = () => {
      if (!fallbackSrc || failed.has(fallbackSrc)) return toColor();
      loadTexture(fallbackSrc)
        .then((t) => setIfAlive(tuneTexture(t)))
        .catch(() => {
          failed.add(fallbackSrc);
          toColor();
        });
    };

    if (!src || failed.has(src)) {
      tryFallback();
    } else {
      loadTexture(src)
        .then((t) => setIfAlive(tuneTexture(t)))
        .catch(() => {
          failed.add(src);
          tryFallback();
        });
    }
    return () => {
      alive = false;
    };
  }, [src, color, fallbackSrc]);
  return map;
}

/* Hook für die Schüssel-Ebenen (back/front) mit eigenem Platzhalter. */
export function useBowlTexture(src, kind) {
  const [map, setMap] = useState(null);
  useEffect(() => {
    let alive = true;
    const placeholder = () =>
      kind === "front" ? placeholderBowlFrontTexture() : placeholderBowlBackTexture();
    if (!src || failed.has(src)) {
      setMap(placeholder());
      return;
    }
    loadTexture(src)
      .then((t) => {
        if (!alive) return;
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        setMap(t);
      })
      .catch(() => {
        failed.add(src);
        if (alive) setMap(placeholder());
      });
    return () => {
      alive = false;
    };
  }, [src, kind]);
  return map;
}
