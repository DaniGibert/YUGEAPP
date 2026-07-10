/* =============================================================================
 * Dampf: aufsteigende weiche Partikel über der Schüssel. Macht die Szene
 * sofort lebendig. Additiv & weich, wenige Partikel (Tablet-freundlich);
 * Look-Werte (Anzahl, Opacity, Größenspanne) in config/sceneConfig.js.
 * ===========================================================================*/
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { softCircleTexture } from "./sceneTextures.js";
import {
  RO,
  STEAM_COUNT,
  STEAM_FADE_IN,
  STEAM_OPACITY,
  STEAM_SCALE_MAX,
  STEAM_SCALE_MIN,
} from "../config/sceneConfig.js";
import { PREFERS_REDUCED_MOTION } from "./reducedMotion.js";

const Y_BOTTOM = 10; // knapp über der Brühe
const Y_TOP = 300;

// delay: Verzögerung (s) vor dem Einblenden — beim ersten Füllen wartet der Dampf,
// bis die Brühe steht (BowlScene reicht dann FILL_DURATION herein).
export default function Steam({ delay = 0 }) {
  const tex = useRef(softCircleTexture());
  const groupRef = useRef();
  const mountTimeRef = useRef(-1); // Mount-Zeitpunkt aus der Szenen-Uhr (kein Date.now)

  const seeds = useMemo(
    () =>
      Array.from({ length: STEAM_COUNT }, () => ({
        x: (Math.random() - 0.5) * 240,
        speed: 14 + Math.random() * 16,
        sway: 16 + Math.random() * 22,
        swaySpeed: 0.4 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        scale: STEAM_SCALE_MIN + Math.random() * (STEAM_SCALE_MAX - STEAM_SCALE_MIN),
        offset: Math.random(), // 0..1 Startfortschritt
      })),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (mountTimeRef.current < 0) mountTimeRef.current = t; // erster Frame = Mount
    // Sanftes Einblenden ab (Mount + delay); reduced-motion -> sofort voll da.
    const fadeIn = PREFERS_REDUCED_MOTION
      ? 1
      : Math.min(1, Math.max(0, (t - mountTimeRef.current - delay) / STEAM_FADE_IN));
    const span = Y_TOP - Y_BOTTOM;
    const g = groupRef.current;
    if (!g) return;
    for (let i = 0; i < STEAM_COUNT; i++) {
      const s = seeds[i];
      const prog = (s.offset + (t * s.speed) / span) % 1; // 0..1 aufsteigend
      const child = g.children[i];
      const yy = Y_BOTTOM + prog * span;
      child.position.set(s.x + Math.sin(t * s.swaySpeed + s.phase) * s.sway, yy, 0);
      const sc = s.scale * (0.6 + prog * 0.9);
      child.scale.set(sc, sc, 1);
      // ein-/ausfaden (Partikel-Zyklus) * Mount-Einblendung
      child.material.opacity = Math.sin(prog * Math.PI) * STEAM_OPACITY * fadeIn;
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
