/* =============================================================================
 * Brühe-Oberfläche: nutzt das Brühe-PNG (z.B. miso.png) als Textur und lässt es
 * mit einem Shader leicht wabern + beim Aufprall rippeln (uv-Verzerrung + Glanz).
 * Fehlt das PNG, fällt sie auf eine flache, halbtransparente Farb-Ellipse zurück.
 * ===========================================================================*/
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BROTH_CY, BROTH_RX, BROTH_RY, RO } from "../config/sceneConfig.js";

const MAXR = 6;
const loader = new THREE.TextureLoader();

// 1x1-Dummy, damit der sampler2D nie "null" ist (vermeidet WebGL-Warnungen).
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
  uniform float uTime;
  uniform vec2 uHalf;
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform vec3 uRipples[MAXR];
  varying vec2 vUv;

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
      float d = length(p - uRipples[i].xy);
      float env = exp(-age * 1.8) * exp(-d * 0.012) * smoothstep(0.0, 0.18, age);
      float w = sin(d * 0.18 - age * 7.0);
      ring += w * env;
      vec2 dir = d > 0.001 ? (p - uRipples[i].xy) / d : vec2(0.0);
      disp += dir * w * env * 7.0;
    }
    vec2 uvDisp = disp / (uHalf * 2.0);

    if (uHasMap > 0.5) {
      vec4 t = texture2D(uMap, vUv + uvDisp);
      gl_FragColor = vec4(t.rgb * (1.0 + ring * 0.25), t.a);
    } else {
      float er = length(e);
      if (er > 1.0) discard;
      float edge = smoothstep(1.0, 0.9, er);
      vec3 col = uColor * (0.92 + ring * 0.35);
      gl_FragColor = vec4(col, 0.9 * edge);
    }
  }
`;

const Broth = forwardRef(function Broth({ broth, visible = true }, ref) {
  const color = broth?.color || "#e8ddc8";
  const src = broth?.src;
  const [tex, setTex] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!src) {
      setTex(null);
      return;
    }
    loader.load(
      src,
      (t) => {
        if (!alive) return;
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        setTex(t);
      },
      undefined,
      () => {
        if (alive) setTex(null);
      }
    );
    return () => {
      alive = false;
    };
  }, [src]);

  const matRef = useRef();
  const timeRef = useRef(0);
  const idxRef = useRef(0);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uHalf: { value: new THREE.Vector2(BROTH_RX, BROTH_RY) },
      uMap: { value: DUMMY },
      uHasMap: { value: 0 },
      uRipples: { value: Array.from({ length: MAXR }, () => new THREE.Vector3(0, 0, -1)) },
    }),
    []
  );

  useFrame((state) => {
    timeRef.current = state.clock.elapsedTime;
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uTime.value = timeRef.current;
    m.uniforms.uColor.value.set(color || "#e8ddc8");
    m.uniforms.uMap.value = tex || DUMMY;
    m.uniforms.uHasMap.value = tex ? 1 : 0;
  });

  useImperativeHandle(ref, () => ({
    ripple(worldX, worldY) {
      const slot = uniforms.uRipples.value[idxRef.current % MAXR];
      slot.set(worldX, worldY - BROTH_CY, timeRef.current);
      idxRef.current += 1;
    },
  }));

  return (
    <mesh position={[0, BROTH_CY, 0]} renderOrder={RO.broth} visible={visible}>
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
