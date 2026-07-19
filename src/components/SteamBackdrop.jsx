import { useEffect, useRef, useSyncExternalStore } from 'react';
import { PREFERS_REDUCED_MOTION } from '../scene/reducedMotion';

// Gekaemmte Tinten-Marmorierung (Ebru/Suminagashi) als generativer Hintergrund
// des Start-Screens (Canvas 2D): wenige goldene Tintenbaender, die wie in
// leicht bewegtem Wasser horizontal durchs Papier ziehen. Die Baender sind
// dauerhaft (kein Spawn, kein Tod): das Muster scrollt ueber Phasen-Terme,
// nie ueber Positions-Spruenge, darum hat nichts einen Ursprung und nichts
// blinkt. Viel leeres Papier zwischen den Baendern ist Absicht.
//
// Fuehl-Kriterien (Definition von fertig): 4 bis 5 ruhige Baender, viel leeres
// Papier, die Raender wabern sehr langsam (sichtbare Bewegung dauert
// Sekunden), kaum merkliche Drift, kein Ursprung, nichts blinkt. Beim
// Wegschauen Atmosphaere, beim Hinschauen Tinte, die im Papier lebt.
//
// Die Geschmacks-Regler fuers Design-Lab leben in STEAM_DEFAULTS (Keys =
// Konstantennamen im Snippet). BLEND und WISP_COLOR sind Strings und duerfen
// nie durch Math.round laufen.
export const STEAM_DEFAULTS = {
  BLEND: 'multiply',    // 'normal' | 'multiply'; multiply faerbt das Papier wie
                        // Tinte statt milchig darueber zu liegen
  BAND_COUNT: 5,        // Tintenbaender; viel leeres Papier dazwischen ist Absicht
  ALPHA: 0.16,          // Fuell-Alpha je Band; bewusst sehr leise, die Baender
                        // sollen Papier toenen und nicht als Flaeche auftreten
  SPEED: 1.2,           // globaler Zeit-Faktor (Drift + Atmen)
  DRIFT: -2,            // -2..2, Vorzeichen = Richtung der Muster-Wanderung.
                        // Bewusste Vereinfachung: kein echter Winkel, die Drift
                        // ist die Phasen-Wanderung der Kanten-Wellen; ein
                        // Kipp-Winkel wuerde die Baender nur verzerren.
  WAVELENGTH: 1.55,     // Grundwellenlaenge der Kanten, Anteil der Breite; lang,
                        // damit die Baender ruhig schwingen statt zu zappeln
  BAND_THICK: 0.03,     // Grunddicke eines Bands, Anteil der Breite
  SWIRL: 0.03,          // Kanten-Auslenkung, Anteil der Breite
  SHADE_VAR: 0,         // 0..1, Ton-Streuung ueber die Baender (nur nach dunkler,
                        // hellere Stufen waeren unter multiply unsichtbar).
                        // Default 0: eine einheitliche Tinte wirkt ruhiger.
  WISP_TONE: 0,         // Token-Mischung line -> ink-400; bei gesetzter WISP_COLOR
                        // wirkungslos, nur die Fallback-Mischung fuer den Token-Pfad
  WISP_COLOR: '#F2B33D', // Das Ei-Gold aus der Palette, im Design-Lab vom Menschen
                        // getunt (Tuning-DATUM im Geist der sceneColor-Werte in
                        // config/menu.js). Auf null setzen = zurueck zum Token-Pfad
                        // via WISP_TONE.
  CANVAS_OPACITY: 0.5,  // CSS-Opacity-Deckel des Elements
  CANVAS_BLUR_PX: 4,    // nur ein Hauch; die halbe interne Aufloesung zeichnet
                        // schon weich, die Tuschekanten sollen lesbar bleiben
};

// Reine Code-Konstanten (Performance/Form/Kalibrierung, kein Geschmack).
const FPS_CAP = 30;             // langsame Marmorierung braucht keine 60fps
const FADE_IN_MS = 1600;        // sanftes Einblenden nach Mount
const FADE_IN_DELAY_MS = 350;   // erst erscheinen wenn der Screen steht
// Interne Aufloesung bewusst OHNE devicePixelRatio: das Bild ist durch Blur
// und niedrige Deckkraft weich, scharfe Pixel kosten nur Fuellrate.
const RES_DIVISOR = 2;
const MAX_INTERNAL_WIDTH = 640;
const SHADES = 4;               // Abstufungen der Farb-Variation
const SAMPLES = 48;             // Stuetzstellen je Bandkante ueber die Breite
const OVERSCAN = 0.05;          // Kanten beginnen/enden ausserhalb des Bilds
const DRIFT_RATE = 0.05;        // Grundtempo der Phasen-Wanderung (langsam!)
const BREATHE_AMP = 0.012;      // sehr langsames vertikales Atmen der Band-Mitten
const BREATHE_RATE = 0.05;
// Parallaxe: ein Teil der Baender liegt "hinten" (dicker, blasser, langsamer,
// staerker ausgelenkt). Eine staerkere Weichzeichnung je Ebene geht auf einem
// Canvas nicht; Breite und Alpha uebernehmen die Tiefenwirkung.
const LAYER_BACK = { thkMul: 2.5, speedMul: 0.5, alphaMul: 0.5, ampMul: 1.3 };
const LAYER_BACK_SHARE = 0.4;   // Anteil der Baender auf der hinteren Ebene
// Malerische Tiefe ohne Gradient (bewusste Abweichung von der Design-Spec:
// ein Linear-Gradient je Band waere Objektmuell im 30fps-Loop): ein zweiter
// Fuell-Pass als Innen-Ribbon in hellerer Stufe hellt die Bandmitte auf und
// liest sich als Dimensionalitaet.
const INNER_RATIO = 0.55;       // Dicke des Innen-Ribbons relativ zum Band
const INNER_ALPHA_MUL = 0.5;    // Alpha des Innen-Ribbons relativ zum Fuell-Alpha
const LIGHTEN = 0.25;           // Aufhellung der Innen-Stufen (Kanal Richtung 255)
// Tuschelinie entlang der Oberkante: gibt Ebru den Biss.
const EDGE_LINE_W = 0.0015;     // Strichstaerke als Anteil der internen Breite
const EDGE_ALPHA_MUL = 1.4;     // relativ zum Fuell-Alpha
const EDGE_ALPHA_MAX = 0.5;     // Deckel, damit die Linie nie hart wird

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

// ============================================================================
// Marmorierungs-Mathematik auf Modulebene: die LIVE-Animation und der
// PNG-Export fuer Folien teilen sich exakt diese Funktionen. Sonst driften
// App und Praesentation auseinander (Projektregel: eine Quelle).
// ============================================================================

// Fertige Style-Strings je Abstufung (nur nach dunkler, hellere Stufen waeren
// unter multiply unsichtbar) plus je eine aufgehellte Variante fuers
// Innen-Ribbon. Entstehen einmal vorab, im Frame-Loop fallen damit nur noch
// String-Zuweisungen an.
function buildShadeStyles(rgb, shadeVar) {
  const shadeStyles = [];
  const lightStyles = [];
  for (let i = 0; i < SHADES; i++) {
    const factor = 1 - shadeVar * 0.5 * (i / (SHADES - 1));
    const r = Math.round(rgb.r * factor);
    const g = Math.round(rgb.g * factor);
    const b = Math.round(rgb.b * factor);
    shadeStyles.push(`rgb(${r}, ${g}, ${b})`);
    const lighten = (c) => Math.round(c + (255 - c) * LIGHTEN);
    lightStyles.push(`rgb(${lighten(r)}, ${lighten(g)}, ${lighten(b)})`);
  }
  return { shadeStyles, lightStyles };
}

// Stuetzstellen-X in Pixeln (inkl. Overscan), fuellt einen vorhandenen Puffer.
function fillSampleX(xPx, internalW) {
  for (let s = 0; s <= SAMPLES; s++) {
    xPx[s] = (-OVERSCAN + ((1 + 2 * OVERSCAN) * s) / SAMPLES) * internalW;
  }
}

// Baender: dauerhaft und fest alloziert, danach nur mutiert (die
// Float32Array-Puffer werden pro Frame ueberschrieben, im Loop faellt keine
// Allokation an). Vertikale Slots mit stabilem Jitter verteilen die Mitten mit
// grossen Luecken ueber die Hoehe. Die hintere Ebene wird gleichmaessig ueber
// die Slots verteilt (nicht nur die obersten), dann einmalig sortiert: die
// Zeichen-Schleife laeuft damit automatisch hinten -> vorn.
// rng ist injizierbar, damit ein Aufrufer reproduzierbare Bilder erzeugen
// kann; der Default bleibt Math.random.
function createBands(count, aspect, rng = Math.random) {
  return Array.from({ length: count }, (_, i) => {
    const back =
      Math.round((i + 1) * LAYER_BACK_SHARE) > Math.round(i * LAYER_BACK_SHARE);
    const layer = back ? LAYER_BACK : null;
    return {
      back,
      // Slot-Mitte plus stabiler Jitter, in Breiten-Einheiten (y bis aspect).
      // Ein spaeterer Resize verschiebt die Slots bewusst nicht (das Muster
      // bleibt ruhig).
      yBase: (aspect * (i + 0.5 + (rng() * 2 - 1) * 0.3)) / count,
      // Alle Phasen einmal gewuerfelt und dann stabil: keine Spruenge,
      // kein Ursprung, nichts blinkt.
      ph1: rng() * Math.PI * 2,
      ph2: rng() * Math.PI * 2,
      ph3: rng() * Math.PI * 2,
      phT: rng() * Math.PI * 2,
      phB: rng() * Math.PI * 2,
      // Leichte Streuung je Band, damit kein Band dem anderen gleicht.
      ampMul: (layer ? layer.ampMul : 1) * (0.85 + rng() * 0.3),
      thkMul: (layer ? layer.thkMul : 1) * (0.85 + rng() * 0.3),
      shadeIdx: Math.floor(rng() * SHADES),
      // Zwischenwerte je Stuetzstelle (Pixel), pro Frame ueberschrieben:
      // Mittellinie und halbe Dicke. Daraus bauen sich Aussen- UND
      // Innen-Ribbon, es braucht keine vier Kanten-Puffer.
      yCs: new Float32Array(SAMPLES + 1),
      halfs: new Float32Array(SAMPLES + 1),
    };
  }).sort((a, b) => (b.back ? 1 : 0) - (a.back ? 1 : 0));
}

// Geschlossenen Ribbon-Pfad aus Mittellinie +- halber Dicke bauen:
// Oberkante links -> rechts, Unterkante rechts -> links, closePath.
function traceRibbon(ctx, band, xPx, thicknessMul) {
  ctx.beginPath();
  ctx.moveTo(xPx[0], band.yCs[0] - band.halfs[0] * thicknessMul);
  for (let s = 1; s <= SAMPLES; s++) {
    ctx.lineTo(xPx[s], band.yCs[s] - band.halfs[s] * thicknessMul);
  }
  for (let s = SAMPLES; s >= 0; s--) {
    ctx.lineTo(xPx[s], band.yCs[s] + band.halfs[s] * thicknessMul);
  }
  ctx.closePath();
}

// EIN Frame zeichnen. Das Leeren der Flaeche macht bewusst der Aufrufer (die
// Live-Animation loescht, der Export malt auf ein frisches Canvas).
function drawMarbling(ctx, { bands, cfg, internalW, t, xPx, shadeStyles, lightStyles }) {
  // Kanten-Wellenzahlen aus der Wellenlaenge, leicht verstimmt statt exakt
  // harmonisch: zusammen mit den irrationalen Zeit-Faktoren (1 / 2.1 / 4.3)
  // entsteht keine sichtbar wiederkehrende Periode.
  const kx1 = (2 * Math.PI) / cfg.WAVELENGTH;
  const kx2 = kx1 * 1.9;
  const kx3 = kx1 * 3.7;
  const ktx = kx1 * 0.8;
  // DRIFT steuert Vorzeichen und Tempo der Phasen-Wanderung: das Muster
  // scrollt seitlich, ohne dass sich irgendein Objekt bewegt.
  const driftBase = t * cfg.SPEED * DRIFT_RATE * cfg.DRIFT;

  for (const band of bands) {
    const drift = driftBase * (band.back ? LAYER_BACK.speedMul : 1);
    // Sehr langsames vertikales Atmen der Band-Mitte; die Amplitude ist so
    // klein, dass es nie als Bewegung, nur als Leben liest.
    const yCenter =
      band.yBase + BREATHE_AMP * Math.sin(t * BREATHE_RATE * cfg.SPEED + band.phB);

    for (let s = 0; s <= SAMPLES; s++) {
      const x = -OVERSCAN + ((1 + 2 * OVERSCAN) * s) / SAMPLES;
      // Mittellinie: drei Sinus-Oktaven (Amplituden 1 / 0.5 / 0.25,
      // normiert), Phasen wandern ueber drift.
      const yC =
        yCenter +
        cfg.SWIRL *
          band.ampMul *
          (Math.sin((x * kx1 + drift) * 1.0 + band.ph1) * (1 / 1.75) +
            Math.sin((x * kx2 + drift) * 2.1 + band.ph2) * (0.5 / 1.75) +
            Math.sin((x * kx3 + drift) * 4.3 + band.ph3) * (0.25 / 1.75));
      // Dicke schwillt an und ab wie ein Pinselzug.
      const half =
        0.5 *
        cfg.BAND_THICK *
        band.thkMul *
        (1 + 0.3 * Math.sin(x * ktx + drift * 0.5 + band.phT));
      band.yCs[s] = yC * internalW;
      band.halfs[s] = half * internalW;
    }

    const fillAlpha = cfg.ALPHA * (band.back ? LAYER_BACK.alphaMul : 1);

    // Pass 1: Aussenband in der Band-Abstufung.
    ctx.fillStyle = shadeStyles[band.shadeIdx];
    ctx.globalAlpha = fillAlpha;
    traceRibbon(ctx, band, xPx, 1);
    ctx.fill();

    // Pass 2: Innen-Ribbon in hellerer Stufe -> hellere Bandmitte, liest
    // sich als malerische Tiefe (siehe INNER_*-Konstanten).
    ctx.fillStyle = lightStyles[band.shadeIdx];
    ctx.globalAlpha = fillAlpha * INNER_ALPHA_MUL;
    traceRibbon(ctx, band, xPx, INNER_RATIO);
    ctx.fill();

    // Pass 3: Tuschelinie entlang der Oberkante, eine Stufe dunkler im
    // Shade-System (bei der dunkelsten Stufe gibt das erhoehte Alpha den
    // Biss).
    ctx.strokeStyle = shadeStyles[Math.min(band.shadeIdx + 1, SHADES - 1)];
    ctx.globalAlpha = Math.min(fillAlpha * EDGE_ALPHA_MUL, EDGE_ALPHA_MAX);
    ctx.lineWidth = Math.max(0.75, internalW * EDGE_LINE_W);
    ctx.beginPath();
    ctx.moveTo(xPx[0], band.yCs[0] - band.halfs[0]);
    for (let s = 1; s <= SAMPLES; s++) {
      ctx.lineTo(xPx[s], band.yCs[s] - band.halfs[s]);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Hochaufloesendes Standbild als PNG-DataURL, fuer Praesentations-Folien.
// Stellt die App-Optik nach: transparente Baender -> Weichzeichner -> ueber
// dem Papier multipliziert. Jeder Aufruf wuerfelt frische Phasen, liefert also
// eine andere Variante desselben Looks.
export function renderMarblingPNG(cfg, { width, height, paperHex }) {
  const hex = cfg.WISP_COLOR || getSteamDefaultTonedColor(cfg.WISP_TONE);
  const rgb = parseHex(hex);
  if (!rgb) return null; // Ohne verwertbare Farbe lieber gar nichts liefern.
  const { shadeStyles, lightStyles } = buildShadeStyles(rgb, cfg.SHADE_VAR);

  // Schritt 1: Baender auf ein transparentes Offscreen-Canvas in voller
  // Zielaufloesung. t = 0, die Variation kommt aus den frischen Phasen.
  const ink = document.createElement('canvas');
  ink.width = width;
  ink.height = height;
  const inkCtx = ink.getContext('2d');
  inkCtx.lineCap = 'round';
  inkCtx.lineJoin = 'round';
  const xPx = new Float32Array(SAMPLES + 1);
  fillSampleX(xPx, width);
  const bands = createBands(Math.max(1, Math.round(cfg.BAND_COUNT)), height / width);
  drawMarbling(inkCtx, {
    bands,
    cfg,
    internalW: width,
    t: 0,
    xPx,
    shadeStyles,
    lightStyles,
  });

  // Schritt 2: Papier als Grund. Die Papierfarbe kommt vom Aufrufer (Token
  // --color-bg), damit der Export Paletten-Overrides folgt.
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  ctx.fillStyle = paperHex || '#FFFFFF'; // nur Notnagel, normal kommt der Token
  ctx.fillRect(0, 0, width, height);

  // Schritt 3: Tinte weichgezeichnet darueber. Der Lab-Blur gilt fuer eine
  // typische Tablet-Breite, fuer grosse Exporte muss der Weichzeichner
  // proportional mitwachsen, sonst wirkt das Bild hart.
  const blurPx = cfg.CANVAS_BLUR_PX * (width / 1280);
  ctx.filter = `blur(${blurPx}px)`;
  if (cfg.BLEND === 'multiply') ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = cfg.CANVAS_OPACITY;
  ctx.drawImage(ink, 0, 0);
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  return out.toDataURL('image/png');
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

    // Farbaufloesung: explizite Lab-Farbe gewinnt, sonst die Token-Mischung.
    const hex = cfg.WISP_COLOR || getSteamDefaultTonedColor(cfg.WISP_TONE);
    const rgb = parseHex(hex);
    if (!rgb) return; // Ohne verwertbare Farbe lieber gar nicht malen.

    // Farb-Abstufungen einmal vorab (geteilte Modul-Funktion, siehe oben).
    const { shadeStyles, lightStyles } = buildShadeStyles(rgb, cfg.SHADE_VAR);

    let internalW = 1;
    let internalH = 1;
    // Seitenverhaeltnis fuer Breiten-normierte Koordinaten: x in [0,1],
    // y in [0, aspect]; so bleibt alles aufloesungsunabhaengig.
    let aspect = 1;

    // Stuetzstellen-X in Pixeln, einmal alloziert, bei Resize neu gefuellt.
    const xPx = new Float32Array(SAMPLES + 1);

    function resize() {
      const cw = canvas.clientWidth || 1;
      const ch = canvas.clientHeight || 1;
      internalW = Math.max(1, Math.min(Math.round(cw / RES_DIVISOR), MAX_INTERNAL_WIDTH));
      internalH = Math.max(1, Math.round(internalW * (ch / cw)));
      aspect = internalH / internalW;
      canvas.width = internalW;
      canvas.height = internalH;
      // Canvas-Gotcha: das Setzen von canvas.width resettet den KOMPLETTEN
      // Context-State. Linien-Enden darum HIER nach jedem Resize setzen, nicht
      // einmalig nach getContext (die Farben setzt der Frame je Band selbst).
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      fillSampleX(xPx, internalW);
    }

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // Baender einmal aufbauen (geteilte Modul-Funktion): aspect ist nach dem
    // ersten resize() gueltig.
    const bands = createBands(Math.max(1, Math.round(cfg.BAND_COUNT)), aspect);

    function renderFrame(t) {
      ctx.clearRect(0, 0, internalW, internalH);
      drawMarbling(ctx, { bands, cfg, internalW, t, xPx, shadeStyles, lightStyles });
    }

    // Loop-Disziplin: EIN RAF-Loop, der zwar durchlaeuft, aber nur bei
    // erreichtem FPS-Cap zeichnet. dt wird geklemmt zur Zeitbasis akkumuliert,
    // damit eine Tab-Rueckkehr keinen Sprung ins Muster reisst.
    const frameGap = 1000 / FPS_CAP - 1;
    let last = performance.now();
    let simT = 0;
    let raf = 0;
    let running = true;

    function step(now) {
      if (!running) return;
      raf = requestAnimationFrame(step);
      if (now - last < frameGap) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      simT += dt;
      renderFrame(simT);
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
    // ist billig (eine Handvoll Baender mit festen Puffern) und haelt den Code
    // einfach; die Baender wuerfeln ihre stabilen Phasen dabei neu, das ist ok.
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
