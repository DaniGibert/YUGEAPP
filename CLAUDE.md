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
- **Sprache:** Deutsch, mit Englisch als zweiter Sprache. UI-Texte laufen über die i18n-Struktur (`src/i18n/`); ein Sprach-Umschalter (Deutsch/Englisch) ist im Header eingebaut.
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
    de.js / en.js          # UI-Texte (Menü-Namen/-Beschreibungen bleiben in menu.js)
    index.js               # t(), Sprachwechsel
  config/
    menu.js                # alle Zutaten, Getränke, Beilagen + Preise + RECOMMENDED_BOWLS (Daten); sceneVariants je Topping
    steps.js               # die 5 Bau-Schritte als Daten
    orderStatus.js         # Status-Reihenfolge + Farb-Token (StatusScreen, Küche, Header-Punkt)
    sceneConfig.js         # Positions-/Look-Werte der Bowl-Szene (inkl. ANCHORS: Anrichte-Karte, LAYER_RO)
  services/
    supabaseClient.js      # erstellt den Client aus ENV-Variablen
    dataService.js         # EINZIGE Stelle für Lesen/Schreiben (Bestellungen, Status)
  state/
    orderStore.js          # Bau-Zustand (broth, noodle, protein, toppings, finish) + Warenkorb
  hooks/
    useFullscreen.js       # Vollbild an/aus (Fullscreen-API), für den Header-Button
    useDisablePullToRefresh.js  # unterbindet die native Refresh-Geste (Kiosk)
  scene/
    BowlScene.jsx          # R3F-Canvas, nur Props
  components/
    Stage.jsx              # App-Rahmen: füllt das Fenster (fluid, Querformat-optimiert)
    Header.jsx             # Logo (→ Start), Vollbild, Kellner rufen, Sprache, Bestellstatus (Live-Punkt), Warenkorb
    Breadcrumb.jsx         # Brühe > Nudeln > ... (Haken auf erledigten Schritten, hohler Punkt auf offenen Pflichtschritten)
    Button.jsx             # Größen: sm | md | lg, Varianten: primary | ghost | dark
    AddCard.jsx            # gestrichelte "Hinzufügen"-Karte (Warenkorb: Noch ein Ramen; Status: Nächste Runde)
    SteamPuffs.jsx         # CSS-Dampf (DOM-Pendant zum Szenen-Dampf): Start-Schüssel + Status-Hero
    OptionCard.jsx         # eine Auswahl-Karte (Bild, "i"-Info als verankertes Popover)
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
public/
  manifest.json / icon.svg      # PWA (display fullscreen, orientation landscape) + App-Icon
  assets/<kategorie>/<id>.png   # Dateiname == Options-id; Varianten: <id>-<variante>.png;
                                # Toppings zusätzlich Mengen-Variante <id>-x2.png (vollerer Haufen)
docs/
  asset-spec.md                 # Look-/Naming-Spec der Zutaten-PNGs (nicht deployt)
```

---

## 5. Design-System — konkret

- Farben/Schrift/Radien: siehe `theme.css`. Immer die Token-Utilities nutzen.
- **Button:** eine Komponente mit Prop `size` (`sm`/`md`/`lg`) und `variant`
  (`primary` = gefülltes Tare-Rot, `ghost` = umrandet, `dark` = gefüllt ink-dunkel
  für ruhige, sichtbare Aktionen wie Bezahlen). Die Größen sind **im Button**
  definiert; global ändern heißt hier ändern.
- **Kategorie-Farbe pro Schritt:** jeder Bau-Schritt trägt seine Akzentfarbe
  (`broth`/`noodle`/`protein`/`topping`/`finish`) z. B. im Breadcrumb und in aktiven Zuständen,
  damit der Gast farblich sieht, wo er ist.
- Nur eine laute Aktionsfarbe pro Screen (`primary`). Alles andere bleibt neutral/ruhig.
- **Bilder auf Auswahl-Karten:** `OptionCard` zeigt automatisch das Bild
  `/assets/<kategorie>/<id>.png` (gilt auch für `drink`/`side` im Warenkorb).
  Fehlt die Datei, blendet sich der Bildbereich still aus (kein kaputtes Icon).
  Getränke/Beilagen mit Varianten zeigen das Bild der aktiven Variante
  (`<id>-<variante>.png`) und fallen aufs Produktbild zurück, wenn es fehlt.
  **Ausnahme Brühen:** die flache Brühen-Scheibe sieht allein komisch aus, deshalb
  zeigen Brühen-Karten die Brühe komponiert **in der Schüssel** (`BowlThumbnail`
  über die `visual`-Prop der `OptionCard`).
- **Produktbilder in der Rechnung:** In Warenkorb/Status/Bezahlen rendern Getränke
  und Beilagen ihr Produktbild über `ItemThumbnail` (Gegenstück zu `BowlThumbnail`
  bei Bowls); leitet Bild + Variante aus der Warenkorb-Zeile bzw. dem Positions-Namen ab.
- **OptionCard „i"-Info:** öffnet ein am Button verankertes Popover (per Portal an
  `document.body`, feste lesbare Breite) mit Item-Name als Überschrift plus Beschreibung,
  nicht mehr an die Kartenbreite gebunden.
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
  Properties (transform, opacity, Farben).
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
  `config` (JSON — bei Bowls: broth, noodle+hardness, protein, toppings[], finish).
- Optional später: `waiter_calls` (`id`, `session_id`, `created_at`), damit „Kellner rufen"
  beim Personal aufpoppt.

**Live-Status:** Das Kunden-Tablet abonniert seine `order` per Supabase-**Realtime**.
Die `KitchenScreen`-Ansicht ändert den `status`; das Tablet aktualisiert sich automatisch.
Unter der Status-Headline steht eine ruhige **ETA-Zeile** (`StatusScreen`, `etaText`):
geschätzte Restzeit ab `created_at` (`PREP_ESTIMATE_MIN`, minütlicher Ticker), „gleich
fertig" kurz vor Schluss, bei `fertig` ein Gruß. Nur eine Schätzung, kein exakter Countdown.

**Auto-Simulation der Küche (Präsentation):** Damit die App ohne Wechsel in die
Küchen-Ansicht vorführbar ist, wandert jede neue Bestellung nach dem Absenden
automatisch weiter (`aufgenommen` → `in_zubereitung` nach 5s → `fertig` nach 10s).
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
Platzhalter (Farb-Blob aus `sceneColor`), nichts crasht. Die Schüssel steht auf
einer weichen **Boden-Schatten-Ellipse** (Szene: `GroundShadow`-Mesh; Start-Screen
und Thumbnails: CSS/DOM-Pendant), damit sie nicht schwebt.

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
dazukommt. Mengen jenseits des Bild-Assets werden über deterministische
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
dampft nicht. (Start-Schüssel und Status-Hero zeigen ihren eigenen CSS-Dampf, unabhängig
von der Szene: geteilte Komponente `SteamPuffs`, bei reduced motion unsichtbar.)

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
bestellen" lesen sich als eine Botschaft. Der Hero zeigt als **Status-Illustration die
bestellte Bowl der Runde** (`BowlThumbnail` der ersten Bowl; ruhig bei „aufgenommen", ab
„in Zubereitung" mit `SteamPuffs`-Dampf, der bei „fertig" weiterläuft; Runden ohne Bowl
zeigen das `ItemThumbnail` des ersten Artikels ohne Dampf, ganz ohne Artikel gibt es kein
Bild). Die Rundenliste **endet mit einer Ghost-Zeile
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
die Bezahlart ist nur UI-Zustand, nicht in der Datenbank.

Getränke &amp; Beilagen teilen sich einen Screen, aber über einen **Umschalter (Getränke | Beilagen)**
— **keine** lange gemeinsame Scroll-Liste.

## 10. Arbeitsweise

- In **kleinen Schritten** bauen: erst Grundgerüst (Stage, Header, Tokens, Button, Router),
  dann **ein Screen nach dem anderen**. Nach jedem Screen kurz stoppen, damit der Mensch
  visuell testen kann.
- Vor neuem Code prüfen: Gibt es die Komponente/den Token schon? Wiederverwenden statt duplizieren.
- Keine festen Werte einschmuggeln. Keine zweite Datenquelle neben `dataService`.
- Bei Unklarheit im Menü/Flow: nachfragen, nicht raten.

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

- **Vollbild:** Hook `hooks/useFullscreen.js` (Fullscreen-API mit webkit-Fallback),
  umgeschaltet über den Vollbild-Button im Header. Echtes Vollbild im Browser-Tab gibt
  es nur über diesen Button; `display: fullscreen` aus dem Manifest greift erst bei
  installierter PWA (auf iPhone-Safari fehlt die Fullscreen-API ganz).
- **Manifest:** `public/manifest.json` (`display: fullscreen`, `orientation: landscape`
  — bewusst Querformat, passend zu Regel §3.6), App-Icon `public/icon.svg`. In `index.html`
  verlinkt inkl. Kiosk-Viewport (`user-scalable=no`) und `theme-color`.
- **Kein Pull-to-Refresh / kein Überziehen:** `overscroll-behavior: none` plus volle
  Höhe/Breite im `theme.css`-Base-Layer, zusätzlich Hook `useDisablePullToRefresh` (blockt
  die Refresh-Geste, ohne das Scrollen in Listen zu stören).
- **Kein Service-Worker:** die installierte App lädt bei jedem Start frisch vom Server,
  Updates erscheinen also automatisch beim nächsten Öffnen nach einem Push (kein Offline-Cache).
