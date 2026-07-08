import { useCallback, useEffect, useState } from 'react';

// Vollbild-Umschaltung über die Fullscreen-API (Chrome unpräfixiert, mit
// webkit-Fallback für iPad-Safari). Liefert isFullscreen + toggle;
// requestFullscreen muss aus einer Nutzergeste kommen (Button-Klick).
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(fsElement()));

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

  return { isFullscreen, toggle };
}
