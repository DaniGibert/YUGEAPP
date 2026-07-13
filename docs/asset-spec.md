# Yuge — Asset-Spezifikation (Zutaten-PNGs der Bowl-Szene)

Diese Datei beschreibt, wie die Zutaten-PNGs für die Bowl-Szene aussehen müssen,
damit sie im 2.5D-„Papier-Diorama" konsistent zusammenpassen. `docs/` wird **nicht**
deployt (nur Doku); die Assets selbst liegen unter `public/assets/<kategorie>/`.

Bezug: CLAUDE.md §4 (Ordner/Naming), §7 (Bowl-Szene), `config/sceneConfig.js`
(Anrichte-Karte `ANCHORS`), `config/menu.js` (`sceneVariants`).

---

## 1. Look (gilt für alle Zutaten-PNGs)

- **Perspektive:** 30°-Aufsicht, identisch zum Diorama (leichte Schräg-Draufsicht,
  wie eine angerichtete Schüssel von halb oben gesehen). Alle Zutaten aus **demselben**
  Blickwinkel, sonst „kippt" die Komposition.
- **Licht:** weich, von **oben/links**. Sanfter Verlauf, keine harten Spitzlichter.
- **Freisteller:** transparenter Hintergrund (Alpha), sauber ausgeschnitten, keine
  weißen Kanten/Halos.
- **Kein Schatten.** Zutaten sind sauber freigestellt, ohne eingebackenen
  Schlagschatten. Die Szene wirft **keinen** Kontaktschatten mehr auf Zutaten
  (bewusst entfernt); nur der Boden-Schatten unter der ganzen Schüssel bleibt.
- **Kein eingebackener Boden/Teller.** Nur die Zutat selbst.

## 2. Technik

- **Master** ≥ 1500 px lange Kante (verlustfrei arbeiten).
- **Export** als PNG, max. **1100 px** lange Kante, palettiert/optimiert
  (kleine Dateien fürs Tablet). Alpha erhalten.
- **Footprint:** Der sichtbare Mittelpunkt der Zutat sitzt in der Bildmitte; der
  transparente Rand ist symmetrisch. `size` in `menu.js` gibt die Breite in Welt-px
  vor, die Höhe folgt dem PNG-Seitenverhältnis — also das Seitenverhältnis bewusst
  wählen.

## 3. Naming & Varianten

- Basis: `/assets/<kategorie>/<id>.png` — Dateiname == Options-`id` aus `menu.js`.
- **Mengen-Variante:** `/assets/topping/<id>-x2.png` = **derselbe** Anker, nur ein
  **vollerer Haufen** (mehr Körner/Stücke). Wichtig: **gleicher visueller
  Mittelpunkt und gleicher Footprint** wie `x1` — beim Mengenwechsel tauscht die
  Szene nur die Textur (Mini-Plop), das Bild darf dabei **nicht springen**.
- Nach dem Erzeugen eines `-x2.png` die `2` in `sceneVariants` des Toppings in
  `menu.js` eintragen (`[1]` → `[1, 2]`). Ohne diesen Eintrag bleibt das `-x2`
  ungenutzt; Mengen 3/4 streut die Szene ohnehin über Satelliten des Basis-Assets.
- Fehlt eine Variante zur Laufzeit, greift die Fallback-Leiter automatisch:
  `-x2` → Basis → Farb-Blob (`sceneColor`). Nichts crasht.

## 4. Sonderfall Nori

- **Stehendes Blatt** (nicht flach liegend): rechteckiges Nori-Blatt, das hinten
  am Schüsselrand **aufrecht** steckt.
- **Gerade Unterkante** (dort „taucht" es in Nudeln/Brühe ein). Oberkante ragt über
  den Rand. Nori liegt auf der Ebene `back` (hinter Nudeln/Toppings) und wippt kaum
  (`float` niedrig) — beides in `ANCHORS.nori` (`sceneConfig.js`) gesetzt, nicht im Asset.
- **Kein** Kontaktschatten (die Szene wirft ohnehin keinen mehr).

## 5. Bedarfsliste (Stand: aktueller Umbau)

**Alle Basis-Assets (1x) vorhanden:** alle Brühen, Nudeln, Protein, Toppings,
Getränke/Beilagen, Schüssel (`bowl_back`/`bowl_front`). Positionen/Größen sind
im Scene-Lab getunt (`ANCHORS` in `sceneConfig.js`, Größen in `menu.js`).

**Optional, noch offen (Mengen-Varianten `-x2`, vollerer Haufen ab Menge 2):**

- `topping/<id>-x2.png` für die 6 Toppings. Bewusst noch nicht gebaut: der
  Satelliten-Haufen (Basis-Asset dupliziert) sieht bei mehreren gleichen Toppings
  bereits gut aus. `-x2` nur nachrüsten, wenn ein bestimmtes Topping gestapelt
  künstlich wirkt (dann `sceneVariants: [1]` → `[1, 2]`).

Fehlt zur Laufzeit ein Asset, rendert die Szene an jedem Anker still einen Farb-Blob
(`sceneColor`) — die Komposition (Anrichte-Karte) bleibt korrekt.
