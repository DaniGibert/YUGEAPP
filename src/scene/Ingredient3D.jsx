/* =============================================================================
 * Eine Zutat als texturierte Fläche (Billboard).
 *  - Fall von oben (Feder) -> Aufprall (onImpact: Ripple) -> Squash -> sanftes Floaten.
 *  - "Wasserlinie"-Shader: Alles unterhalb der Brühen-Oberfläche (Welt-y < uWaterY)
 *    wird weich zur Brühenfarbe getönt & leicht ausgeblendet -> die Zutat sieht aus,
 *    als steckte sie in der Suppe. Das Eintauchen passiert beim Fallen automatisch.
 *  - Surface-Zutaten werfen zusätzlich einen weichen Kontaktschatten auf die Brühe.
 * ===========================================================================*/
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useSpring, animated } from "@react-spring/three";
import * as THREE from "three";
import { useTextureOrColor } from "./sceneTextures.js";
import {
  DROP_FROM,
  LAYER_RO,
  PLOP_DROP,
  RO,
  SINK_DEPTH,
  SINK_FADE_TAIL,
  SUBMERGE_FADE,
  SUBMERGE_TINT,
  WATER_BAND,
} from "../config/sceneConfig.js";

// 1x1-Dummy, damit der sampler2D nie "null" ist.
const DUMMY = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
DUMMY.needsUpdate = true;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vWorldY;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldY = wp.y;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uWaterY;
  uniform float uBand;
  uniform vec3 uBrothColor;
  uniform float uTint;
  uniform float uFade;
  varying vec2 vUv;
  varying float vWorldY;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    // sub = 1 unter Wasser, 0 darüber (weicher Übergang)
    float sub = 1.0 - smoothstep(uWaterY - uBand, uWaterY + uBand, vWorldY);
    vec3 col = mix(t.rgb, uBrothColor, sub * uTint);
    float a = t.a * (1.0 - sub * uFade) * uOpacity;
    gl_FragColor = vec4(col, a);
  }
`;

export default function Ingredient3D({ item, exitT, onImpact, waterY = -9999, brothColor }) {
  const { option, x, y, scale, frontness, layer, float = 1, rot = 0, stretch = 1 } = item;
  const map = useTextureOrColor(option.src, option.color, option.fallbackSrc);
  const rotZ = (rot * Math.PI) / 180; // Grad -> Rad (Drehung in der Bildebene)

  // Steckt die Zutat in einer Brühe? Steuert, ob "Entfernen" versinkt (in Brühe)
  // oder als Fallback schrumpft + ausblendet (leere Schüssel).
  const inBroth = waterY > -9000;

  // option.size = Breite in Welt-px; Höhe folgt dem Seitenverhältnis des PNG.
  const w = option.size ?? 80;
  const ratio = map && map.image && map.image.width ? map.image.height / map.image.width : 1;
  const h = w * ratio * stretch; // stretch = Höhen-Streckung (zweite Achse, 1 = unverändert)

  const innerRef = useRef();
  const matRef = useRef();
  const landedRef = useRef(false);
  const phase = useRef(Math.random() * Math.PI * 2);
  const prevExitRef = useRef(1); // Flanken-Erkennung für den einmaligen Versink-Ripple

  const uniforms = useMemo(
    () => ({
      uMap: { value: DUMMY },
      uOpacity: { value: 0 },
      uWaterY: { value: -9999 },
      uBand: { value: WATER_BAND },
      uBrothColor: { value: new THREE.Color("#8a5a3b") },
      uTint: { value: SUBMERGE_TINT },
      uFade: { value: SUBMERGE_FADE },
    }),
    []
  );

  // Unterdämpfte Feder: die Zutat fällt minimal UNTER die Zielhöhe und federt in EINER
  // Bewegung wieder hoch = natürlicher Bounce beim Landen (kein Stauchen/Strecken).
  // Stell-Knopf: `friction`, kleiner = mehr Bounce, größer = weniger.
  const [spring, api] = useSpring(() => ({
    posY: y + DROP_FROM,
    config: { mass: 1, tension: 320, friction: 26 },
  }));

  useEffect(() => {
    api.start({ posY: y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mini-Plop bei Bild-/Mengenwechsel: das Haupt-Item behält seinen key, tauscht
  // aber die Textur (Varianten). prevSrc-Guard verhindert einen Plop beim Erst-
  // Mount. Reihenfolge (set VOR start): erst hochsetzen, DANN Aufprall neu scharf
  // schalten, dann fallen lassen -> kein Sofort-Ripple; der bestehende useFrame-
  // Aufprall feuert den Ripple beim Wieder-Landen.
  const prevSrc = useRef(option.src);
  useEffect(() => {
    if (prevSrc.current === option.src) return; // Erst-Mount / kein Bildwechsel
    prevSrc.current = option.src;
    api.set({ posY: y + PLOP_DROP });
    landedRef.current = false;
    api.start({ posY: y });
  }, [option.src, y, api]);

  useFrame((state) => {
    const tv = exitT.get(); // 1 = lebt, -> 0 beim Entfernen (Absinken/Ausblenden)
    const m = matRef.current;
    if (m) {
      m.uniforms.uMap.value = map || DUMMY;
      m.uniforms.uWaterY.value = waterY;
      if (brothColor) m.uniforms.uBrothColor.value.set(brothColor);
      // Versinken: der eingetauchte Teil blendet mit fortschreitendem Absinken
      // komplett weg (Deckel auf uFade), damit die Zutat sauber in der Brühe verschwindet.
      m.uniforms.uFade.value = SUBMERGE_FADE + (1 - tv) * (1 - SUBMERGE_FADE);
      const baseOp = map ? 1 : 0;
      // In der Brühe erst spät ausblenden (die letzte SINK_FADE_TAIL-Strecke);
      // ohne Brühe (Fallback) linear mit dem Schrumpfen ausblenden.
      m.uniforms.uOpacity.value =
        baseOp * (inBroth ? Math.min(1, tv / SINK_FADE_TAIL) : tv);
    }

    // Versink-Ripple: fällt tv erstmals unter 1 (Zutat wird entfernt) -> genau EIN
    // Ripple auf der Brühe. Nur mit Brühe (ohne gibt es keine Oberfläche).
    if (prevExitRef.current >= 1 && tv < 1 && inBroth) {
      onImpact?.(x, y);
    }
    prevExitRef.current = tv;

    // Aufprall: sobald die Zutat zum ersten Mal die Oberfläche (y) erreicht -> Ripple + Floaten an.
    if (!landedRef.current && spring.posY.get() <= y) {
      landedRef.current = true;
      onImpact?.(x, y);
    }
    // Float nur solange die Zutat lebt (tv == 1); beim Versinken einfrieren.
    if (landedRef.current && innerRef.current && tv >= 1) {
      const t = state.clock.elapsedTime;
      // float dämpft die Wipp-Amplitude (Nori steht hinten und wippt kaum).
      innerRef.current.position.y = Math.sin(t * 0.8 + phase.current) * 2 * float;
      innerRef.current.rotation.z = Math.sin(t * 0.5 + phase.current) * 0.03 * float;
    }
  });

  // Gemeinsame Ebenen-Map (mit 'back' für Nori) aus sceneConfig, gespiegelt zum Thumbnail.
  const renderOrder = (LAYER_RO[layer] ?? RO.surface) + frontness * 9;

  return (
    // Äußere Gruppe: Platzierung + Fall-Feder (unberührt).
    <animated.group position-x={x} position-y={spring.posY} scale={scale}>
      {/* Innere Gruppe: Versinken beim Entfernen. In der Brühe sinkt sie um
          SINK_DEPTH ab (Skala bleibt 1); ohne Brühe schrumpft sie stattdessen. */}
      <animated.group
        position-y={exitT.to((v) => (v - 1) * SINK_DEPTH * (inBroth ? 1 : 0))}
        scale={exitT.to((v) => (inBroth ? 1 : 0.6 + 0.4 * v))}
      >
        {/* Drehung in der Bildebene (nur das Sprite; Fall/Versinken bleiben
            welt-ausgerichtet). Die Float-Wippe auf innerRef legt sich nested oben drauf. */}
        <group rotation-z={rotZ}>
          <mesh ref={innerRef} renderOrder={renderOrder}>
            <planeGeometry args={[w, h]} />
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
        </group>
      </animated.group>
    </animated.group>
  );
}
