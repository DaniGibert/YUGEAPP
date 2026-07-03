/* =============================================================================
 * Eine Zutat als texturierte Fläche (Billboard).
 *  - Fall von oben (Feder) -> Aufprall (onImpact: Ripple) -> Squash -> sanftes Floaten.
 *  - "Wasserlinie"-Shader: Alles unterhalb der Brühen-Oberfläche (Welt-y < uWaterY)
 *    wird weich zur Brühenfarbe getönt & leicht ausgeblendet -> die Zutat sieht aus,
 *    als steckte sie in der Suppe. Das Eintauchen passiert beim Fallen automatisch.
 *  - Surface-Zutaten werfen zusätzlich einen weichen Kontaktschatten auf die Brühe.
 * ===========================================================================*/
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useSpring, animated } from "@react-spring/three";
import * as THREE from "three";
import { useTextureOrColor, softCircleTexture } from "./sceneTextures.js";
import { DROP_FROM, RO, SUBMERGE_FADE, SUBMERGE_TINT, WATER_BAND } from "../config/sceneConfig.js";

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

export default function Ingredient3D({ item, onImpact, waterY = -9999, brothColor }) {
  const { option, x, y, scale, frontness, layer } = item;
  const map = useTextureOrColor(option.src, option.color);
  const shadowTex = useRef(softCircleTexture());

  // option.size = Breite in Welt-px; Höhe folgt dem Seitenverhältnis des PNG.
  const w = option.size ?? 80;
  const ratio = map && map.image && map.image.width ? map.image.height / map.image.width : 1;
  const h = w * ratio;

  const innerRef = useRef();
  const matRef = useRef();
  const landedRef = useRef(false);
  const [landed, setLanded] = useState(false);
  const phase = useRef(Math.random() * Math.PI * 2);

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

  useFrame((state) => {
    const m = matRef.current;
    if (m) {
      m.uniforms.uMap.value = map || DUMMY;
      m.uniforms.uOpacity.value = map ? 1 : 0;
      m.uniforms.uWaterY.value = waterY;
      if (brothColor) m.uniforms.uBrothColor.value.set(brothColor);
    }
    // Aufprall: sobald die Zutat zum ersten Mal die Oberfläche (y) erreicht -> Ripple + Floaten an.
    if (!landedRef.current && spring.posY.get() <= y) {
      landedRef.current = true;
      setLanded(true);
      onImpact?.(x, y);
    }
    if (landedRef.current && innerRef.current) {
      const t = state.clock.elapsedTime;
      innerRef.current.position.y = Math.sin(t * 0.8 + phase.current) * 2;
      innerRef.current.rotation.z = Math.sin(t * 0.5 + phase.current) * 0.03;
    }
  });

  const ORDER = { submerged: RO.submerged, noodle: RO.noodle, surface: RO.surface };
  const renderOrder = (ORDER[layer] ?? RO.surface) + frontness * 9;

  return (
    <animated.group position-x={x} position-y={spring.posY} scale={scale}>
      {/* Kontaktschatten auf der Brühe (nur Surface-Zutaten, erst nach dem Landen) */}
      {layer === "surface" && landed && (
        <mesh position={[0, -h * 0.36, 0]} renderOrder={RO.shadow + frontness * 0.5}>
          <planeGeometry args={[w * 0.95, h * 0.42]} />
          <meshBasicMaterial
            map={shadowTex.current}
            color="#000000"
            transparent
            opacity={0.24}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

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
    </animated.group>
  );
}
