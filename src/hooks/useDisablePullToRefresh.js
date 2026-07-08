import { useEffect } from 'react';

// Blockiert das native Pull-to-Refresh (Chrome/Android), ohne das Scrollen in
// App-Listen zu stören: verhindert die Wischgeste nur, wenn kein scrollbarer
// Bereich sie noch aufnehmen kann. Ergänzt overscroll-behavior aus theme.css.
export function useDisablePullToRefresh() {
  useEffect(() => {
    let startY = 0;

    const onStart = (e) => {
      if (e.touches.length === 1) startY = e.touches[0].clientY;
    };

    const onMove = (e) => {
      if (e.touches.length !== 1) return;
      const pullingDown = e.touches[0].clientY > startY;
      if (!pullingDown) return;

      // Kann ein scrollbarer Vorfahr die Geste noch aufnehmen (nicht ganz oben)?
      let el = e.target;
      while (el && el !== document.body) {
        if (el.scrollHeight > el.clientHeight) {
          const overflowY = getComputedStyle(el).overflowY;
          if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollTop > 0) return;
        }
        el = el.parentElement;
      }

      // Sonst würde die Geste die Seite überziehen -> Pull-to-Refresh unterbinden.
      if (e.cancelable) e.preventDefault();
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
    };
  }, []);
}
