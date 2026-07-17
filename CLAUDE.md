# Yuge — Projekt-Regelwerk für Claude Code

Diese Datei liest du (Claude Code) bei **jeder** Aufgabe zuerst. Sie ist verbindlich.
Wenn eine Anweisung im Chat dieser Datei widerspricht, weise kurz darauf hin.

---

## 1. Was ist Yuge

Eine interaktive Bestell-Web-App für ein Ramen-Restaurant. Der Gast baut am Tablet
seine eigene Ramen-Bowl zusammen; die gewählten Zutaten fallen animiert in eine Schüssel.
Danach: Übersicht → Warenkorb (Getränke/Beilagen/weitere Bowl) → Bestellen → Live-Status
→ Nachbestellen → Bezahlen (mehrere Personen teilen die Rechnung).

- **Zielgerät:** iPad Pro 11" **Querformat** als Hauptziel; das Layout ist **fluide** und
  füllt jedes Browserfenster komplett aus (PC, Tablet, Handy quer). Schwache Hardware → Performance zählt.
- **Sprache:** Deutsch, mit Englisch als zweiter Sprache. UI-Texte laufen über die i18n-Struktur (`src/i18n/`, `t()`); **Menü-Texte sind zweisprachig in `menu.js`** (`{ de, en }`, aufgelöst über `tx()`), damit eine Zutat weiter an einer Stelle lebt. Ein Sprach-Umschalter (Deutsch/Englisch) ist im Header eingebaut. **Anzeige und Kennung sind getrennt:** sichtbarer Text ist immer lokalisiert, identifiziert wird ausschließlich über IDs (Item-`id`, Varianten-/Options-`id`), nie über den angezeigten Namen.
- **Bewertungsfokus:** UX/UI & Nutzerführung. Konsistenz, klare Führung und der „Wow"-Moment der Bowl-Szene haben Priorität.

---

## 2. Tech-Stack

- **Vite + React 19**
- **Tailwind CSS v4** über `@tailwindcss/vite`, Tokens in `src/styles/theme.css` (`@theme`)
- **Bowl-Szene:** `three` + `@react-three/fiber` v9 + `@react-spring/three` (eigene Szenen-Komponenten, kein `drei`)
- **UI-Animationen:** `motion` v12 (Framer Motion), Import ausschließlich aus `motion/react`. Nur für datengetriebene UI-Übergänge (derzeit `StatusScreen`); die Bowl-Szene bleibt bei `@react-spring/three`.
- **Backend:** **Supabase** (Datenbank + Realtime für den Live-Status)
- **State:** ein leichter globaler Store (z. B. `zustand`) für Bau-Zustand + Warenkorb
- **Analytics:** `@vercel/analytics` (Web Analytics, zählt nur auf der Live-Version)
- **Hosting:** Vercel, automatisches Deployment bei jedem Push auf `main`; die ENV-Variablen liegen in den Vercel-Projekteinstellungen.

Nichts anderes ohne Rückfrage hinzufügen.

---

## 3. Goldene Regeln (das Wichtigste)

1. **Nie feste Werte — immer Tokens.** Keine Hex-Farben, keine px-Schriftgrößen, keine
   festen Abstände direkt im Code. Immer die Utilities aus `theme.css` benutzen
   (`bg-primary`, `text-h1`, `text-ink-600`, `rounded-lg`, `gap-4`, …).
   → Farbe/Schrift/Radius ändern = **nur** `theme.css` anfassen.

2. **Jeder wiederkehrende Baustein ist eine Komponente.** Buttons, Auswahl-Karten,
   Modifier-Leisten, Breadcrumb usw. existieren **einmal** und werden überall wiederverwendet.
   → „Alle Buttons kleiner" = **nur** die `Button`-Komponente ändern, nicht 20 Screens.

3. **Der Flow ist Daten, nicht Code.** Die 5 Bau-Schritte stehen als Array in
   `config/steps.js`, das Menü in `config/menu.js`. Einen Schritt umsortieren, umbenennen
   oder ergänzen = eine Datenzeile ändern, **nicht** Komponenten umschreiben.

4. **Eine einzige Datenschicht.** Die UI liest/schreibt Daten **nur** über
   `services/dataService.js`. Supabase-Aufrufe leben ausschließlich dort. Keine Komponente
   importiert den Supabase-Client direkt.

5. **Die Bowl-Szene ist isoliert.** `scene/BowlScene.jsx` (R3F `<Canvas>`) bekommt nur
   Props (`broth`, `ingredients[]`, `modifiers`). **Alle** Positions-, Größen- und Look-Werte
   stehen in `config/sceneConfig.js`. Eine Zutat verschieben = ein Wert in `sceneConfig.js`.

6. **Fluides Vollbild-Layout.** Alle Screens rendern in eine `Stage`-Komponente, die das
   Browserfenster komplett ausfüllt (`100dvh`, **kein** Letterboxing, keine feste Bühne).
   Layouts werden mit Flex/Grid fluid gebaut und sind fürs **Querformat** optimiert;
   Größen relativ zum Container/Viewport denken, keine festen Pixel-Positionen.
   Ein eigenes Hochkant-Layout ist bewusst **nicht** Teil von v1, die App bleibt auf
   Handys im Querformat nutzbar. Auf kleinen Geräten skaliert die ganze App über
   rem-basierte Media-Queries in `theme.css` proportional herunter (Handy quer/hoch),
   damit alles sichtbar und bedienbar bleibt; iPad und Desktop bleiben unverändert.

7. **„Kellner rufen" ist global** und auf **jedem** Screen im Header sichtbar (Icon **plus
   Text-Label**, wie „Bestellstatus" und „Warenkorb"). Ein Klick öffnet ein zentriertes
   Bestätigungs-Modal („Ein:e Kellner:in kommt gleich"), das man wegklickt (der abgedunkelte
   Hintergrund blendet nur ein, `animate-fade-in`; nur die Karte poppt auf).

8. **Schreibweise & Preise.** Deutsche UI-Texte in Sentence-Case. Preise sind **Ganzzahlen**
   (z. B. `5`, nicht `4,99`). Der Gast-facing Begriff für die Bowl ist **„Ramen"** (alle
   i18n-Texte: „Ramen zusammenstellen", „Dein Ramen", „Noch ein Ramen"; „der Ramen",
   also keinen/deinen/einen). **Code-Bezeichner bleiben `bowl`** (`bowlPrice`,
   `RECOMMENDED_BOWLS`, DB-Typ `bowl`, Asset-Pfade) — nur sichtbarer Text ist „Ramen".

---

## 4. Ordnerstruktur

```
src/
  main.jsx
  App.jsx                  # Router / aktueller Screen; Kiosk-Hooks; Bowl-Flug Start->Builder (Handoff-Overlay)
  styles/
    theme.css              # Design-Tokens + Animationen (Single Source of Truth)
  i18n/
    de.js / en.js          # UI-Texte (Menü-Namen/-Beschreibungen bleiben in menu.js, dort jetzt zweisprachig als { de, en })
    index.js               # t() (UI-Texte), tx() (löst { de, en }-Menüfelder in die aktuelle Sprache auf), Sprachwechsel
  config/
    menu.js                # alle Zutaten, Getränke, Beilagen + Preise + RECOMMENDED_BOWLS (Daten); sceneVariants je Topping.
                           # Sichtbare Texte sind zweisprachig ({ de, en }, via tx()); Varianten/Modifier tragen IDs (Kennung) + label:{de,en} (Anzeige);
                           # allergens sind IDs aus ALLERGENS, diet ist 'vegan' | 'vegetarian' (fehlt bei Fleisch/Fisch);
                           # itemDisplayName() liefert den lokalisierten Namen bestellter/Warenkorb-Positionen
    steps.js               # die 5 Bau-Schritte als Daten
    orderStatus.js         # Status-Reihenfolge + Farb-Token (StatusScreen, Küche, Header-Punkt)
    sceneConfig.js         # Positions-/Look-Werte der Bowl-Szene (inkl. ANCHORS: Anrichte-Karte, LAYER_RO)
  services/
    supabaseClient.js      # erstellt den Client aus ENV-Variablen
    dataService.js         # EINZIGE Stelle für Lesen/Schreiben (Bestellungen, Status)
  state/
    orderStore.js          # Bau-Zustand (broth, noodle, protein, toppings, finish) + Warenkorb
  hooks/
    useFullscreen.js       # Vollbild an/aus + isSupported (fehlt auf Apple); Logo-Langdruck
    useDisablePullToRefresh.js  # unterbindet die native Refresh-Geste (Kiosk)
  scene/
    BowlScene.jsx          # R3F-Canvas, nur Props (fürs Lab überschreibbar: brothGeom = Brühen-Geometrie, anchorOverrides = Zutaten-Anker, submerge = Abtauch-Werte)
    heroCompanions.js      # Platzierung der Status-Begleiter (HERO_LAYOUT + layoutCompanions/companionWidth); geteilt Status ↔ Scene-Lab
  components/
    Stage.jsx              # App-Rahmen: füllt das Fenster (fluid, Querformat-optimiert)
    Header.jsx             # Logo (Tipp → Start, 3s Langdruck → Vollbild), Kellner rufen, Sprache, Bestellstatus (Live-Punkt), Warenkorb
    Breadcrumb.jsx         # Brühe > Nudeln > ... (Haken auf erledigten Schritten, hohler Punkt auf offenen Pflichtschritten)
    Button.jsx             # Größen: sm | md | lg, Varianten: primary | ghost | dark
    AddCard.jsx            # gestrichelte "Hinzufügen"-Karte (Warenkorb: Noch ein Ramen; Status: Nächste Runde)
    SteamPuffs.jsx         # CSS-Dampf (DOM-Pendant zum Szenen-Dampf) über der Start-Schüssel
    OptionCard.jsx         # eine Auswahl-Karte (Bild, Diet-Icon, "i"-Info als Popover mit Beschreibung + Diet + Allergenen)
    ModifierGroup.jsx      # segmentierte Auswahl mit gleitender Pill (Härte, Schärfe, ...)
    QuantityStepper.jsx    # − 0 + für Toppings
    BowlThumbnail.jsx      # Mini-Bowl (Brühen-Karten, Warenkorb/Status/Bezahlen)
    ItemThumbnail.jsx      # Produktbild für Getränke/Beilagen (Warenkorb/Status/Bezahlen)
    ...
  screens/
    StartScreen.jsx        # zwei Spalten: links CTA/Getränke/Empfehlungen, rechts die Schüssel (Flug-Start)
    BuilderScreen.jsx      # rendert je Schritt datengesteuert (Filmstreifen-Übergang); data-scene-slot = Flug-Ziel
    OverviewScreen.jsx
    CartScreen.jsx
    StatusScreen.jsx
    PayScreen.jsx
    KitchenScreen.jsx      # Küchen-Ansicht: Status ändern (löst Live-Update aus)
    SceneLabScreen.jsx     # Dev-Tool (?ansicht=lab): Brühe, Nudeln, Protein, Toppings + Status-Komposition live per Regler tunen
    DesignLabPanel.jsx     # Dev-Tool (?ansicht=design): schwebendes Panel über der echten App, überschreibt live die Token-CSS-Variablen (Fonts, Radien, Farben)
    labControls.jsx        # geteilte Dev-Bausteine (Slider, Toggle, ValueBox) für Scene-Lab und Design-Lab
public/
  manifest.json / icon.svg      # PWA (display fullscreen, orientation landscape) + App-Icon
  assets/<kategorie>/<id>.png   # Dateiname == Options-id; Varianten: <id>-<varianten-id>.png (Varianten-id aus menu.js);
                                # Toppings zusätzlich Mengen-Variante <id>-x2.png (vollerer Haufen)
docs/
  asset-spec.md                 # Look-/Naming-Spec der Zutaten-PNGs (nicht deployt)
```

---

## 5. Design-System — konkret

- Farben/Schrift/Radien: siehe `theme.css`. Immer die Token-Utilities nutzen.
- **Display-Schrift** (`font-display`) ist **Dela Gothic One** (nur ein Gewicht 400, die
  Fette steckt in der Glyphenform). Sie trägt Überschriften **und Produkt-Namen auf Karten**
  (`OptionCard`-Name, Empfehlungs-Karten-Bowl-Name, „Beliebt bei uns"-Label). Beschreibungen,
  Preise und alle Fließtexte bleiben im UI-Font (`font-sans`, Inter). Auf `font-display`-Elementen
  **keine** Gewichts-Utility (`font-bold`/`-semibold`) setzen — Dela ist von sich aus fett,
  synthetisches Bold verzerrt sie (`font-synthesis: none` sichert h1–h3 ab). Beide Fonts sind
  **selbst gehostet** (kein Google-CDN, DSGVO): woff2 in `public/fonts/`, `@font-face` in
  `theme.css` (nur Subsets latin + latin-ext, Lizenz SIL OFL liegt daneben).
- **Button:** eine Komponente mit Prop `size` (`sm`/`md`/`lg`) und `variant`
  (`primary` = gefülltes Tare-Rot, `ghost` = umrandet, `dark` = gefüllt ink-dunkel
  für ruhige, sichtbare Aktionen wie Bezahlen). Die Größen sind **im Button**
  definiert; global ändern heißt hier ändern.
- **Kategorie-Farbe pro Schritt:** jeder Bau-Schritt trägt seine Akzentfarbe
  (`broth`/`noodle`/`protein`/`topping`/`finish`) z. B. im Breadcrumb und in aktiven Zuständen,
  damit der Gast farblich sieht, wo er ist. Im Builder trägt der **rechte Bereich** die
  Schritt-Farbe zusätzlich als leise Raum-Tönung (`.step-room` in `theme.css`, die Komponente
  setzt nur `--step-accent`, Mischung und Überblendung leben im Token), und die
  Schritt-Überschrift bekommt einen Akzent-Unterstrich in voller Kategorie-Farbe (statt des
  früheren kleinen Farbpunkts).
- Nur eine laute Aktionsfarbe pro Screen (`primary`). Alles andere bleibt neutral/ruhig.
- **Bilder auf Auswahl-Karten:** `OptionCard` zeigt automatisch das Bild
  `/assets/<kategorie>/<id>.png` (gilt auch für `drink`/`side` im Warenkorb).
  Fehlt die Datei, blendet sich der Bildbereich still aus (kein kaputtes Icon).
  Getränke/Beilagen mit Varianten zeigen das Bild der aktiven Variante
  (`<id>-<varianten-id>.png`, gebaut aus der **Varianten-id**, nicht aus dem sichtbaren
  Text) und fallen aufs Produktbild zurück, wenn es fehlt.
  **Ausnahme Brühen:** die flache Brühen-Scheibe sieht allein komisch aus, deshalb
  zeigen Brühen-Karten die Brühe komponiert **in der Schüssel** (`BowlThumbnail`
  über die `visual`-Prop der `OptionCard`).
- **Produktbilder in der Rechnung:** In Warenkorb/Status/Bezahlen rendern Getränke
  und Beilagen ihr Produktbild über `ItemThumbnail` (Gegenstück zu `BowlThumbnail`
  bei Bowls). Aufgelöst wird über die **IDs** (Warenkorb-Zeile: `refId`/`variant`,
  bestellte Position: `config.refId`/`config.variant`); das Zerlegen des deutschen
  Namens ist nur noch der Fallback für Alt-Zeilen ohne diese Referenzen.
- **OptionCard „i"-Info:** öffnet ein am Button verankertes Popover (per Portal an
  `document.body`, feste lesbare Breite) mit Item-Name als Überschrift plus Beschreibung,
  nicht mehr an die Kartenbreite gebunden. Darunter, wenn die Daten es hergeben, zwei
  ruhige Zeilen: die Diet-Angabe (Vegan/Vegetarisch) und „Enthält: …" (Allergene aus
  `ALLERGENS`). Ein **leises Diet-Icon** (`Vegan`/`Leaf` in `text-success`) steht zusätzlich
  neben dem Namen auf der Karte, nie in der Aktionsfarbe.
- **Animationen** leben als Tokens/Keyframes in `theme.css` (`animate-*`): u. a.
  `steam`/`float` (Start), `bowl-shadow` (Boden-Schatten der Start-Schüssel, synchron zur
  Schwebe), `nudge-x` (Pfeil am Start-CTA), `pulse-soft` (aktiver Status-Schritt),
  `popover-in` („i"-Info), `fade-in` (Modal-Hintergrund), `cascade-in` (Builder-Eintritt),
  `drag-hint` (Getrennt-Zahlen). Schritt-/Tab-Wechsel in Builder und Warenkorb laufen als
  „Filmstreifen" (alle Panels nebeneinander, Track per `translateX`), die aktive Auswahl in
  `ModifierGroup` gleitet als Pill. **Nach dem Start→Builder-Flug** fahren die Builder-Bausteine
  gestaffelt von unten ein (`.screen-cascade` am Wrapper + `.cascade-item` mit `--cascade-i`,
  gesetzt nur im `revealing`-Zustand des Handoffs — läuft also **nur** beim Flug-Eintritt, nicht
  bei Direkteinstiegen). Bewegung immer über `theme.css`, `motion-reduce` respektieren.
- **Grenze CSS vs. `motion/react`:** statische, deklarative Bewegung (Loops, Eintritte, Hover,
  der Flug Start → Builder) bleibt CSS in `theme.css`. Datengetriebene Übergänge, deren Ablauf
  von Live-Daten abhängt (Status-Choreografie, Runden-Ankunft, Summen-Ticker im `StatusScreen`),
  laufen über `motion` aus `motion/react`. Dort Pflicht: `reducedMotion`-Handling
  (`MotionConfig reducedMotion="user"`, Ticker separat über `useReducedMotion` + `jump()`),
  refetch-sicher via `initial={false}` + Varianten-Labels statt Inline-Keyframes, und nur billige
  Properties (transform, opacity, Farben). **`AnimatePresence` in einem oft rendernden Screen
  gehört in einen memoisierten Baustein**, dessen Vergleich nur die Daten durchlässt, die den
  Wechsel wirklich auslösen (`StatusHeadline`: nur `status`/`color`). Der Status-Hero rendert
  sonst im Sekundentakt neu (`cookNowMs`, Realtime-Refetch, nachziehende Delays), und jeder
  Render im Exit-Fenster unterbricht die laufende Exit-Animation, bis `safeToRemove` nie mehr
  feuert: alte Kinder bleiben dann als Geister montiert (beim Sprachwechsel sogar sichtbar mit
  eingefrorenem fremdsprachigem Text). Sprachwechsel gehört in denselben Baustein über
  `useLanguage()`, damit der Text der **einen** montierten Instanz nachzieht, statt Exit/Enter
  auszulösen.
- **Start → Builder ist ein Shared-Element-Flug (nicht kaputt machen).** Beim Tippen misst
  `StartScreen` das Ist-Rect der Schüssel und übergibt es (`onNavigate('builder', { bowlRect })`).
  `App.jsx` fährt den Übergang: die Schüssel (`bowl_back`) fliegt als Overlay (Klassen
  `.start-handoff*` in `theme.css`) auf die Position/Größe der 3D-Schüssel im Builder. Das Ziel
  wird **live aus dem Builder-Canvas gemessen** (Anker `data-scene-slot` + `sceneConfig`, nicht
  aus einer nachgebauten Formel), darum landet es auf jeder Fenstergröße deckungsgleich. Der
  Builder ist während des Flugs unsichtbar und blendet erst **nach der Landung** ein (Crossfade),
  sobald die Szene ihren ersten Frame gemalt hat (`onReady` aus `BowlScene`). `motion-reduce`
  überspringt den Flug. Am Flug-/Handoff-Code (`App.jsx`, `.start-handoff*`) nur mit Bedacht ändern.

---

## 6. Datenmodell (Supabase)

Nur das **Dynamische** kommt in die Datenbank. **Menü & Preise bleiben in `config/menu.js`.**

- `orders`: `id`, `session_id` (Tisch/Gerät), `status`
  (`aufgenommen` | `in_zubereitung` | `fertig`), `total`, `paid` (bool), `created_at`.
- `order_items`: `id`, `order_id`, `type` (`bowl` | `drink` | `side`), `name`, `price`,
  `config` (JSON; bei Bowls: broth, noodle+hardness, protein, toppings[], finish, alles als IDs;
  bei Getränken/Beilagen: `{ refId, variant }`, also Menü-id plus Varianten-id).
  **`name` ist bewusst der stabile deutsche String** (Küche liest ihn, Fallback für Alt-Zeilen)
  und **nie** die Gast-Anzeige: die läuft über `itemDisplayName(item)` und lokalisiert live aus
  `config`. Sonst friert die Sprache der Bestellzeit die ganze Rechnung ein.
- Optional später: `waiter_calls` (`id`, `session_id`, `created_at`), damit „Kellner rufen"
  beim Personal aufpoppt.

**Live-Status:** Das Kunden-Tablet abonniert seine `order` per Supabase-**Realtime**.
Die `KitchenScreen`-Ansicht ändert den `status`; das Tablet aktualisiert sich automatisch.
Unter der Status-Headline steht eine ruhige **ETA-Zeile** (`StatusScreen`, `etaText`):
geschätzte Restzeit ab `created_at` (`PREP_ESTIMATE_MIN`, minütlicher Ticker), „gleich
fertig" kurz vor Schluss, bei `fertig` ein Gruß. Nur eine Schätzung, kein exakter Countdown.

**Auto-Simulation der Küche (Präsentation):** Damit die App ohne Wechsel in die
Küchen-Ansicht vorführbar ist, wandert jede neue Bestellung nach dem Absenden
automatisch weiter (`aufgenommen` → `in_zubereitung` nach 5s → `fertig` nach 25s;
das Zubereitungs-Fenster gibt der Koch-Choreografie im Status-Hero Zeit, alle
Zutaten fallen zu lassen).
Das läuft ausschließlich in `dataService.js` (`simulateKitchen`, Timing in `SIM_STEPS`)
und **immer** über `setOrderStatus` — also exakt der Küchen-Pfad, inklusive Realtime-/
Demo-Update beim Kunden. Die Küche bleibt voll funktionsfähig und kann jederzeit manuell
vorspringen; die Simulation prüft vor jedem Schritt den Ist-Status und setzt **nur vorwärts**,
überschreibt einen manuellen Sprung also nie zurück. Im Demo-Modus (ohne Supabase) treiben
dieselben Timer den Status; die Screens ziehen über einen lokalen Listener (`demoListeners`)
nach, den `submitOrder`/`setOrderStatus` benachrichtigen.

**Sicherheit:** ENV-Variablen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) in `.env`,
**niemals** committen. Row-Level-Security-Policies bewusst setzen (öffentliches Tablet!) —
kurz mit dem Menschen abstimmen, bevor Policies scharf gestellt werden.

---

## 7. Bowl-Szene — Anbindung

Die Technik ist ein 2.5D-„Papier-Diorama" aus flachen PNGs (siehe separate Notizen
`TestApp.md`): Layer-Sandwich per `renderOrder`, orthografische Kamera (1 Welt-Einheit ≈ 1 px),
Schüssel als zwei PNGs (`bowl_back` + `bowl_front`), Wasserlinien-Shader fürs Eintauchen,
Ripple beim Aufprall, Fall über unterdämpfte `@react-spring/three`-Feder.
**Alle Tuning-Werte in `config/sceneConfig.js`.** Fehlende Assets → prozeduraler
Platzhalter (Farb-Blob aus `sceneColor`), nichts crasht. **Ausnahme Brühe:** die
Brühen-Ebene rendert ohne geladenes PNG **transparent** (kein Farb-Blob), damit
beim kurzen Laden kein Platzhalter „reinblitzt"; `sceneColor` der Brühen tönt nur
noch untergetauchte Zutaten + DOM-Thumbnails und ist an die PNG-Farbe angeglichen.
**Die Wasserlinie ist geneigt, nicht waagerecht.** Die Brühen-Oberfläche ist eine
Ellipse (geneigte Ebene); im 2.5D-Bild heißt „weiter hinten" = „höher". Eine einzige
waagerechte Linie würde hintere Zutaten zu wenig und vordere zu stark eintauchen.
Darum bekommt jede Zutat ihre eigene Wasserlinie über `waterlineFor(ankerY)`
(`sceneConfig.js`, gedreht um `WATERLINE_Y` per `WATERLINE_TILT`: 0 = flach für alle,
1 = Schnitt auf eigener Ankerhöhe, >1 = hinten zusätzlich tiefer).
Die Brühen-Oberfläche (`BROTH_CY/RX/RY`) ist ans Seitenverhältnis der Brühen-PNGs
(~1.83:1) getunt, damit das Oval die Schüssel füllt statt flachgestaucht zu wirken.
Die Schüssel steht auf einer weichen **Boden-Schatten-Ellipse** (Szene:
`GroundShadow`-Mesh; Start-Screen und Thumbnails: CSS/DOM-Pendant), damit sie nicht schwebt.

**Datengetriebene Szenen-Choreografie** (alle Werte in `sceneConfig.js`, clock-getrieben
in `useFrame` statt Timer; `scene/reducedMotion.js` schaltet sie bei
`prefers-reduced-motion` instant): Die **erste** Brühe in leerer Bowl **füllt sich von
unten** (Oberflächen-Pegel steigt aus der Tiefe und wächst, `FILL_*`; Begleit-Ripples
gedämpft über `FILL_RIPPLE_STRENGTH`). Jeder **Brühen-Wechsel mit Zutaten** ist ein
weicher Farb-/Textur-**Crossfade** (`BLEND_DURATION`, kein Neu-Füllen), die Zutaten
bleiben liegen. Eine **entfernte Zutat versinkt** in der Brühe (`useTransition`-Leave →
`exitT`, `SINK_*`: absinken + Submerge-Deckel auf + ausblenden; ohne Brühe: Schrumpfen).
Bleibt bewusst bei `@react-spring/three` (nicht `motion`, siehe §5-Grenze).

**Platzierung = Anrichte-Karte, keine Zufalls-/Spiral-Streuung.** Jede Zutat hat
einen **festen Anker** pro `id` in `sceneConfig.js` (`ANCHORS`, Fallback pro Kategorie
`ANCHOR_DEFAULT`) — komponiert wie vom Koch angerichtet, und jeder Anker sieht auch
allein gut aus. Position = f(id): Bestands-Zutaten bewegen sich **nie**, wenn etwas
dazukommt. Ein Anker trägt neben `x/y/scale` optional `rot` (Drehung in der Bildebene)
und `stretch` (Höhen-Streckung); Nudeln, Protein und alle Toppings haben eigene
kuratierte Einträge. Getunt wird das **im Scene-Lab** (`?ansicht=lab`, je Sorte, mit
Kontext-Zutaten), das die Werte über die optionale `anchorOverrides`-Prop von
`BowlScene` an `composeBowlItems`/`placeIngredient` durchreicht (ohne Prop identisch
zum Normalbetrieb). Zutaten sind **schattenlos** (kein Kontaktschatten mehr in der
Szene; nur der Boden-Schatten unter der ganzen Schüssel bleibt).
Mengen jenseits des Bild-Assets werden über deterministische
**Satelliten-Offsets** (im Anker) zu einem volleren Haufen gestapelt. Ein Topping
kann ein **Mengen-Varianten-Asset** `-x2.png` deklarieren (`sceneVariants` in
`menu.js`, deklarativ, kein Laufzeit-Probing); die Leiter wählt das höchste
deklarierte `≤ qty`, den Rest übernehmen Satelliten. Beim Mengen-/Varianten-Wechsel
plopt das Haupt-Item kurz (**Mini-Plop**, `PLOP_DROP`) und der Ripple feuert erneut.
Beide Renderpfade (WebGL `BowlScene`/`Ingredient3D` **und** DOM `BowlThumbnail`)
teilen `composeBowlItems`, die Ebenen-Map `LAYER_RO` (inkl. `back` für stehendes
Nori) und dieselbe Fallback-Leiter (`-x2` → Basis → Farb-Blob) — ein Look überall.
Asset-Anforderungen (Look, Naming, Bedarfsliste): siehe `docs/asset-spec.md`.

Der **Dampf** (`Steam`) erscheint nur, wenn eine **Brühe** gewählt ist — die leere Schüssel
dampft nicht. (Die Start-Schüssel zeigt ihren eigenen CSS-Dampf, unabhängig von der
Szene: Komponente `SteamPuffs`, bei reduced motion unsichtbar. Der Status-Hero nutzt
die echte Szene und damit deren Dampf.)

---

## 8. Bestätigte Produkt-Entscheidungen

- **Start:** zwei Spalten (Querformat). **Rechts** die leere, dampfende Schüssel (`bowl_back`),
  groß und klickbar. **Links** die Aktions-Spalte von laut nach leise: Haupt-CTA
  „Ramen zusammenstellen" (**reiner Text, kein Hintergrund/Rand**: die Wörter untereinander,
  groß, im Tare-Rot, mit dezent wippendem Pfeil `nudge-x`), dann „Nur Getränke &amp; Beilagen" (ghost), dann 1–2
  Empfehlungs-Karten (fertige Bowls aus `RECOMMENDED_BOWLS` in `menu.js`: Mini-Bowl, Name,
  Zutaten, Preis via `bowlPrice`). Schüssel, Haupt-CTA und der Hintergrund lösen alle
  **denselben Flug** in den Builder aus (siehe §5); die anderen Elemente stoppen die
  Propagation. **Empfehlungs-Karten sind der Schnellstart für Unentschlossene:** ein Tipp
  lädt die fertige Bowl in den Bau-Zustand (`loadBowl` im `orderStore`, Config kopiert,
  `maxStepIndex` auf den letzten Schritt) und führt auf die **Übersicht** (dort prüfen, pro
  Schritt ändern oder in den Warenkorb legen) — bewusst nicht direkt in den Warenkorb, damit
  ein Bestätigungs- und Anpass-Moment bleibt. Sie lösen **nicht** den Start→Builder-Flug aus.
  Kein Hinweistext (selbsterklärend durch den CTA). Die zwei „Noch ein Ramen"-Wege (Warenkorb,
  Nachbestellen im Status) führen weiter in den **Builder** und zeigen bewusst **keine**
  Empfehlungen (die sind Erst-Entscheidungs-Hilfe, kein Wiederhol-Weg).
- **Toppings:** insgesamt **4 Stück** über alle Toppings zusammen — die Mengen zählen
  gemeinsam (z. B. 4× Mais, oder 2× Mais + 2× Ajitama).
  (`toppings = { id: menge }`, Regel: **Summe aller Mengen ≤ 4**.)
- **Allergene & Veggie-Kennzeichnung sind Daten** (aus dem Usertest-Feedback, und Allergene
  sind in der Gastronomie ohnehin Pflicht): jedes essbare Item trägt `allergens` (IDs aus
  `ALLERGENS`, leeres Array wenn keine) und optional `diet` (`vegan` | `vegetarian`). Vegan
  impliziert vegetarisch, dann **nur** `vegan` setzen; Fleisch/Fisch bekommen **kein** `diet`.
  Anzeige: leises Icon auf der Karte, Details im „i"-Popover (§5). Die Zuordnungen sind
  restaurantabhängig, bei neuen Items also nachfragen statt raten (§10).
- **Backend:** **Supabase von Anfang an**, aber immer hinter `dataService` gekapselt.
- **Kellner rufen / Sprache / Warenkorb:** global im Header.

---

## 9. Bestell-Modell (wichtig — hier passieren Denkfehler)

Zwei Ebenen, die **nie** vermischt werden dürfen:

- **Warenkorb (Entwurf):** was gerade zusammengestellt, aber noch **nicht** abgeschickt ist.
  Sammelt Bowl(s), Getränke, Beilagen der aktuellen Runde. Jederzeit über den Header als
  kleine Übersicht auszuklappen.
- **Rechnung / Tab:** alles, was diese Session schon **bestellt** wurde. Wächst mit jeder Bestellung.

Ablauf: Bowl bauen → in den Warenkorb → („noch eine Bowl" / „Getränke &amp; Beilagen" / **Bestellen**).
„Bestellen" schickt den Warenkorb an die Küche, fügt ihn der Rechnung hinzu und **leert den
Warenkorb** für die nächste Runde. Danach zeigt der Status, dass zubereitet wird.

**Der Status-Screen erzählt das Runden-Modell strukturell** (Mobbin-Abgleich + Usertest,
Entscheidung im Chat vom 10.07.2026, keine Erklärtexte): Die **Nachbestell-Weiche ist an den
Tracker angedockt** (im Hero-Block, warme Fläche `bg-gold/10`, Titel „Noch Hunger? Bestell
jederzeit nach") statt als abgetrennter Fußbereich — „dein Essen kommt" und „du kannst mehr
bestellen" lesen sich als eine Botschaft. Der Hero ist eine **lebende Koch-Szene**
(echte `BowlScene` der ersten Bowl der Runde): „aufgenommen" zeigt die leere Schüssel,
ab „in Zubereitung" füllt sich die Brühe und die bestellten Zutaten fallen nacheinander,
„fertig" steht komplett; der Dampf kommt aus der Szene, sobald Brühe drin ist. Timing
(`COOK_START_S`, `COOK_STEP_S`) im `StatusScreen`; Zeitbasis ist `created_at`
(deterministisch, Wiederbesuch zeigt den Zwischenstand statt neu zu kochen), der
**Status hat Vorrang** („fertig" zeigt immer alles). Um die Hero-Bowl herum ploppen die
**Begleiter der Runde** als **große, eng überlappende Menü-Komposition** ein (Menü-Foto):
weitere Bowls je als `BowlThumbnail`, dann Getränke/Beilagen als **Sorten** (dedupliziert,
2× Cola = eine Cola). Die PNGs sind ~1.83:1-Rahmen mit zentriertem Objekt + gebackenem
Schatten; darum bekommen Begleiter **breite Boxen** (`SIDE_W` für Beilagen, `DRINK_W` für
Getränke, `BOWL_COMPANION_W` für weitere Bowls; einzelne Artikel per `ITEM_W_OVERRIDE`
feinjustiert, gekeyt über stabile IDs: varianten-genau als `<menü-id>-<varianten-id>`
(`matcha-warm`, nur die warme Tasse) oder für alle Varianten als `<menü-id>` (`edamame`)),
damit Glas/Teller in Bowl-nahe Größe
erscheinen (der transparente Rand überlappt harmlos), alles auf einer gemeinsamen Standlinie.
**Alle Platzierungs-/Größen-Werte dieser Komposition liegen in `scene/heroCompanions.js`
(`HERO_LAYOUT`) und die Layout-Funktionen (`layoutCompanions`, `companionWidth`) dort —
geteilt vom `StatusScreen` und vom Scene-Lab (`?ansicht=lab`, Modus „Status-Komposition"),
wo man sie live per Regler tunt.** Die unten genannten Namen (`SIDE_W`, `DRINK_X0` …)
entsprechen den sprechenden `HERO_LAYOUT`-Feldern (`sideW`, `drinkX0`, …).
Platzierung (`layoutCompanions`): **Flanker** (weitere Bowls + Beilagen, Bowls zuerst) füllen
über `flankSlot` die Slots L0, R0, dann nach rechts-außen (R1 …), dann links-außen — die
erste weitere Bowl sitzt links neben der Hero, weitere sammeln sich rechts; äußere Flanker
sitzen etwas höher (`FLANK_RISE`, wirken hinter statt unter). **Getränke** stehen eng
nebeneinander rechts (`DRINK_X0`/`DRINK_SPREAD`, `DRINK_SHIFT` hält 3–4 im Bild) und ragen
hoch (`DRINK_LIFT`); sie liegen **hinter** dem Canvas und ragen hinter Bowl/Beilagen hoch —
steht rechts aber eine weitere **Bowl**, kommen sie nach **vorne** (sichtbar davor,
`DRINK_BOWL_SHIFT`). Begrenzt auf `HERO_COMPANION_LIMIT` (4) — bewusste Veranschaulichung
ohne Erklärtext, die Rechnung rechts zeigt die exakten Mengen. Runden ohne Bowl zeigen nur
die Begleiter als eng zentrierte Reihe (`NOHERO_SPREAD`), ganz ohne Artikel kein Bild. Die Rundenliste **endet mit einer Ghost-Zeile
„+ Nächste Runde"** (geteilte `AddCard`, gleiche gestrichelte Karte wie „Noch ein Ramen" im
Warenkorb → Builder), und über den Bezahl-Buttons steht die kleine Zustands-Zeile
**„Bezahlt wird am Ende"** (Uhr-Icon). Bewusst **kein** „offen/bezahlt"-Schild an der
Rechnung: nach dem Bezahlen resettet die Session, den Gegenzustand sähe nie jemand.
Der **leere Warenkorb nach einer bestellten Runde** sagt „Noch Hunger?" statt „Noch nichts
in dieser Runde" (`cart.emptyAgainTitle`, via `orders.length` im Store) — der geleerte Korb
ist sonst das stärkste falsche „fertig"-Signal. Dazu trägt der **Bestellstatus-Knopf im
Header einen Live-Punkt** in der Status-Farbe der laufenden Runde (pulsiert bis „fertig",
dann ruhig; Farben aus `config/orderStatus.js`, Daten über `dataService`-Subscription im
Header) — die offene Session ist damit auf jedem Screen sichtbar, auch auf dem Start.
Die **linke Hero-Spalte ist ein Scroll-Container** (`min-h-full`-Zentrierung): bei genug
Höhe mittig (iPad/Tablet), bei kurzer Höhe (Handy quer) scrollt sie von oben statt unter
den Header zu laufen — so bleibt der Status auch auf dem Handy im Querformat bedienbar (§3.6).

**Bezahlt wird erst ganz am Ende** (nach dem Essen). Bis dahin kann jederzeit **nachbestellt**
werden (zurück zum Bauen). Die Wahl **Zusammen | Getrennt** steht direkt auf dem **Status-Screen
in der Rechnungs-Spalte, direkt unter der Gesamtsumme** als zwei Buttons (beide bewusst **dunkel gefüllt (Button-Variante dark), gestapelt** — sichtbar unter der Gesamtsumme, aber leiser als das Bestell-Rot, damit der Status-Screen die Geschichte „erst
essen &amp; nachbestellen, gezahlt wird am Ende" erzählt — die laute Zone ist die Nachbestell-Weiche;
Entscheidung im Chat vom 09.07.2026, ersetzt die frühere Doppel-Rot-Ausnahme); es gibt
**keinen** Zwischenscreen mehr. Der `PayScreen` bekommt den Weg als `payMode`-Prop (über
`onNavigate('pay', { payMode })`) und startet direkt: „Zusammen" → gleich der Bezahlart-Schritt
für die ganze Rechnung, „Getrennt" → gleich die Aufteilung. Getrennt funktioniert
**Person-zuerst** (Hauptweg): Person antippen macht sie aktiv (goldener Rahmen), dann weist jeder
Tipp auf eine Rechnungs-Position sie dieser Person zu; nochmal tippen legt sie zurück. Zusätzlich
bleiben der alte Weg (Position vormerken, dann Person antippen) und das Ziehen erhalten. Vor jedem
Zahlvorgang kommt ein eigener **Bezahlart-Schritt (Bar | Karte)**, beim Getrennt-Zahlen pro Person;
die Bezahlart ist nur UI-Zustand, nicht in der Datenbank. Beim Getrennt-Zahlen zeigt eine ruhige
Zustands-Zeile den Fortschritt der Zuordnung („X von Y Positionen zugeordnet", Muster des
Topping-Zählers im Builder), damit sichtbar ist, wann nichts mehr offen ist.

**Der Abschluss ist ein Abschieds-Moment, kein Konfetti** (Mobbin-Abgleich vom 17.07.2026):
Nach dem letzten Zahlvorgang zeigt der `PayScreen` die leere, dampfende Schüssel in derselben
Komposition wie der Start (`bowl_back` + `SteamPuffs` + Boden-Schatten, `animate-float`), dazu
„Danke, bis bald" und „Neuen Tisch starten". Der Wow-Moment der App ist die Schüssel, also
schließt das Ende denselben Bogen, statt eine fremde Feier-Sprache aufzumachen.

Getränke &amp; Beilagen teilen sich einen Screen, aber über einen **Umschalter (Getränke | Beilagen)**
— **keine** lange gemeinsame Scroll-Liste.

## 10. Arbeitsweise

- In **kleinen Schritten** bauen: erst Grundgerüst (Stage, Header, Tokens, Button, Router),
  dann **ein Screen nach dem anderen**. Nach jedem Screen kurz stoppen, damit der Mensch
  visuell testen kann.
- Vor neuem Code prüfen: Gibt es die Komponente/den Token schon? Wiederverwenden statt duplizieren.
- Keine festen Werte einschmuggeln. Keine zweite Datenquelle neben `dataService`.
- Bei Unklarheit im Menü/Flow: nachfragen, nicht raten.
- **Szenen-Werte tunt der Mensch im Scene-Lab** (`?ansicht=lab`, `SceneLabScreen`),
  statt dass Claude blind über Preview-Screenshots iteriert (langsam, teuer): Regler
  an der **echten** Szene für Brühen-Geometrie (`BROTH_CY/RX/RY`), das **Abtauchen**
  der Zutaten (`WATERLINE_Y`/`WATERLINE_TILT`/`WATER_BAND`/`SUBMERGE_TINT`/
  `SUBMERGE_FADE`, im Brühen-Modus — wirkt nur auf Zutaten, also eine einschalten),
  Zutaten-Anker
  (Nudeln/Protein/Toppings: `x/y/scale/rot/stretch` + Größe, je Sorte, mit Kontext)
  und die Status-Komposition (`HERO_LAYOUT`), jeweils mit Werte-Snippet. Das Lab lädt
  die aktuellen Code-Werte, der Mensch schiebt live auf dem Zielgerät und gibt die
  Zahlen durch; Claude trägt sie in `sceneConfig.js` (`ANCHORS`), `menu.js` (Größen)
  bzw. `scene/heroCompanions.js` ein. Beim Übernehmen die **kuratierten `satellites`
  behalten** (Snippet zeigt `ANCHOR_DEFAULT...satellites`, das nur als Platzhalter —
  echte satellites/Nori-Ebene nicht überschreiben). Für Platzierungen also erst das Lab anbieten.
- **Dev-Ansichten über URL-Param** (ohne Gast-Navigation): `?ansicht=kueche` = Küche,
  `?ansicht=lab` = Scene-Lab. Beide früh in `App.jsx` verzweigt.
  `?ansicht=design` = Design-Lab: legt ein schwebendes Panel über die normal
  laufende Gast-App und überschreibt live die Token-CSS-Variablen (Fonts, Radien,
  Farben), mit Werte-Snippet für `theme.css` (kein Early-Return, die App bleibt bedienbar).
- **Assets komprimieren:** neue PNGs vor dem Commit auf max. 1100 px lange Kante +
  optimiertes PNG bringen (Asset-Spec). Kein Tool im Repo — bei Bedarf `sharp`
  temporär mit `npm install sharp --no-save` nutzen (package.json unberührt lassen).

---

## 11. Modell-Routing (gilt für jede Session)

Wenn **Fable** das Hauptmodell ist, arbeitet es als **Orchestrator**, nicht als Coder:

- **Fable = Orchestrator.** Besitzt: Aufgaben-Zerlegung, Orchestrierung, Design-Geschmack
  und die **finale QA jedes delegierten Stücks** (später, noch nicht: Architektur-Entscheidungen).
  Fable schreibt **nie** selbst Feature-Code. Fable läuft auf hohem Denkaufwand,
  eskaliert aber nicht auf xhigh/max.
- **Opus-Subagenten = Implementierung.** Jede Umsetzung geht als eigener Subagent-Auftrag
  raus, mit einem **präzisen, in sich geschlossenen Brief** (Ziel, betroffene Dateien,
  geltende Regeln aus dieser Datei, erwartetes Ergebnis). Pro Aufgabe ein Subagent:
  **parallel**, wenn Aufgaben unabhängig sind, **sequenziell**, wenn sie aufeinander aufbauen.
- **Günstigere Modelle = Fleißarbeit.** Token-hungrige Routinejobs (Computer-Nutzung,
  großflächige Codebase-Analysen) dürfen an günstigere Modelle gehen und berichten zurück.
- Kein delegiertes Ergebnis gilt als fertig, bevor Fable es geprüft hat (Regeln aus
  dieser Datei eingehalten, Build läuft, Verhalten im Preview verifiziert).

---

## 12. PWA / Kiosk (Tablet-Betrieb)

Für den Betrieb als Bestell-Kiosk auf einem Chrome-Tablet:

- **Vollbild ist eine Personal-Geste, kein Gast-Knopf.** Hook `hooks/useFullscreen.js`
  (`isFullscreen`, `isSupported`, `toggle`), ausgelöst per **3-Sekunden-Langdruck aufs
  Yuge-Logo** im Header (`LOGO_HOLD_MS`); ein kurzer Tipp führt weiterhin zum Start.
  Bewusst versteckt: Vollbild braucht nur das Personal beim Einrichten, der Gast nie —
  darum kein Knopf im Gast-Header (und kein Ein-Punkt-Menü). Kein Hinweistext, der
  Vollbild-Wechsel ist das Feedback.
  **Apple:** Auf iPhone/iPad gibt es die Fullscreen-API für normale Elemente **nicht**
  (nur `<video>`); da Apple jeden Browser auf iOS/iPadOS auf WebKit zwingt, fehlt sie
  dort auch in Chrome — `webkitRequestFullscreen` gibt es nur auf macOS-Safari. Darum
  `isSupported`: fehlt die API, wird die Geste gar nicht erst scharf gemacht (nichts
  Totes anbieten). Auf Apple führt **nur** „Zum Home-Bildschirm hinzufügen" (PWA,
  `display: fullscreen` + `apple-mobile-web-app-capable`) zu echtem Vollbild.
- **Manifest:** `public/manifest.json` (`display: fullscreen`, `orientation: landscape`
  — bewusst Querformat, passend zu Regel §3.6), App-Icon `public/icon.svg`. In `index.html`
  verlinkt inkl. Kiosk-Viewport (`user-scalable=no`) und `theme-color`.
- **Kein Pull-to-Refresh / kein Überziehen:** `overscroll-behavior: none` plus volle
  Höhe/Breite im `theme.css`-Base-Layer, zusätzlich Hook `useDisablePullToRefresh` (blockt
  die Refresh-Geste, ohne das Scrollen in Listen zu stören).
- **Kein Service-Worker:** die installierte App lädt bei jedem Start frisch vom Server,
  Updates erscheinen also automatisch beim nächsten Öffnen nach einem Push (kein Offline-Cache).
