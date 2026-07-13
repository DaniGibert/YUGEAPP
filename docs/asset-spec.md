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

Vorhanden: `broth/miso`, `noodle/mittel`, `protein/tofu`, `topping/ajitama`,
`topping/mais`, alle Getränke/Beilagen, Schüssel (`bowl_back`/`bowl_front`).

**Noch zu erstellen (Basis-Assets):**

- Brühen: `broth/tonkotsu.png`, `broth/shoyu.png`, `broth/shio.png`
- Nudeln: `noodle/duenn.png`, `noodle/dick.png`
- Protein: `protein/chashu-schwein.png`, `protein/chashu-haehnchen.png`
- Toppings: `topping/naruto.png`, `topping/nori.png`,
  `topping/bambussprossen.png`, `topping/fruehlingszwiebeln.png`

**Optional (Mengen-Varianten `-x2`) für alle 6 Toppings:**

- `topping/ajitama-x2.png`, `topping/naruto-x2.png`, `topping/nori-x2.png`,
  `topping/mais-x2.png`, `topping/bambussprossen-x2.png`,
  `topping/fruehlingszwiebeln-x2.png`

Bis die Assets da sind, rendert die Szene an jedem Anker still einen Farb-Blob
(`sceneColor`) — die Komposition (Anrichte-Karte) ist bereits korrekt.
