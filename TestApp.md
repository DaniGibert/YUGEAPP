# Projekt-Rezept: Immersive 2.5D-Food-Bowl (Ramen-Builder)

Portable Zusammenfassung, **wie** diese App gebaut wurde, **mit welchen Tools** und **warum** —
zum Weitergeben an einen neuen Chat / zum Nachbauen einer neuen App.

---

## 0. Was ist das Ziel
Ein interaktiver „Bowl-Builder": Nutzer:in wählt stufenweise Zutaten (Brühe → Nudeln → Protein →
Toppings → Finish); die Zutaten **fallen animiert in eine Schüssel und tauchen sichtbar in die
Brühe ein**. Der Hero-Moment ist die Bowl-Szene. Zielgerät: **iPad Pro 11" (Querformat)**,
schwache Hardware → Performance zählt. UI + Kommentare auf Deutsch.

**Kern-Idee:** Kein echtes 3D-Modell. Ein **2.5D-„Papier-Diorama"** aus flachen, gemalten
2D-PNGs (Gemini-generiert), in einer WebGL-Szene gestapelt. Die 30°-Perspektive steckt **in den
Assets**, nicht in einer 3D-Kamera. Tiefe/„in der Suppe"-Look entstehen durch **Ebenen-Reihenfolge
+ einen Wasserlinien-Shader**, nicht durch echtes 3D.

---

## 1. Tech-Stack (exakt)
- **Vite + React 19** (`npm create vite@latest … --template react`)
- **Tailwind CSS v4** über das Vite-Plugin: `@tailwindcss/vite` + `@import "tailwindcss";` im CSS
- **3D/WebGL (nur die Bowl-Szene):**
  - `three` (Three.js)
  - `@react-three/fiber` v9 (R3F — Three in React)
  - `@react-three/drei` (Helfer)
  - `@react-spring/three` (Federn/Animation im 3D-Graphen)
  - `@react-three/postprocessing` (optional, für Bloom — hier nicht aktiv genutzt)
- `motion` (Framer Motion) ist installiert, wird aber **nicht** mehr genutzt (Reste aus einer
  früheren DOM-Version).

Install:
```bash
npm i three @react-three/fiber @react-three/drei @react-spring/three @react-three/postprocessing
npm i -D @tailwindcss/vite tailwindcss
```
Läuft mit React 19 (R3F v9 ist dafür nötig). Build (`vite build`) dient als Kompilier-Check.

---

## 2. Architektur (zwei Welten)
- **DOM-Shell (normales React + Tailwind):** feste „Bühne" im Tablet-Format, Header, Breadcrumb
  (Stufen-Navigation), Optionen-Karten, ein „Modifier" (z.B. Nudel-Härte = Auswahl ohne Zutat),
  Finish-Übersicht. Hält den State (Stufe, gewählte Brühe, `ingredients[]`, `modifiers`).
- **WebGL-Szene (R3F `<Canvas>`):** rendert Schüssel + Brühe + Zutaten + Dampf. Bekommt `broth`
  und `ingredients[]` per Props.

Beide reden nur über Props/State. Die restliche UI bleibt DOM (schnell, einfach, zugänglich);
nur der visuelle „Wow"-Teil ist WebGL.

**Feste Bühne fürs Tablet:** eine `1194×834`-Fläche (iPad Pro 11 Querformat), per
`transform: scale(min(vw/1194, vh/834))` ins Fenster skaliert → sieht überall gleich aus.

---

## 3. Die Schlüssel-Techniken (das Wichtige)

### 3.1 Layer-Sandwich statt CSS-Masking (Okklusion)
Alles ist ein flaches, zur Kamera gerichtetes „Billboard". Gestapelt wird per **Maler-Algorithmus
über `renderOrder`** — alle Materialien `transparent`, `depthTest=false`, `depthWrite=false`.
So ist die Reihenfolge deterministisch und Transparenz-Sortierung macht keine Probleme.

Reihenfolge hinten → vorne:
```
bowl_back (volle leere Schüssel)
  → submerged-Zutaten (optional, hinter der Brühe)
    → Brühe-Oberfläche (Textur + Ripple)
      → Nudeln (auf der Brühe, unter Toppings)
        → Protein/Toppings (auf der Brühe)
          → bowl_front (freigestellte vordere Lippe — verdeckt Unterkanten)
            → Dampf
```
Konstantes `RO`-Schema (Beispiel):
```js
const RO = { bowlBack:0, submerged:10, broth:20, shadow:23, noodle:26,
             surface:30, bowlFront:50, steam:60 };
// pro Zutat: renderOrder = RO[layer] + frontness*9  (vorne liegt oben)
```

### 3.2 Kamera: orthografisch, 1 Welt-Einheit ≈ 1 px
```jsx
<Canvas orthographic camera={{ position:[0,0,100], zoom:1, near:0.1, far:1000 }}
        dpr={[1,2]} gl={{ alpha:true, antialias:true }}>
```
Ursprung = Bowl-Mitte, y nach oben. Keine 3D-Kamera-Neigung — die 30°-Aufsicht ist gemalt.

### 3.3 Schüssel als ZWEI PNGs (Cutout-Diorama)
- `bowl_back.png` = volle leere Schüssel (hinter den Zutaten).
- `bowl_front.png` = **freigestellte vordere Lippe** (obere Hälfte transparent), liegt VOR den
  Zutaten → verdeckt deren Unterkante → Zutaten sitzen sichtbar *in* der Schüssel.
- **Keine Brühe einmalen** — die zeichnet die App.
- Beide **exakt gleiche Leinwandgröße** (sonst verrutscht die Front). Falls doch unterschiedlich
  breit: im Code eine gemeinsame Welt-pro-Pixel-Skala aus `bowl_back` auf beide anwenden
  (an der Höhe verankern) → deckungsgleich.

### 3.4 „In der Brühe"-Look: Wasserlinien-Shader (statt CSS mask-image)
Der Kniff, damit Zutaten *in* der Suppe wirken: pro Zutat ein Shader, der alles **unterhalb der
Brühen-Oberfläche (Welt-y < uWaterY)** weich zur Brühenfarbe tönt und leicht ausblendet. Weil das
in Weltkoordinaten rechnet, taucht eine fallende Zutat beim Durchstoßen der Oberfläche **automatisch**
ein.
```glsl
// vertex: Welt-y der Fragmente rausreichen
varying float vWorldY; varying vec2 vUv;
void main(){ vUv=uv; vec4 wp=modelMatrix*vec4(position,1.0); vWorldY=wp.y;
  gl_Position=projectionMatrix*viewMatrix*wp; }
// fragment: unter der Wasserlinie tönen + leicht ausblenden
float sub = 1.0 - smoothstep(uWaterY-uBand, uWaterY+uBand, vWorldY);
vec3 col = mix(tex.rgb, uBrothColor, sub*uTint);   // uTint ~0.5
float a  = tex.a * (1.0 - sub*uFade);              // uFade ~0.22 (klein = bleibt sichtbar)
```

### 3.5 Brühe = das gemalte PNG + Ripple-Shader
Die Brühe nutzt das Brühe-PNG als Textur (z.B. `miso.png`, eine Ellipse mit transparentem Rand).
Ein Shader lässt es **leicht wabern** (uTime) und **beim Aufprall rippeln** — über ein `ripple(x,y)`-
Handle werden Wellen als uv-Verzerrung (+ Helligkeit) an der Einschlagstelle addiert:
```glsl
// je aktiver Welle: age = uTime - startTime
float d = length(p - center);
float env = exp(-age*1.8) * exp(-d*0.012) * smoothstep(0.0,0.18,age);
float w = sin(d*0.18 - age*7.0);
disp += normalize(p-center) * w*env*7.0;   // uv-Versatz -> Wasser verzerrt
// gesampelt: texture2D(uMap, vUv + disp/(uHalf*2.0))
```
Fehlt das PNG → Fallback auf flache Farb-Ellipse.

### 3.6 Platzierung: Goldener-Winkel-Spirale (Phyllotaxis)
Komponiert & deterministisch statt Zufall → sieht jedes Mal ausgewogen aus. Kategorie steuert
das Radius-Band (Nudeln zentral, Toppings außen):
```js
const GOLDEN = Math.PI*(3-Math.sqrt(5));           // ~137.5°
const angle = index*GOLDEN + zoneOffset;
const r = zoneInner + Math.sqrt((index+0.5)/spread)*(zoneOuter-zoneInner);
const x = cx + Math.cos(angle)*r*SCAT_RX;
const y = cy + Math.sin(angle)*r*SCAT_RY;          // Ellipse (Perspektive)
const frontness = clamp((cy+SCAT_RY - y)/(2*SCAT_RY),0,1); // vorne=1 -> größer & oben
```

### 3.7 Bounce = unterdämpfte Feder (kein Squash/Stretch)
Die Zutat fällt über eine `@react-spring/three`-Feder auf ihre Zielhöhe. **Unterdämpft**
(`friction` niedrig) → sie schießt beim Landen leicht unter das Ziel und federt in EINER Bewegung
zurück = natürlicher Bounce. Der Ripple feuert im `useFrame`, sobald die Live-Position zum ersten
Mal die Oberfläche erreicht:
```js
const [spring, api] = useSpring(() => ({ posY: y+DROP_FROM, config:{ mass:1, tension:320, friction:26 }}));
useEffect(() => { api.start({ posY: y }); }, []);           // fällt + federt
useFrame(() => {
  if (!landed.current && spring.posY.get() <= y) {          // erster Kontakt
    landed.current = true; onImpact(x,y);                   // -> Brühe rippelt
  }
});
// friction kleiner = mehr Bounce, größer = weniger.  Kein scale-Squash!
```

### 3.8 Dampf & Auto-Fallback
- **Dampf:** ~14 additive „soft circle"-Sprites, steigen auf, faden ein/aus (tablet-freundlich).
- **Auto-Fallback für fehlende Assets:** Textur laden; schlägt fehl → prozeduraler farbiger
  Platzhalter (nichts crasht, man kann Assets nach und nach nachlegen).

---

## 4. Asset-Pipeline (wichtig!)
- Assets werden mit **Gemini** generiert (halb-realistischer Anime-Stil, transparenter Hintergrund).
- Schema: `public/assets/<kategorie>/<id>.png`. Dateiname **exakt = Options-`id`** → App findet
  das Bild automatisch über `/assets/<kategorie>/<id>.png`.
- Zutaten **ganz & freigestellt** zeichnen (NICHT halb „untergetaucht") — das Eintauchen macht
  der Shader. Leichte 30°-Aufsicht, passend zur Schüssel.
- **Schüssel:** `bowl_back.png` + `bowl_front.png`, **gleiche Leinwandgröße**, keine Brühe drin.
- **Photoshop-Falle:** Beide Layer aus EINEM Dokument exportieren (Ebene duplizieren, Front oben
  freistellen). Zum Exportieren **Datei → Exportieren als** (ganze Leinwand) benutzen, NICHT
  „Schnellexport/Ebenen in Dateien" (die beschneiden pro Ebene → unterschiedliche Maße).
  Für gleiche Maße ohne Verzerren: **Arbeitsfläche** (Canvas Size) ändern, nicht **Bildgröße**.

---

## 5. Tuning-Philosophie
Alle Look-/Layout-Werte an EINEM Ort (`sceneConfig.js`): Bowl-Größe/Position, Brühe-Ellipse
(`BROTH_CX/CY/RX/RY`), Streu-Ellipse (`SCAT_*`), Wasserlinie (`WATERLINE_Y`, `WATER_BAND`,
`SUBMERGE_TINT`, `SUBMERGE_FADE`), `renderOrder`-Strata (`RO`), Fallhöhe, Bounce-`friction`.
Vorgehen: Wert ändern → `npm run dev` → Screenshot → nachjustieren. (Der Mensch testet visuell
selbst; kein automatisches Preview-Tooling.)

Öffnungs-Geometrie einer neuen Schüssel **ausmessen** statt raten: PNG dekodieren und ein
Alpha-/Helligkeitsprofil sampeln (dunkler Innenraum = Brühe-Bereich, helle Ringe = Rand) →
daraus `BROTH_*` ableiten.

---

## 6. Gelernte Stolperfallen
- **Deckende Brühe versteckt Zutaten:** wenn Nudeln „hinter" der Brühe liegen und die Brühe
  deckend ist, sieht man sie nicht → entweder Nudeln auf eine Ebene ÜBER die Brühe legen, oder
  Brühe halbtransparent + Wasserlinien-Shader.
- **Fallende Zutat unsichtbar:** startet die Fall-Animation, bevor das PNG geladen ist, „fällt"
  sie unsichtbar. (Hier unkritisch, weil Assets schnell/gecacht laden — sonst Start an
  „Textur geladen" koppeln.)
- **Zwei Bowl-Layer unterschiedlich groß** → Doppelkante/Versatz. Gleiche Leinwand exportieren
  oder im Code an gemeinsamer Skala/Höhe verankern.
- **Squash & Stretch** wirkte übertrieben/verzögert; ein reiner **Positions-Bounce** (Feder) sieht
  natürlicher aus.
- **Animierte SVG/CSS-Filter** für „Wasser" ruckeln auf Tablets → GPU-Shader (WebGL) ist
  schöner UND schneller.

---

## 7. Fallback-Plan
Primär Three.js/R3F. Falls es auf dem Tablet ruckelt: das ganze Konzept (Layer-Sandwich, Spirale,
Wasserlinie, Ripple, Dampf) ist **engine-agnostisch** und portiert 1:1 auf **PixiJS** (2D-GPU,
`DisplacementFilter` fürs Wasser, Partikel-Dampf, Bloom).

---

## 8. Copy-Paste-Brief für einen neuen Chat
> Ich baue eine interaktive „Bowl-Builder"-Web-App (Vite + React 19 + Tailwind v4). Die
> Bowl-/Animations-Szene soll in **React Three Fiber (Three.js)** als **2.5D-Diorama** laufen:
> flache, gemalte 2D-PNGs (transparent, ~30°-Aufsicht) werden als Billboards per **renderOrder**
> (Maler-Algorithmus, alle Materialien transparent, depthTest/Write aus) gestapelt — kein echtes
> 3D-Modell. Orthografische Kamera (1 Welt-Einheit ≈ 1 px). Schüssel = zwei PNGs (`bowl_back` +
> freigestellte `bowl_front`-Lippe). Zutaten fallen über eine unterdämpfte `@react-spring/three`-
> Feder (leichter Bounce beim Landen), lösen beim Aufprall eine **Ripple** auf der Brühe aus
> (Shader auf dem Brühe-PNG mit uv-Verzerrung) und tauchen über einen **Wasserlinien-Shader**
> (unter `uWaterY` zur Brühenfarbe tönen + leicht ausblenden) sichtbar in die Suppe ein.
> Platzierung per **Goldener-Winkel-Spirale** mit Kategorie-Zonen. Alle Tuning-Werte in einer
> `sceneConfig.js`. Assets unter `public/assets/<kategorie>/<id>.png` mit prozeduralem
> Platzhalter-Fallback. Zielgerät iPad Pro 11 (feste 1194×834-Bühne, skaliert). Bitte hilf mir,
> das für [MEINE NEUE APP-IDEE] aufzusetzen.

(Details/Code-Bausteine: Abschnitte 3.1–3.8 dieser Datei.)
