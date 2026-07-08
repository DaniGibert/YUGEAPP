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

7. **„Kellner rufen" ist global** und auf **jedem** Screen im Header sichtbar. Ein Klick
   zeigt eine kurze Bestätigung („Ein:e Kellner:in kommt gleich").

8. **Schreibweise & Preise.** Deutsche UI-Texte in Sentence-Case. Preise sind **Ganzzahlen**
   (z. B. `5`, nicht `4,99`).

---

## 4. Ordnerstruktur

```
src/
  main.jsx
  App.jsx                  # Router / aktueller Screen; hängt die Kiosk-Hooks ein
  styles/
    theme.css              # Design-Tokens + Animationen (Single Source of Truth)
  i18n/
    de.js / en.js          # UI-Texte (Menü-Namen/-Beschreibungen bleiben in menu.js)
    index.js               # t(), Sprachwechsel
  config/
    menu.js                # alle Zutaten, Getränke, Beilagen + Preise (Daten)
    steps.js               # die 5 Bau-Schritte als Daten
    sceneConfig.js         # Positions-/Look-Werte der Bowl-Szene
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
    Header.jsx             # Logo (→ Start), Vollbild, Kellner rufen, Sprache, Bestellstatus, Warenkorb
    Breadcrumb.jsx         # Brühe > Nudeln > ...
    Button.jsx             # Größen: sm | md | lg, Varianten: primary | ghost
    OptionCard.jsx         # eine Auswahl-Karte (Bild, "i"-Info als verankertes Popover)
    ModifierGroup.jsx      # segmentierte Auswahl mit gleitender Pill (Härte, Schärfe, ...)
    QuantityStepper.jsx    # − 0 + für Toppings
    BowlThumbnail.jsx      # Mini-Bowl (Brühen-Karten, Warenkorb/Status/Bezahlen)
    ItemThumbnail.jsx      # Produktbild für Getränke/Beilagen (Warenkorb/Status/Bezahlen)
    ...
  screens/
    StartScreen.jsx
    BuilderScreen.jsx      # rendert je Schritt datengesteuert (Filmstreifen-Übergang)
    OverviewScreen.jsx
    CartScreen.jsx
    StatusScreen.jsx
    PayScreen.jsx
    KitchenScreen.jsx      # Küchen-Ansicht: Status ändern (löst Live-Update aus)
public/
  manifest.json / icon.svg      # PWA (display fullscreen, orientation landscape) + App-Icon
  assets/<kategorie>/<id>.png   # Dateiname == Options-id; Varianten: <id>-<variante>.png
```

---

## 5. Design-System — konkret

- Farben/Schrift/Radien: siehe `theme.css`. Immer die Token-Utilities nutzen.
- **Button:** eine Komponente mit Prop `size` (`sm`/`md`/`lg`) und `variant`
  (`primary` = gefülltes Tare-Rot, `ghost` = umrandet). Die Größen sind **im Button**
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
  `steam`/`float` (Start), `pulse-soft` (aktiver Status-Schritt), `popover-in` („i"-Info),
  `drag-hint` (Getrennt-Zahlen). Schritt-/Tab-Wechsel in Builder und Warenkorb laufen als
  „Filmstreifen" (alle Panels nebeneinander, Track per `translateX`), die aktive Auswahl in
  `ModifierGroup` gleitet als Pill. Bewegung immer über `theme.css`, `motion-reduce` respektieren.

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

**Sicherheit:** ENV-Variablen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) in `.env`,
**niemals** committen. Row-Level-Security-Policies bewusst setzen (öffentliches Tablet!) —
kurz mit dem Menschen abstimmen, bevor Policies scharf gestellt werden.

---

## 7. Bowl-Szene — Anbindung

Die Technik ist ein 2.5D-„Papier-Diorama" aus flachen PNGs (siehe separate Notizen
`TestApp.md`): Layer-Sandwich per `renderOrder`, orthografische Kamera (1 Welt-Einheit ≈ 1 px),
Schüssel als zwei PNGs (`bowl_back` + `bowl_front`), Wasserlinien-Shader fürs Eintauchen,
Ripple beim Aufprall, Fall über unterdämpfte `@react-spring/three`-Feder, Platzierung per
Goldener-Winkel-Spirale. **Alle Tuning-Werte in `config/sceneConfig.js`.**
Fehlende Assets → prozeduraler Platzhalter, nichts crasht.

---

## 8. Bestätigte Produkt-Entscheidungen

- **Start:** leere Schüssel in Draufsicht, klickbar; steigt sanft **dampfend** auf (Marke „Yuge")
  + Hinweistext „Tippe auf die Schale, um zu starten".
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

**Bezahlt wird erst ganz am Ende** (nach dem Essen). Bis dahin kann jederzeit **nachbestellt**
werden (zurück zum Bauen). Beim Bezahlen: erst die Wahl **Zusammen | Getrennt**. Getrennt
funktioniert **Person-zuerst** (Hauptweg): Person antippen macht sie aktiv (goldener Rahmen),
dann weist jeder Tipp auf eine Rechnungs-Position sie dieser Person zu; nochmal tippen legt
sie zurück. Zusätzlich bleiben der alte Weg (Position vormerken, dann Person antippen) und
das Ziehen erhalten. Vor jedem Zahlvorgang kommt ein eigener **Bezahlart-Schritt (Bar | Karte)**,
beim Getrennt-Zahlen pro Person; die Bezahlart ist nur UI-Zustand, nicht in der Datenbank.

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
