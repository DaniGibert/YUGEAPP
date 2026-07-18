import { useEffect, useRef, useSyncExternalStore } from 'react';
import { PREFERS_REDUCED_MOTION } from '../scene/reducedMotion';

// Generativer Dampf-Hintergrund (Canvas 2D, Processing-Stil) mit zwei
// schaltbaren Modi, beide ohne sichtbaren Anfang und Ende (reine Atmosphaere):
// 'nebel' = weiche Blob-Formen ueber die ganze Flaeche, die langsam in
// beliebige Richtung driften und atmen; 'fluss' = feine Linien, die einem
// Stroemungsfeld folgen und durchs Bild ziehen, wie Tinte in Wasser. Farbe aus
// den Tokens (line Richtung ink-400 gemischt), weichgezeichnet und leise.
// Wirkt wie lebendige Papier-Textur hinter dem Start-Screen; die Schuessel
// bleibt der Star.
//
// Alle Tuning-Werte hier benannt, damit nichts inline verstreut liegt.
// Die Geschmacks-Regler fuers Design-Lab leben direkt in STEAM_DEFAULTS
// (Keys = Konstantennamen im Snippet). MODE und WISP_COLOR sind Strings und
// duerfen nie durch Math.round laufen.
export const STEAM_DEFAULTS = {
  MODE: 'fluss',        // 'nebel' | 'fluss' (String, nie durch Math.round)
  BLEND: 'multiply',    // 'normal' | 'multiply' (String wie MODE, nie durch Math.round).
                        // multiply faerbt das Papier wie Tinte/Aquarell statt milchig
                        // darueber zu liegen: dieselbe Deckkraft wirkt dadurch deutlich
                        // sichtbarer und Farben bleiben satt.
  // geteilt (Bedeutung in beiden Modi identisch)
  COUNT: 19,            // Elemente gleichzeitig (Blobs bzw. Linien)
  ALPHA: 0.34,          // Deckkraft je Element
  SHADE_VAR: 0.15,      // 0..1, Anteil der Ton-Streuung ueber die Elemente. Manche
                        // Elemente dunkler als andere gibt Tiefe; mit multiply sind
                        // hellere Abstufungen unsichtbar, darum streut die Variation
                        // nur nach dunkler.
  SPEED: 1.55,          // dimensionsloser Tempo-Multiplikator auf alle Bewegung
  WISP_TONE: 0,         // Token-Mischung line -> ink-400; bei gesetzter WISP_COLOR
                        // wirkungslos, nur die Fallback-Mischung fuer den Token-Pfad
  WISP_COLOR: '#F2B33D', // Das Ei-Gold aus der Palette, im Design-Lab vom Menschen
                        // getunt (Tuning-DATUM im Geist der sceneColor-Werte in
                        // config/menu.js). Auf null setzen = zurueck zum Token-Pfad
                        // via WISP_TONE.
  CANVAS_OPACITY: 0.45, // CSS-Opacity-Deckel des Elements
  CANVAS_BLUR_PX: 33,   // CSS-Blur; bewusst stark weichgezeichnet, der weiche
                        // Look ist im Lab so gewaehlt
  // Nebel
  NEBEL_SCALE: 0.21,    // Blob-Radius als Anteil der internen Breite
  NEBEL_LIFE_S: 8,      // mittlere Atem-Dauer in Sekunden
  // Fluss
  FLUSS_ANGLE: 175,     // globale Vorzugsrichtung in Grad (0 = nach rechts)
  FLUSS_TURB: 0.25,     // Feld-Verwirbelung (Radiant-Amplitude der Sinus-Summe)
  FLUSS_LENGTH: 1.5,    // Linienlaenge als Anteil der Breite
  FLUSS_WIDTH: 0.009,   // Linienstaerke als Anteil der internen Breite
};

// Reine Code-Konstanten (Performance/Form/Kalibrierung, kein Geschmack).
const FPS_CAP = 30;             // langsamer Dampf braucht keine 60fps
const FADE_IN_MS = 1600;        // sanftes Einblenden nach Mount
const FADE_IN_DELAY_MS = 350;   // erst erscheinen wenn der Screen steht
const SEGMENTS = 36;            // Punkte pro Fluss-Linie
const BANDS = 9;                // Alpha-/Breiten-Stufen (4 Segmente je Band)
const HALO_WIDTH_MUL = 2.6;     // Schleier-Pass: Breiten-Faktor
const HALO_ALPHA_MUL = 0.35;    // Schleier-Pass: Alpha-Faktor
// Interne Aufloesung pro Modus: grosse weiche Blobs vertragen wenig Pixel,
// duenne Linien brauchen mehr, sonst saufen sie ab.
const NEBEL_RES_DIVISOR = 4;
const NEBEL_MAX_W = 280;
const FLUSS_RES_DIVISOR = 2;
const FLUSS_MAX_W = 560;
// Blobs ueberlappen flaechig; ohne Kalibrierfaktor waere der geteilte
// Alpha-Regler fuer Nebel sofort zu laut. Kalibrierung ist Physik, kein
// Geschmack, darum keine Lab-Konstante.
const NEBEL_ALPHA_SCALE = 0.35;
const NEBEL_DRIFT = 0.012;      // Drift-Tempo der Blobs (Breiten-Einheiten/s)
const FLUSS_ADVECT = 0.018;     // Reise-Tempo der Linien-Seeds (Breiten-Einheiten/s)
const LIFE_MIN_S = 12;          // Lebensdauer-Spanne der Fluss-Linien in Sekunden
const LIFE_MAX_S = 24;
const SHADES = 4;               // Abstufungen der Farb-Variation (Code, kein Geschmack)

// Modul-lokaler Override-Seitenkanal fuers Design-Lab: das Panel rendert den
// Backdrop nicht selbst (anders als das Scene-Lab, das anchorOverrides als Prop
// reicht), darum schiebt es seine Werte hier durch. NUR das Design-Lab schreibt
// hier; im Normalbetrieb bleibt labOverrides null und alles verhaelt sich exakt
// wie vorher.
let labOverrides = null;
const labListeners = new Set();
export function setSteamLabOverrides(next) {
  labOverrides = next && Object.keys(next).length ? next : null;
  labListeners.forEach((l) => l());
}

function subscribeLab(listener) {
  labListeners.add(listener);
  return () => labListeners.delete(listener);
}

function getLabSnapshot() {
  return labOverrides;
}

// #RRGGBB -> {r,g,b}. Kein Design-Wert, nur das Zerlegen des gelesenen Tokens.
function parseHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Token-abgeleitete Default-Farbe: line Richtung ink-400 gemischt. Lebt als
// Export, damit das Design-Lab dieselbe Mischung fuer das Farbfeld anzeigt.
// Fallback-Kette wie gehabt (line -> ink-400 -> ein bewusstes Literal); nur
// dieses eine Literal ist kein Token, der primaere Weg bleibt der Token-Pfad.
export function getSteamDefaultTonedColor(tone) {
  const rootStyle = getComputedStyle(document.documentElement);
  const lineToken = rootStyle.getPropertyValue('--color-line').trim();
  const inkToken = rootStyle.getPropertyValue('--color-ink-400').trim();
  const rgbLine = parseHex(lineToken) || parseHex(inkToken) || parseHex('#8B8078');
  const rgbInk = parseHex(inkToken) || rgbLine;
  const mixChannel = (a, c) => Math.round(a + (c - a) * tone);
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return (
    '#' +
    toHex(mixChannel(rgbLine.r, rgbInk.r)) +
    toHex(mixChannel(rgbLine.g, rgbInk.g)) +
    toHex(mixChannel(rgbLine.b, rgbInk.b))
  ).toUpperCase();
}

// Billiges Pseudo-Curl-Feld: drei Sinus-Terme aus x, y und langsamem t. Die
// t-Terme lassen das Feld atmen, damit die Linien nicht eingefroren wirken.
function flowAngle(x, y, t, bias, turb) {
  return bias + turb * (
      Math.sin(x * 4.1 + t * 0.18) * 0.55
    + Math.sin(y * 3.3 - t * 0.11) * 0.45
    + Math.sin(x * 1.9 + y * 2.6 + t * 0.07) * 0.35);
}

export default function SteamBackdrop({ className = '' }) {
  // Reduced Motion: Dampf ist Stimmung, keine Information (Muster von
  // SteamPuffs). Early-Return VOR allen Hooks, aber hook-sicher: der Wert ist
  // eine Konstante (kein Hook), die Hook-Reihenfolge bleibt also stabil.
  if (PREFERS_REDUCED_MOTION) return null;

  const canvasRef = useRef(null);
  // Merkt, ob das Einblenden schon gelaufen ist: Lab-Ticks bauen den Effekt neu
  // auf, das Canvas darf dabei nicht jedes Mal wieder auf 0 zurueckblitzen.
  const fadedRef = useRef(false);

  // Design-Lab-Overrides abonnieren; im Normalbetrieb bleibt der Snapshot null
  // und cfg ist referenzstabil STEAM_DEFAULTS (Effekt laeuft dann nur einmal).
  const overrides = useSyncExternalStore(subscribeLab, getLabSnapshot);
  const cfg = overrides ? { ...STEAM_DEFAULTS, ...overrides } : STEAM_DEFAULTS;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Modus-Guard: alles ausser 'nebel' faellt defensiv auf Fluss zurueck,
    // auch kaputte Strings aus altem localStorage.
    const isNebel = cfg.MODE === 'nebel';

    // Farbaufloesung: explizite Lab-Farbe gewinnt, sonst die Token-Mischung.
    const hex = cfg.WISP_COLOR || getSteamDefaultTonedColor(cfg.WISP_TONE);
    const rgb = parseHex(hex);
    if (!rgb) return; // Ohne verwertbare Farbe lieber gar nicht malen.
    const strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

    // Farb-Abstufungen vorberechnen: SHADE_VAR streut die Elemente nur nach
    // dunkler (hellere Stufen waeren unter multiply unsichtbar). Fertige
    // Style-Strings entstehen HIER, im Frame-Loop faellt nur noch eine billige
    // String-Zuweisung an (keine Allokation).
    const shadeRgbs = Array.from({ length: SHADES }, (_, i) => {
      const factor = 1 - cfg.SHADE_VAR * 0.5 * (i / (SHADES - 1));
      return {
        r: Math.round(rgb.r * factor),
        g: Math.round(rgb.g * factor),
        b: Math.round(rgb.b * factor),
      };
    });
    const strokeStyles = shadeRgbs.map((c) => `rgb(${c.r}, ${c.g}, ${c.b})`);

    const count = Math.max(1, Math.round(cfg.COUNT));

    // Nebel-Sprites: weiche radiale Blobs, je Farb-Abstufung eines, offscreen
    // gebaut (in resize, weil ihr Pixel-Radius an der internen Breite haengt).
    // Im Loop nur noch drawImage, keine Gradients.
    const sprites = Array.from({ length: SHADES }, () => document.createElement('canvas'));

    // Interne Aufloesung bewusst OHNE devicePixelRatio: das Bild ist durch Blur
    // und niedrige Deckkraft weich, scharfe Pixel kosten nur Fuellrate.
    let internalW = 1;
    let internalH = 1;
    // Seitenverhaeltnis fuer Breiten-normierte Koordinaten: x in [0,1],
    // y in [0, aspect]; so bleiben alle Schritte isotrop.
    let aspect = 1;

    function buildSprites() {
      // 1.3 = groesster scaleMul, damit die Sprites nie hochskaliert werden.
      const radius = Math.max(2, Math.round(cfg.NEBEL_SCALE * internalW * 1.3));
      const size = radius * 2;
      sprites.forEach((sprite, i) => {
        const c = shadeRgbs[i];
        sprite.width = size;
        sprite.height = size;
        const sctx = sprite.getContext('2d');
        sctx.clearRect(0, 0, size, size);
        const grad = sctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
        grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 1)`);
        grad.addColorStop(0.35, `rgba(${c.r}, ${c.g}, ${c.b}, 0.6)`);
        grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
        sctx.fillStyle = grad;
        sctx.fillRect(0, 0, size, size);
      });
    }

    function resize() {
      const cw = canvas.clientWidth || 1;
      const ch = canvas.clientHeight || 1;
      const divisor = isNebel ? NEBEL_RES_DIVISOR : FLUSS_RES_DIVISOR;
      const maxW = isNebel ? NEBEL_MAX_W : FLUSS_MAX_W;
      internalW = Math.max(1, Math.min(Math.round(cw / divisor), maxW));
      internalH = Math.max(1, Math.round(internalW * (ch / cw)));
      aspect = internalH / internalW;
      canvas.width = internalW;
      canvas.height = internalH;
      // Canvas-Gotcha: das Setzen von canvas.width resettet den KOMPLETTEN
      // Context-State. Stroke-Farbe und Linien-Enden muessen darum HIER nach
      // jedem Resize neu gesetzt werden, nicht einmalig nach getContext.
      ctx.strokeStyle = strokeStyle;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (isNebel) buildSprites();
    }

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // ---- Nebel: weiche Blobs, die frei ueber die Flaeche driften und atmen.
    // Komplett abgewanderte Blobs werden recycelt (siehe stepNebel): bei hohem
    // Tempo oder langer Atem-Dauer verbrauchen sie ihr Leben sonst unsichtbar
    // draussen und die Bild-Dichte laeuft leer.
    function respawnNebel(b, prewarm) {
      b.x = -0.1 + 1.2 * Math.random();
      b.y = -0.1 + (aspect + 0.2) * Math.random();
      b.dir = Math.random() * Math.PI * 2; // Drift in JEDE Richtung, kein Aufsteigen
      b.scaleMul = 0.7 + 0.6 * Math.random();
      b.maxAge = cfg.NEBEL_LIFE_S * (0.7 + 0.6 * Math.random());
      b.seed = Math.random() * 1000;
      b.shadeIdx = Math.floor(Math.random() * SHADES); // Farb-Abstufung fuer Tiefe
      // Vorwaermen: Alter zufaellig verteilen, damit der Screen nicht leer startet.
      b.age = prewarm ? Math.random() * b.maxAge : 0;
    }

    function stepNebel(dt, t) {
      const v = NEBEL_DRIFT * cfg.SPEED;
      for (const b of blobs) {
        b.age += dt;
        // Respawn NUR hier: die Atem-Huelle ist an beiden Lebens-Enden 0, der
        // Positionssprung ist darum unsichtbar (kein Pop, kein Teleport).
        if (b.age > b.maxAge) respawnNebel(b, false);
        b.dir += Math.sin(t * 0.06 + b.seed) * 0.15 * dt; // leichtes Kurven-Wandern
        b.x += Math.cos(b.dir) * v * dt;
        b.y += Math.sin(b.dir) * v * dt;
        // Offscreen-Recycling (ersetzt NICHT den age-Respawn oben, beide
        // bleiben): ist der Blob samt Radius komplett draussen, ist auch der
        // Respawn-Sprung garantiert unsichtbar. Ohne das Recycling verbraucht
        // ein abgewanderter Blob sein restliches Leben ausserhalb des Bilds
        // und die Dichte duennt bei hohem Tempo aus.
        const rNorm = cfg.NEBEL_SCALE * b.scaleMul * 1.1; // Aufbluehen eingerechnet
        if (
          b.x + rNorm < -0.02 || b.x - rNorm > 1.02 ||
          b.y + rNorm < -0.02 || b.y - rNorm > aspect + 0.02
        ) {
          respawnNebel(b, false);
          continue;
        }
        const env = Math.sin(Math.PI * (b.age / b.maxAge)); // Atem-Huelle: schmilzt rein/raus
        const r = cfg.NEBEL_SCALE * internalW * b.scaleMul * (0.9 + 0.2 * env); // leichtes Aufbluehen
        ctx.globalAlpha = env * cfg.ALPHA * NEBEL_ALPHA_SCALE;
        ctx.drawImage(sprites[b.shadeIdx], b.x * internalW - r, b.y * internalW - r, 2 * r, 2 * r);
      }
    }

    // ---- Fluss: feine Linien, die dem Stroemungsfeld folgen. Der Seed jeder
    // Linie advektiert MIT dem Feld, die Linien reisen also durchs Bild.
    // Teilweise sichtbare Linien clippt der Rasterizer billig; komplett
    // abgewanderte werden recycelt (siehe stepFluss), sonst verbrauchen sie
    // ihr Leben unsichtbar draussen und die Bild-Dichte laeuft bei hohem
    // Tempo leer.
    const SEG_PER_BAND = SEGMENTS / BANDS;

    // Seeding ueber die GANZE Flaeche inkl. Rand-Margin, kein fester Ursprung.
    function respawnFluss(f, prewarm) {
      f.sx = -0.1 + 1.2 * Math.random();
      f.sy = -0.1 + (aspect + 0.2) * Math.random();
      f.maxAge = LIFE_MIN_S + Math.random() * (LIFE_MAX_S - LIFE_MIN_S);
      f.shadeIdx = Math.floor(Math.random() * SHADES); // Farb-Abstufung fuer Tiefe
      f.age = prewarm ? Math.random() * f.maxAge : 0;
    }

    function stepFluss(dt, t) {
      const tf = t * cfg.SPEED;
      const bias = (cfg.FLUSS_ANGLE * Math.PI) / 180;
      const h = cfg.FLUSS_LENGTH / SEGMENTS; // Schrittlaenge in Breiten-Einheiten
      for (const f of filaments) {
        f.age += dt;
        // env ist an beiden Lebens-Enden 0: der Respawn-Sprung ist unsichtbar.
        if (f.age > f.maxAge) respawnFluss(f, false);
        const a0 = flowAngle(f.sx, f.sy, tf, bias, cfg.FLUSS_TURB);
        f.sx += Math.cos(a0) * FLUSS_ADVECT * cfg.SPEED * dt;
        f.sy += Math.sin(a0) * FLUSS_ADVECT * cfg.SPEED * dt;

        // Euler-Integration der Polyline entlang des Felds. BEIDE Achsen mal
        // internalW: der Schritt bleibt isotrop, Linien verzerren nicht.
        // Nebenbei min/max mitfuehren (vier lokale Zahlen, keine Allokation)
        // fuer das Offscreen-Recycling danach.
        let px = f.sx;
        let py = f.sy;
        let minX = px;
        let maxX = px;
        let minY = py;
        let maxY = py;
        for (let j = 0; j <= SEGMENTS; j++) {
          f.xs[j] = px * internalW;
          f.ys[j] = py * internalW;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
          const a = flowAngle(px, py, tf, bias, cfg.FLUSS_TURB);
          px += Math.cos(a) * h;
          py += Math.sin(a) * h;
        }

        // Offscreen-Recycling (ersetzt NICHT den age-Respawn oben, beide
        // bleiben): liegt die GANZE Polyline ausserhalb des Bilds plus Margin,
        // ist der Positionssprung garantiert unsichtbar. Ohne das Recycling
        // verbrauchen abgewanderte Linien ihr Leben draussen und die
        // Bild-Dichte laeuft bei hohem Tempo leer (Repro: SPEED > 2 mit
        // seitlicher Richtung). Naechster Frame zeichnet die neue Linie mit
        // env nahe 0, alles weich.
        if (maxX < -0.05 || minX > 1.05 || maxY < -0.05 || minY > aspect + 0.05) {
          respawnFluss(f, false);
          continue;
        }

        const env = Math.sin(Math.PI * (f.age / f.maxAge));

        // Abstufungs-Farbe des Filaments: billige String-Zuweisung, keine
        // Allokation. Der resize()-strokeStyle bleibt der Grundzustand.
        ctx.strokeStyle = strokeStyles[f.shadeIdx];

        // Band-Rendering: bewusst KEIN Gradient-Stroke (30fps-Objektmuell und
        // kann keine Breiten-Zunahme) und KEIN quadraticCurveTo (bei 36
        // Segmenten unter Blur unsichtbar teurer). Die Baender teilen ihre
        // Endpunkte; lineCap 'round' plus Blur macht die Naehte unsichtbar.
        // Alpha und Breite laufen SYMMETRISCH (Sinus-Bauch in der Mitte, beide
        // Enden duenn und blass), damit kein Ursprung ablesbar ist.
        for (let b = 0; b < BANDS; b++) {
          const j0 = b * SEG_PER_BAND;
          const uMid = (j0 + SEG_PER_BAND / 2) / SEGMENTS;
          const alpha = env * cfg.ALPHA * (0.55 + 0.45 * Math.sin(Math.PI * uMid));
          if (alpha < 0.004) continue;
          ctx.beginPath();
          ctx.moveTo(f.xs[j0], f.ys[j0]);
          for (let j = j0 + 1; j <= j0 + SEG_PER_BAND; j++) ctx.lineTo(f.xs[j], f.ys[j]);
          // Untergrenze schuetzt vor Sub-Pixel-Flackern.
          const w = Math.max(0.75, cfg.FLUSS_WIDTH * internalW * (0.75 + 0.5 * Math.sin(Math.PI * uMid)));
          ctx.globalAlpha = alpha * HALO_ALPHA_MUL; // Pass 1: breiter Schleier
          ctx.lineWidth = w * HALO_WIDTH_MUL;
          ctx.stroke();
          ctx.globalAlpha = alpha;                  // Pass 2: Kernlinie, gleicher Pfad
          ctx.lineWidth = w;
          ctx.stroke();
        }
      }
    }

    // Zustand des aktiven Modus: feste Allokation beim Effekt-Aufbau, danach
    // nur mutiert (die Float32Array-Puffer werden pro Frame wiederverwendet,
    // im Loop faellt keine Allokation an). Allokation NACH dem ersten resize,
    // weil die Respawns das echte aspect brauchen.
    const blobs = isNebel
      ? Array.from({ length: count }, () => {
          const b = { x: 0, y: 0, dir: 0, scaleMul: 1, age: 0, maxAge: 1, seed: 0, shadeIdx: 0 };
          respawnNebel(b, true);
          return b;
        })
      : null;
    const filaments = isNebel
      ? null
      : Array.from({ length: count }, () => {
          const f = {
            sx: 0,
            sy: 0,
            age: 0,
            maxAge: 1,
            shadeIdx: 0,
            xs: new Float32Array(SEGMENTS + 1),
            ys: new Float32Array(SEGMENTS + 1),
          };
          respawnFluss(f, true);
          return f;
        });
    const stepMode = isNebel ? stepNebel : stepFluss;

    // Loop-Disziplin: EIN RAF-Loop, der zwar durchlaeuft, aber nur bei
    // erreichtem FPS-Cap simuliert und zeichnet.
    const frameGap = 1000 / FPS_CAP - 1;
    let last = performance.now();
    let raf = 0;
    let running = true;

    function step(now) {
      if (!running) return;
      raf = requestAnimationFrame(step);
      if (now - last < frameGap) return;
      // dt geklemmt: nach Tab-Rueckkehr kein Riesensprung.
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      ctx.clearRect(0, 0, internalW, internalH);
      stepMode(dt, now / 1000);
      ctx.globalAlpha = 1;
    }

    function startLoop() {
      // Eventuell noch haengende Kette abraeumen: startet die App in einem
      // versteckten Tab, friert die geplante rAF-Kette ein und lebt beim
      // Sichtbarwerden wieder auf. Ohne das Cancel liefen dann dauerhaft zwei
      // Ketten parallel.
      cancelAnimationFrame(raf);
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(step);
    }

    function stopLoop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    // Bei verstecktem Tab anhalten (spart Strom auf dem Kiosk), bei Rueckkehr
    // die Zeitbasis zuruecksetzen, damit kein Sprung entsteht.
    function onVisibility() {
      if (document.hidden) {
        stopLoop();
      } else {
        startLoop();
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    startLoop();

    // Sanftes Einblenden: das Element startet transparent (inline opacity 0) und
    // faehrt erst hoch, wenn der Screen steht. Direkt am DOM-Element, kein State,
    // kein Re-Render. Ist das Einblenden schon gelaufen (Lab-Tick baut den Effekt
    // neu auf), wird die Deckkraft sofort gesetzt statt erneut zu faden.
    let fadeTimer = 0;
    if (fadedRef.current) {
      canvas.style.opacity = String(cfg.CANVAS_OPACITY);
    } else {
      fadeTimer = window.setTimeout(() => {
        fadedRef.current = true;
        canvas.style.opacity = String(cfg.CANVAS_OPACITY);
      }, FADE_IN_DELAY_MS);
    }

    // Cleanup: Sprachwechsel remountet den Screen. Ohne das haetten wir
    // verwaiste Loops und Listener.
    return () => {
      stopLoop();
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
      window.clearTimeout(fadeTimer);
    };
    // Snapshot in den Deps: ein Lab-Tick baut den Effekt komplett neu auf. Das
    // ist billig (eine Handvoll Elemente mit festen Puffern) und haelt den Code
    // einfach; die Elemente streuen dabei per prewarm neu, das ist ok.
  }, [overrides]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
      style={{
        opacity: fadedRef.current ? cfg.CANVAS_OPACITY : 0,
        filter: `blur(${cfg.CANVAS_BLUR_PX}px)`,
        // multiply toent das Papier wie Tinte statt milchig darueber zu liegen.
        mixBlendMode: cfg.BLEND === 'multiply' ? 'multiply' : 'normal',
        transition: `opacity ${FADE_IN_MS}ms ease-out`,
      }}
    />
  );
}
