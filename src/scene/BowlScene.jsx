/* =============================================================================
 * BowlScene: R3F-Canvas mit dem Layer-Sandwich (2.5D-"Papier-Diorama").
 * Bekommt NUR Props (CLAUDE.md §3.5):
 *   broth       Options-Id der Brühe (oder null)
 *   ingredients [{ key, id, category, qty }] (Menge als qty; composeBowlItems
 *               löst Varianten-Assets + Satelliten auf, nicht der Aufrufer)
 *   modifiers   (aktuell ohne visuelle Wirkung)
 * Alle Tuning-Werte liegen in config/sceneConfig.js.
 *
 * Orthografische Kamera, 1 Welt-Einheit ≈ 1 px der Komposition; FitCamera
 * passt die feste Komposition (CANVAS_W×CANVAS_H) per Zoom fluid in den
 * Container ein. Stapelung rein über renderOrder (depthTest aus).
 * ===========================================================================*/
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTransition, easings } from '@react-spring/three';
import { BROTHS } from '../config/menu';
import {
  BOWL_CY,
  BOWL_W,
  CANVAS_H,
  CANVAS_W,
  FILL_DURATION,
  GROUND_SHADOW_CX,
  GROUND_SHADOW_CY,
  GROUND_SHADOW_H,
  GROUND_SHADOW_OPACITY,
  GROUND_SHADOW_W,
  RO,
  SINK_DURATION,
  WATERLINE_Y,
} from '../config/sceneConfig';
import { useBowlTexture, softCircleTexture } from './sceneTextures';
import { composeBowlItems } from './composeBowl';
import { PREFERS_REDUCED_MOTION } from './reducedMotion';
import Broth from './Broth';
import Steam from './Steam';
import Ingredient3D from './Ingredient3D';

// Passt den orthografischen Zoom an die Container-Größe an.
function FitCamera() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    camera.zoom = Math.min(size.width / CANVAS_W, size.height / CANVAS_H) || 1;
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

/* Boden-/Steh-Schatten unter der Schüssel: eine flache, weiche Ellipse (weiße
   softCircle-Textur, schwarz eingefärbt) hinter bowlBack. Erdet die Schüssel. */
function GroundShadow() {
  const tex = useMemo(() => softCircleTexture(), []);
  return (
    <mesh
      position={[GROUND_SHADOW_CX, GROUND_SHADOW_CY, 0]}
      scale={[GROUND_SHADOW_W, GROUND_SHADOW_H, 1]}
      renderOrder={RO.groundShadow}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={tex}
        color="#000000"
        transparent
        opacity={GROUND_SHADOW_OPACITY}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/* Schüssel: hintere Ebene (volles PNG) + vordere Lippe (freigestelltes PNG).
   Beide teilen EINE Welt-pro-Pixel-Skala (aus bowl_back) -> deckungsgleich. */
function Bowl() {
  const back = useBowlTexture('/assets/bowl/bowl_back.png', 'back');
  const front = useBowlTexture('/assets/bowl/bowl_front.png', 'front');
  if (!back) return null;

  const bw = back.image?.width || 2098;
  const bh = back.image?.height || 1240;
  const scale = BOWL_W / bw;
  const backW = bw * scale;
  const backH = bh * scale;

  let frontW = backW;
  let frontH = backH;
  if (front?.image?.width) {
    frontW = front.image.width * scale;
    frontH = front.image.height * scale;
  }

  return (
    <group>
      <mesh position={[0, BOWL_CY, 0]} renderOrder={RO.bowlBack}>
        <planeGeometry args={[backW, backH]} />
        <meshBasicMaterial map={back} transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      {front && (
        <mesh position={[0, BOWL_CY, 0]} renderOrder={RO.bowlFront}>
          <planeGeometry args={[frontW, frontH]} />
          <meshBasicMaterial map={front} transparent depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/* Meldet EINMAL, wenn der erste Frame mit sichtbarer Schuessel gezeichnet ist.
   useFrame laeuft VOR dem Zeichnen des jeweiligen Frames: sobald die bowl_back-
   Textur da ist (echt oder Platzhalter, also truthy), lassen wir noch EINEN
   Frame verstreichen, damit die Schuessel sicher gemalt wurde, und feuern erst
   dann onReady. Danach ist der Ref gesetzt und die Frame-Schleife tut nichts mehr. */
function SceneReadySignal({ onReady }) {
  // Gleiche Textur wie <Bowl/>; der Loader cached das Promise, kein zweiter Ladevorgang.
  const back = useBowlTexture('/assets/bowl/bowl_back.png', 'back');
  const firedRef = useRef(false);
  const drawnRef = useRef(false);
  useFrame(() => {
    if (firedRef.current || !back) return;
    if (!drawnRef.current) {
      drawnRef.current = true; // dieser Frame malt die Schuessel erstmals
      return;
    }
    firedRef.current = true;
    onReady?.();
  });
  return null;
}

export default function BowlScene({ broth = null, ingredients = [], onReady, brothGeom }) {
  const brothRef = useRef();
  const handleImpact = useCallback((x, y) => {
    brothRef.current?.ripple(x, y);
  }, []);

  const brothOption = useMemo(() => BROTHS.find((b) => b.id === broth) ?? null, [broth]);
  const brothData = brothOption
    ? { color: brothOption.sceneColor, src: `/assets/broth/${brothOption.id}.png` }
    : null;

  // Radiales Füllen NUR beim allerersten Brühen-Wählen in leerer Bowl (kein Vorgänger,
  // keine Zutaten). Danach übernimmt Broth den Crossfade selbst. isFirstFill wird auch
  // im Render gelesen (Steam-delay) -> Dampf blendet erst nach dem Füllen ein.
  const prevBrothRef = useRef(null);
  const isFirstFill = !prevBrothRef.current && !!broth && ingredients.length === 0;
  useEffect(() => {
    if (isFirstFill) brothRef.current?.fill();
    prevBrothRef.current = broth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broth]);

  // Semantische Liste -> platzierte Instanzen (gemeinsame Logik mit BowlThumbnail).
  const items = useMemo(() => composeBowlItems(ingredients), [ingredients]);

  // Exit-Choreografie: useTransition besitzt den Lebenszyklus (Leave-Ende = Unmount,
  // Re-Add mit gleichem key kehrt den Spring um statt zu remounten). t: 1 (lebt) -> 0
  // (versunken). Nur die Leave-Phase animiert; Enter/Update sind sofort (der Fall
  // läuft weiterhin in Ingredient3D selbst).
  const transitions = useTransition(items, {
    keys: (it) => it.key,
    from: { t: 1 },
    enter: { t: 1 },
    leave: { t: 0 },
    config: (_item, _index, phase) =>
      phase === 'leave' && !PREFERS_REDUCED_MOTION
        ? { duration: SINK_DURATION, easing: easings.easeInCubic }
        : { duration: 0 },
  });

  // Pflicht-Lookup: bei lebenden keys IMMER das aktuelle Item rendern (src-/qty-
  // Updates + Mini-Plop fließen weiter); nur Leaving-Items nutzen den Snapshot.
  const itemsByKey = useMemo(() => {
    const m = new Map();
    for (const it of items) m.set(it.key, it);
    return m;
  }, [items]);

  // Wasserlinie nur aktiv, wenn eine Brühe gewählt ist.
  const waterY = brothData ? WATERLINE_Y : -9999;

  return (
    <div className="h-full w-full">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 100], zoom: 1, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
      >
        <FitCamera />
        {onReady && <SceneReadySignal onReady={onReady} />}
        <GroundShadow />
        <Bowl />
        <Broth ref={brothRef} broth={brothData} visible={!!brothData} geom={brothGeom} />
        {transitions((style, item) => {
          const live = itemsByKey.get(item.key) ?? item;
          return (
            <Ingredient3D
              item={live}
              exitT={style.t}
              onImpact={handleImpact}
              waterY={waterY}
              brothColor={brothData?.color}
            />
          );
        })}
        {/* Dampf nur, wenn eine Bruehe drin ist: die leere Schuessel dampft nicht.
            Beim ersten Fuellen wartet er, bis die Bruehe steht. */}
        {brothData && <Steam delay={isFirstFill ? FILL_DURATION : 0} />}
      </Canvas>
    </div>
  );
}
