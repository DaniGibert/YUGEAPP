/* =============================================================================
 * BowlScene: R3F-Canvas mit dem Layer-Sandwich (2.5D-"Papier-Diorama").
 * Bekommt NUR Props (CLAUDE.md §3.5):
 *   broth       Options-Id der Brühe (oder null)
 *   ingredients [{ key, id, category }] (Mengen bereits als Einzel-Instanzen)
 *   modifiers   (aktuell ohne visuelle Wirkung)
 * Alle Tuning-Werte liegen in config/sceneConfig.js.
 *
 * Orthografische Kamera, 1 Welt-Einheit ≈ 1 px der Komposition; FitCamera
 * passt die feste Komposition (CANVAS_W×CANVAS_H) per Zoom fluid in den
 * Container ein. Stapelung rein über renderOrder (depthTest aus).
 * ===========================================================================*/
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { BROTHS } from '../config/menu';
import { BOWL_CY, BOWL_W, CANVAS_H, CANVAS_W, RO, WATERLINE_Y } from '../config/sceneConfig';
import { useBowlTexture } from './sceneTextures';
import { composeBowlItems } from './composeBowl';
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

export default function BowlScene({ broth = null, ingredients = [] }) {
  const brothRef = useRef();
  const handleImpact = useCallback((x, y) => {
    brothRef.current?.ripple(x, y);
  }, []);

  const brothOption = useMemo(() => BROTHS.find((b) => b.id === broth) ?? null, [broth]);
  const brothData = brothOption
    ? { color: brothOption.sceneColor, src: `/assets/broth/${brothOption.id}.png` }
    : null;

  // Semantische Liste -> platzierte Instanzen (gemeinsame Logik mit BowlThumbnail).
  const items = useMemo(() => composeBowlItems(ingredients), [ingredients]);

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
        <Bowl />
        <Broth ref={brothRef} broth={brothData} visible={!!brothData} />
        {items.map((item) => (
          <Ingredient3D
            key={item.key}
            item={item}
            onImpact={handleImpact}
            waterY={waterY}
            brothColor={brothData?.color}
          />
        ))}
        <Steam />
      </Canvas>
    </div>
  );
}
