/* =============================================================================
 * Brühe-Oberfläche: nutzt das Brühe-PNG (z.B. miso.png) als Textur und lässt es
 * mit einem Shader leicht wabern + beim Aufprall rippeln (uv-Verzerrung + Glanz).
 * Fehlt das PNG, fällt sie auf eine flache, halbtransparente Farb-Ellipse zurück.
 *
 * Zwei clock-getriebene Animationen leben hier (keine Timer, alles über
 * state.clock.elapsedTime in useFrame -> ein Unmount mitten drin kann nichts leaken):
 *  - fill():  die allererste Brühe "füllt sich von unten" — die Oberflächen-Plane
 *             startet tief und klein (Pegel am Schüsselboden) und steigt/wächst
 *             zur Endposition (Position/Scale des Meshs, plus Begleit-Ripples).
 *             Von BowlScene angestoßen (useImperativeHandle, neben ripple).
 *  - Crossfade: JEDER Brühen-Wechsel MIT Vorgänger blendet weich (uBlend 0->1
 *             zwischen prev- und cur-Ebene). Ohne Vorgänger = hart wie bisher.
 * Alle Tuning-Werte in config/sceneConfig.js.
 * ===========================================================================*/
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  BLEND_DURATION,
  BROTH_CY,
  BROTH_RX,
  BROTH_RY,
  FILL_DURATION,
  FILL_RIPPLE_STRENGTH,
  FILL_RIPPLES,
  FILL_RISE,
  FILL_START_SCALE,
  RO,
} from "../config/sceneConfig.js";
import { PREFERS_REDUCED_MOTION } from "./reducedMotion.js";

const MAXR = 6;
const loader = new THREE.TextureLoader();

// 1x1-Dummy, damit die sampler2D nie "null" sind (vermeidet WebGL-Warnungen).
const DUMMY = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
DUMMY.needsUpdate = true;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  #define MAXR ${MAXR}
  uniform vec3 uColor;
  uniform vec3 uColorPrev;
  uniform float uTime;
  uniform vec2 uHalf;
  uniform sampler2D uMap;
  uniform sampler2D uMapPrev;
  uniform float uHasMap;
  uniform float uHasMapPrev;
  uniform float uBlend;
  uniform vec4 uRipples[MAXR]; // xy = Zentrum, z = Startzeit, w = Stärke (0..1)
  varying vec2 vUv;

  // Eine Brühen-Ebene: PNG-Textur ODER prozeduraler Farb-Verlauf (Fallback).
  // Alpha statt discard, damit sich PNG<->Fallback-Mischfälle (uHasMap 0<->1) beim
  // Crossfade sauber ineinander blenden; das finale discard steht in main().
  vec4 layerCol(sampler2D map, float hasMap, vec3 col, vec2 uvDisp, float ring, float edge) {
    if (hasMap > 0.5) {
      vec4 t = texture2D(map, vUv + uvDisp);
      return vec4(t.rgb * (1.0 + ring * 0.25), t.a);
    }
    vec3 c = col * (0.92 + ring * 0.35);
    return vec4(c, 0.9 * edge);
  }

  void main() {
    vec2 e = (vUv - 0.5) * 2.0;
    vec2 p = e * uHalf;

    // Verzerrung + Glanz aus leichtem Wabern und Aufprall-Wellen
    vec2 disp = vec2(sin(p.y * 0.045 + uTime * 1.1), cos(p.x * 0.045 + uTime * 0.9)) * 1.0;
    float ring = 0.0;
    for (int i = 0; i < MAXR; i++) {
      float st = uRipples[i].z;
      if (st < 0.0) continue;
      float age = uTime - st;
      if (age < 0.0 || age > 2.2) continue;
      float str = uRipples[i].w; // per-Ripple-Stärke (Füll-Ripples gedämpft, Aufprall = 1)
      float d = length(p - uRipples[i].xy);
      float env = exp(-age * 1.8) * exp(-d * 0.012) * smoothstep(0.0, 0.18, age) * str;
      float w = sin(d * 0.18 - age * 7.0);
      ring += w * env;
      vec2 dir = d > 0.001 ? (p - uRipples[i].xy) / d : vec2(0.0);
      disp += dir * w * env * 7.0;
    }
    vec2 uvDisp = disp / (uHalf * 2.0);

    float er = length(e);
    float edge = smoothstep(1.0, 0.9, er);

    // cur = aktuelle Brühe, prv = ausblendende Vorgänger-Brühe; uBlend mischt sie.
    vec4 cur = layerCol(uMap, uHasMap, uColor, uvDisp, ring, edge);
    vec4 prv = layerCol(uMapPrev, uHasMapPrev, uColorPrev, uvDisp, ring, edge);
    vec4 c = mix(prv, cur, uBlend);

    if (c.a < 0.004) discard;
    gl_FragColor = c;
  }
`;

const Broth = forwardRef(function Broth({ broth, visible = true }, ref) {
  const color = broth?.color || "#e8ddc8";
  const src = broth?.src;

  const meshRef = useRef();
  const matRef = useRef();
  const timeRef = useRef(0);
  const idxRef = useRef(0);

  // Zustandsmaschine (Refs -> kein Re-Render, alles fließt über useFrame):
  //  curRef/prevRef  { color, tex } der aktuellen bzw. ausblendenden Brühen-Ebene
  //  blendStartRef   Startzeit des laufenden Crossfades (-1 = keiner)
  //  fillStartRef    Startzeit des laufenden Füllens (-1 = keiner)
  //  firedRipplesRef Index in FILL_RIPPLES (welche Begleit-Ripples schon feuerten)
  //  hadBrothRef     gab es vor diesem Effekt schon eine Brühe? (erste vs. Wechsel)
  //  loadTokenRef    Doppelwechsel-Guard: invalidiert veraltete Textur-Loads
  const curRef = useRef({ color: new THREE.Color(color), tex: null });
  const prevRef = useRef({ color: new THREE.Color(color), tex: null });
  const blendStartRef = useRef(-1);
  const fillStartRef = useRef(-1);
  const firedRipplesRef = useRef(FILL_RIPPLES.length);
  const hadBrothRef = useRef(false);
  const loadTokenRef = useRef(0);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uColorPrev: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uHalf: { value: new THREE.Vector2(BROTH_RX, BROTH_RY) },
      uMap: { value: DUMMY },
      uMapPrev: { value: DUMMY },
      uHasMap: { value: 0 },
      uHasMapPrev: { value: 0 },
      uBlend: { value: 1 },
      uRipples: { value: Array.from({ length: MAXR }, () => new THREE.Vector4(0, 0, -1, 1)) },
    }),
    []
  );

  // Ripple ins nächste freie Slot legen (gemeinsam für die öffentliche ripple()-API
  // und die internen Füll-/Wechsel-Ripples). timeRef ist die Szenen-Uhr.
  const fireRipple = (worldX, worldY, strength = 1) => {
    const slot = uniforms.uRipples.value[idxRef.current % MAXR];
    slot.set(worldX, worldY - BROTH_CY, timeRef.current, strength);
    idxRef.current += 1;
  };

  // Brühen-Wechsel/-Erstwahl: neue Textur laden, ERST bei Erfolg umschalten.
  useEffect(() => {
    const token = ++loadTokenRef.current; // ältere, noch laufende Loads sind ab hier stale
    const targetColor = new THREE.Color(color);
    const hadBroth = hadBrothRef.current;

    const commit = (tex) => {
      if (token !== loadTokenRef.current) return; // veralteter Load (schneller Doppelwechsel)
      // "Erste Brühe" (kein Vorgänger) ODER Entfernen (kein src) -> hart setzen, kein Blend.
      const first = !hadBroth || !src;
      if (first) {
        curRef.current = { color: targetColor, tex };
        prevRef.current = { color: targetColor.clone(), tex };
        blendStartRef.current = -1;
        if (matRef.current) matRef.current.uniforms.uBlend.value = 1;
      } else {
        // Wechsel: prevRef := aktueller cur (bei laufendem Blend dessen Ziel; der
        // damit verworfene Zwischenstand ist ein kleiner Sprung <= Rest von
        // BLEND_DURATION, bewusst in Kauf genommen). uBlend startet neu bei 0.
        prevRef.current = curRef.current;
        curRef.current = { color: targetColor, tex };
        if (PREFERS_REDUCED_MOTION || BLEND_DURATION <= 0) {
          blendStartRef.current = -1;
          if (matRef.current) matRef.current.uniforms.uBlend.value = 1;
        } else {
          blendStartRef.current = timeRef.current;
          if (matRef.current) matRef.current.uniforms.uBlend.value = 0;
          fireRipple(0, 0); // Mittel-Ripple begleitet den Wechsel
        }
      }
      hadBrothRef.current = !!src;
    };

    if (!src) {
      commit(null); // keine Brühe -> Farb-only, Brühe gilt als "weg"
      return;
    }
    loader.load(
      src,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        commit(t);
      },
      undefined,
      // Ladefehler -> Farb-only-Blend (tex null), Platzhalter-Regel erfüllt.
      () => commit(null)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, color]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    timeRef.current = t;
    const m = matRef.current;
    if (!m) return;
    const u = m.uniforms;
    u.uTime.value = t;

    // cur/prev-Refs in die Uniforms schreiben (die color-Prop wird NICHT mehr direkt gelesen).
    const cur = curRef.current;
    const prev = prevRef.current;
    u.uColor.value.copy(cur.color);
    u.uMap.value = cur.tex || DUMMY;
    u.uHasMap.value = cur.tex ? 1 : 0;
    u.uColorPrev.value.copy(prev.color);
    u.uMapPrev.value = prev.tex || DUMMY;
    u.uHasMapPrev.value = prev.tex ? 1 : 0;

    // Crossfade-Fortschritt (smoothstep).
    if (blendStartRef.current >= 0) {
      const bt = Math.min(1, Math.max(0, (t - blendStartRef.current) / BLEND_DURATION));
      u.uBlend.value = THREE.MathUtils.smoothstep(bt, 0, 1);
      if (bt >= 1) blendStartRef.current = -1;
    }

    // Füllen "von unten": Fortschritt p (easeOutCubic) hebt die Oberflächen-Plane
    // von (BROTH_CY - FILL_RISE) auf BROTH_CY und lässt sie von FILL_START_SCALE
    // auf 1 wachsen (tiefer Pegel = kleinere sichtbare Ellipse, Diorama-Perspektive).
    // Begleit-Ripples feuern clock-basiert; ihre Koordinaten sind plane-lokal und
    // wandern beim Steigen/Wachsen mit der Oberfläche mit.
    if (fillStartRef.current >= 0 && meshRef.current) {
      const ft = Math.min(1, Math.max(0, (t - fillStartRef.current) / FILL_DURATION));
      const p = 1 - Math.pow(1 - ft, 3); // easeOutCubic
      meshRef.current.position.y = BROTH_CY - (1 - p) * FILL_RISE;
      const s = FILL_START_SCALE + (1 - FILL_START_SCALE) * p;
      meshRef.current.scale.set(s, s, 1);
      while (
        firedRipplesRef.current < FILL_RIPPLES.length &&
        ft >= FILL_RIPPLES[firedRipplesRef.current].at
      ) {
        const r = FILL_RIPPLES[firedRipplesRef.current];
        fireRipple(r.x, r.y, FILL_RIPPLE_STRENGTH); // dezenter als Aufprall-Ripples
        firedRipplesRef.current += 1;
      }
      if (ft >= 1) {
        // Endlage exakt herstellen (außerhalb des Fills: BROTH_CY, Skala 1).
        meshRef.current.position.y = BROTH_CY;
        meshRef.current.scale.set(1, 1, 1);
        fillStartRef.current = -1;
      }
    }
  });

  useImperativeHandle(ref, () => ({
    ripple(worldX, worldY) {
      fireRipple(worldX, worldY);
    },
    // Füllen der ersten Brühe (Pegel steigt von unten). Randfall: wird fill() vor
    // dem ersten Textur-Load gerufen, steigt zunächst der prozedurale Verlauf und
    // das PNG pluggt beim Laden ein (Platzhalter-Regel). reduced-motion -> instant.
    fill() {
      const mesh = meshRef.current;
      if (PREFERS_REDUCED_MOTION) {
        fillStartRef.current = -1;
        firedRipplesRef.current = FILL_RIPPLES.length;
        if (mesh) {
          mesh.position.y = BROTH_CY;
          mesh.scale.set(1, 1, 1);
        }
        return;
      }
      fillStartRef.current = timeRef.current;
      firedRipplesRef.current = 0;
      // Startlage sofort setzen (tief + klein), damit kein voller Frame aufblitzt.
      if (mesh) {
        mesh.position.y = BROTH_CY - FILL_RISE;
        mesh.scale.set(FILL_START_SCALE, FILL_START_SCALE, 1);
      }
    },
  }));

  return (
    <mesh ref={meshRef} position={[0, BROTH_CY, 0]} renderOrder={RO.broth} visible={visible}>
      <planeGeometry args={[BROTH_RX * 2, BROTH_RY * 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
});

export default Broth;
