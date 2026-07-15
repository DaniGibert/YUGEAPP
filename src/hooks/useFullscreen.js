import { useCallback, useEffect, useState } from 'react';

// Vollbild-Umschaltung über die Fullscreen-API. Liefert isFullscreen,
// isSupported und toggle; requestFullscreen muss aus einer Nutzergeste kommen
// (hier: Langdruck aufs Logo im Header).
//
// WICHTIG (Apple): Auf iPhone/iPad gibt es die Fullscreen-API für normale
// Seiten-Elemente NICHT — nur <video> kann dort ins Vollbild. Da Apple jeden
// Browser auf iOS/iPadOS auf WebKit zwingt, fehlt sie dort auch in Chrome; das
// ist also kein Safari-Thema, sondern ein iPad-Thema. `webkitRequestFullscreen`
// existiert auf macOS-Safari, nicht auf dem iPad. Ohne Feature-Detection läuft
// der Aufruf still ins Leere (optional call) und die Geste wirkt kaputt —
// darum meldet isSupported das, damit die UI nichts Totes anbietet.
// Der einzige Weg zu echtem Vollbild auf Apple: "Zum Home-Bildschirm
// hinzufügen" (PWA, manifest display: fullscreen + apple-mobile-web-app-capable).
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

const fsSupported = () => {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement;
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
};

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(fsElement()));
  // Einmal beim Mount ermitteln: die API-Verfügbarkeit ändert sich zur Laufzeit nicht.
  const [isSupported] = useState(fsSupported);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(fsElement()));
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (fsElement()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        await exit?.call(document);
      } else {
        const el = document.documentElement;
        const request = el.requestFullscreen || el.webkitRequestFullscreen;
        await request?.call(el);
      }
    } catch (err) {
      console.error('Vollbild fehlgeschlagen:', err);
    }
  }, []);

  return { isFullscreen, isSupported, toggle };
}
