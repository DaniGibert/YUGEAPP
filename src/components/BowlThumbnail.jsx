import { useState } from 'react';
import { BROTHS } from '../config/menu';
import {
  BOWL_CY,
  BOWL_W,
  BROTH_CY,
  BROTH_RX,
  BROTH_RY,
  GROUND_SHADOW_CX,
  GROUND_SHADOW_CY,
  GROUND_SHADOW_H,
  GROUND_SHADOW_OPACITY,
  GROUND_SHADOW_W,
  RO,
} from '../config/sceneConfig';
import { composeBowlItems } from '../scene/composeBowl';
import { bowlSceneIngredients } from '../state/orderStore';

// Statisches Mini-Bild einer gebauten Bowl, komponiert aus denselben Assets,
// derselben Platzierung (Goldener-Winkel-Spirale) und denselben Ebenen wie die
// WebGL-Szene, aber als leichtes DOM/IMG-Komposit ohne Three.js.
// Funktioniert überall (Warenkorb, Bezahlen, Status), auch für Bowls aus der
// Datenbank: Es braucht nur das config-JSON (broth, noodle, protein, toppings).

// Sichtbarer Weltausschnitt, auf die Schüssel gecroppt (Weltkoordinaten wie sceneConfig)
const VIEW = { minX: -340, maxX: 340, minY: -240, maxY: 180 };
const VIEW_W = VIEW.maxX - VIEW.minX;
const VIEW_H = VIEW.maxY - VIEW.minY;

// Weltkoordinaten (Element-Zentrum) -> absolute CSS-Position in Prozent
function worldStyle(x, y, width, zIndex) {
  return {
    left: `${((x - VIEW.minX) / VIEW_W) * 100}%`,
    top: `${((VIEW.maxY - y) / VIEW_H) * 100}%`,
    width: `${(width / VIEW_W) * 100}%`,
    zIndex,
    transform: 'translate(-50%, -50%)',
  };
}

// Ein Bild-Layer mit Platzhalter-Fallback (fehlt das PNG -> farbige Form,
// analog zum prozeduralen Fallback der Szene).
function LayerImage({ src, color, style, aspect = '1 / 1' }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    if (!color) return null;
    return (
      <span
        className="absolute block"
        style={{ ...style, aspectRatio: aspect, borderRadius: '50%', backgroundColor: color, opacity: 0.9 }}
      />
    );
  }
  return (
    <img src={src} alt="" className="absolute block max-w-none" style={style} onError={() => setFailed(true)} />
  );
}

export default function BowlThumbnail({ config, className = '' }) {
  if (!config?.broth) return null;

  const broth = BROTHS.find((b) => b.id === config.broth);
  const items = composeBowlItems(bowlSceneIngredients(config));

  return (
    <div
      aria-hidden="true"
      // isolate: eigener Stacking-Kontext, damit die Ebenen-z-Indizes (RO)
      // nur innerhalb des Thumbnails gelten und nichts außerhalb überdecken
      className={`relative isolate overflow-hidden ${className}`}
      style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
    >
      {/* Boden-/Steh-Schatten: flache, weiche Ellipse unter der Schüssel
          (gleiche Werte wie die 3D-Szene), erdet die Mini-Bowl. */}
      <span
        className="absolute block"
        style={{
          ...worldStyle(GROUND_SHADOW_CX, GROUND_SHADOW_CY, GROUND_SHADOW_W, RO.groundShadow),
          aspectRatio: `${GROUND_SHADOW_W} / ${GROUND_SHADOW_H}`,
          background: `radial-gradient(closest-side, rgba(28, 23, 20, ${GROUND_SHADOW_OPACITY}), rgba(28, 23, 20, 0))`,
        }}
      />
      <LayerImage
        src="/assets/bowl/bowl_back.png"
        color="var(--color-line)"
        style={worldStyle(0, BOWL_CY, BOWL_W, RO.bowlBack)}
      />
      {broth && (
        <LayerImage
          src={`/assets/broth/${broth.id}.png`}
          color={broth.sceneColor}
          aspect={`${BROTH_RX} / ${BROTH_RY}`}
          style={worldStyle(0, BROTH_CY, BROTH_RX * 2, RO.broth)}
        />
      )}
      {items.map((item) => (
        <LayerImage
          key={item.key}
          src={item.option.src}
          color={item.option.color}
          style={worldStyle(
            item.x,
            item.y,
            item.option.size * item.scale,
            (item.layer === 'noodle' ? RO.noodle : RO.surface) + Math.round(item.frontness * 9),
          )}
        />
      ))}
      <LayerImage
        src="/assets/bowl/bowl_front.png"
        color={null}
        style={worldStyle(0, BOWL_CY, BOWL_W, RO.bowlFront)}
      />
    </div>
  );
}
