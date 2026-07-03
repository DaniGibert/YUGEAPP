/* =============================================================================
 * Dampf: aufsteigende weiche Partikel über der Schüssel. Macht die Szene
 * sofort lebendig. Additiv & low-opacity, wenige Partikel (Tablet-freundlich).
 * ===========================================================================*/
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { softCircleTexture } from "./sceneTextures.js";
import { RO } from "../config/sceneConfig.js";

const COUNT = 14;
const Y_BOTTOM = 10; // knapp über der Brühe
const Y_TOP = 300;

export default function Steam() {
  const tex = useRef(softCircleTexture());
  const groupRef = useRef();

  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        x: (Math.random() - 0.5) * 240,
        speed: 14 + Math.random() * 16,
        sway: 16 + Math.random() * 22,
        swaySpeed: 0.4 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        scale: 60 + Math.random() * 70,
        offset: Math.random(), // 0..1 Startfortschritt
      })),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const span = Y_TOP - Y_BOTTOM;
    const g = groupRef.current;
    if (!g) return;
    for (let i = 0; i < COUNT; i++) {
      const s = seeds[i];
      const prog = (s.offset + (t * s.speed) / span) % 1; // 0..1 aufsteigend
      const child = g.children[i];
      const yy = Y_BOTTOM + prog * span;
      child.position.set(s.x + Math.sin(t * s.swaySpeed + s.phase) * s.sway, yy, 0);
      const sc = s.scale * (0.6 + prog * 0.9);
      child.scale.set(sc, sc, 1);
      // ein-/ausfaden
      child.material.opacity = Math.sin(prog * Math.PI) * 0.16;
    }
  });

  return (
    <group ref={groupRef}>
      {seeds.map((s, i) => (
        <mesh key={i} renderOrder={RO.steam}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={tex.current}
            transparent
            opacity={0}
            depthTest={false}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
