// ============================================================================
// Menü-Komposition im Status-Hero: Platzierung der Begleiter (weitere Bowls,
// Getränke, Beilagen) rund um die Hero-Bowl. EINZIGE Quelle dieser Werte und
// Logik: StatusScreen nutzt die Defaults (HERO_LAYOUT), das Scene-Lab
// (?ansicht=lab) überschreibt sie live über den cfg-Parameter. So zeigt das
// Lab exakt die echte Anordnung, und getunte Werte landen an einer Stelle.
//
// Begleiter-Objekte: { kind: 'bowl', config } ODER { kind: 'item', item }.
// item.type = 'drink' | 'side'. Ausgabe: CSS-Style pro Begleiter (absolute
// Positionierung im Hero-Container, Standlinie unten).
// ============================================================================

export const HERO_LAYOUT = {
  // Max. Begleiter neben der Hero-Bowl (Sorten; 2× Cola = eine Cola).
  companionLimit: 4,
  // Breite der Begleiter-Boxen in px (PNGs sind ~1.83:1-Rahmen mit Objekt + Schatten).
  sideW: 200, // Beilagen (Gyoza, Reis, Karaage ...)
  drinkW: 270, // Getränke (Glas, Flasche, Dose)
  bowlW: 240, // weitere Bowl (Thumbnail)
  // Einzelne Artikel gezielt feinjustieren (überschreibt sideW/drinkW pro Name).
  itemWOverride: {
    'Matcha Tee (Warm)': 205, // Tasse füllt den Rahmen stärker -> kleiner
    Edamame: 165, // Schälchen wirkt sonst groß -> kleiner
  },
  // Fächerung der Flanker (weitere Bowls + Beilagen) um die Bowl.
  fanBase: 100, // px, Versatz des ersten Flankers von der Mitte
  fanStep: 105, // px, Zuwachs nach außen
  flankRise: 16, // px, äußere Flanker sitzen höher (wirken weiter hinten)
  flankBottomRem: 3, // rem, Standlinie der Flanker
  // Getränke: hintere Reihe, hoch, nach rechts gruppiert.
  drinkLiftRem: 3, // rem, Getränk steht höher = weiter hinten
  drinkX0: 130, // px, ein einzelnes Getränk sitzt rechts hinter der Bowl
  drinkSpread: 70, // px, Abstand nebeneinander stehender Getränke
  drinkShift: 0.35, // wie stark die Getränke-Reihe je Anzahl nach links rückt
  drinkBowlShift: 80, // px, extra Versatz nach rechts, wenn rechts eine weitere Bowl steht
  // Fall ohne Hero-Bowl (nur Begleiter, zentrierte Reihe).
  noheroSpread: 130, // px, Abstand der Begleiter
};

// Gemeinsamer Skalierungs-Faktor der ganzen Hero-Komposition. --hero-scale sitzt
// am .status-hero-scene (theme.css) und gilt für die Szenen-Höhe (also die
// Hero-Bowl) UND für alle Begleiter-Werte hier. Nur so bleibt das
// Größenverhältnis Bowl <-> Getränk/Beilage auf jedem Gerät gleich: schrumpft
// die Szene auf flachen Tablets, schrumpfen die Begleiter im selben Maß mit.
// Fallback 1 = unskaliert (Scene-Lab tunt bewusst im 1:1-Maßstab).
const SCALE = 'var(--hero-scale, 1)';

// px-Zahl aus HERO_LAYOUT -> skalierte CSS-Länge.
export const scaledPx = (px) => `calc(${px}px * ${SCALE})`;

// Beliebiger CSS-Längen-Ausdruck (z. B. "3rem + 16px") -> skalierte CSS-Länge.
export const scaledLen = (len) => `calc((${len}) * ${SCALE})`;

// Rolle eines Begleiters.
export const companionRole = (c) =>
  c.kind === 'bowl' ? 'bowl' : c.item.type === 'drink' ? 'drink' : 'side';

// Box-Breite eines Begleiters (Getränk/Beilage) in px (unskalierte Roh-Zahl:
// so liest das Scene-Lab sie ab). Fürs Rendern durch scaledPx schicken.
export function companionWidth(item, cfg = HERO_LAYOUT) {
  return cfg.itemWOverride[item.name] ?? (item.type === 'drink' ? cfg.drinkW : cfg.sideW);
}

// Position als Style: horizontaler Versatz von der Mitte, Standlinie, z-Ebene.
// `bottom` kommt bereits skaliert rein, der Versatz wird hier skaliert.
export function posStyle(offset, bottom, zIndex) {
  return {
    left: '50%',
    bottom,
    transform: `translateX(calc(-50% + (${offset}px * ${SCALE})))`,
    zIndex,
  };
}

// Flanker-Slot je Reihenfolge: erst L0, dann R0, danach nach RECHTS-außen
// (R1, R2 …), dann links-außen (L1, L2 …). So sitzt die erste weitere Bowl
// links neben der Hero, weitere sammeln sich rechts daneben.
export function flankSlot(i) {
  if (i === 0) return { side: -1, rank: 0 };
  if (i === 1) return { side: 1, rank: 0 };
  const j = i - 2;
  return j % 2 === 0 ? { side: 1, rank: 1 + j / 2 } : { side: -1, rank: 1 + (j - 1) / 2 };
}

// Platzierung aller Begleiter nach Rolle (siehe Kommentar oben):
//  - Getränke: hintere Reihe (z=1), hoch, nach RECHTS gruppiert.
//  - Beilagen/weitere Bowls: flankieren VOR den Getränken; äußere sitzen höher.
//  - Steht rechts eine weitere Bowl, kommen die Getränke davor (sichtbar).
export function layoutCompanions(list, cfg = HERO_LAYOUT) {
  const rise = (rank) => scaledLen(`${cfg.flankBottomRem}rem + ${rank * cfg.flankRise}px`);
  const flank = new Map();
  let fi = 0;
  let hasRightBowl = false;
  list.forEach((c, idx) => {
    if (companionRole(c) === 'drink') return;
    const { side, rank } = flankSlot(fi);
    fi += 1;
    const offset = side * (cfg.fanBase + rank * cfg.fanStep);
    flank.set(idx, { offset, rank });
    if (companionRole(c) === 'bowl' && offset > 0) hasRightBowl = true;
  });
  const nDrinks = list.filter((c) => companionRole(c) === 'drink').length;
  const drinkBase = cfg.drinkX0 + (hasRightBowl ? cfg.drinkBowlShift : 0);
  const drinkZ = hasRightBowl ? 8 : 1; // vor die weitere Bowl (sichtbar) statt dahinter
  let di = 0;
  return list.map((c, idx) => {
    if (companionRole(c) === 'drink') {
      const offset = drinkBase + (di - (nDrinks - 1) * cfg.drinkShift) * cfg.drinkSpread;
      di += 1;
      return posStyle(offset, scaledLen(`${cfg.drinkLiftRem}rem`), drinkZ);
    }
    const { offset, rank } = flank.get(idx);
    return posStyle(offset, rise(rank), 5 - rank);
  });
}
