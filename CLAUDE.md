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
- **Sprache:** Deutsch. UI-Texte über eine i18n-Struktur vorbereiten (Sprach-Umschalter ist im Header vorgesehen).
- **Bewertungsfokus:** UX/UI & Nutzerführung. Konsistenz, klare Führung und der „Wow"-Moment der Bowl-Szene haben Priorität.

---

## 2. Tech-Stack

- **Vite + React 19**
- **Tailwind CSS v4** über `@tailwindcss/vite`, Tokens in `src/styles/theme.css` (`@theme`)
- **Bowl-Szene:** `three` + `@react-three/fiber` v9 + `@react-three/drei` + `@react-spring/three`
- **Backend:** **Supabase** (Datenbank + Realtime für den Live-Status)
- **State:** ein leichter globaler Store (z. B. `zustand`) für Bau-Zustand + Warenkorb

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
   Ein eigenes Hochkant-Layout ist bewusst **nicht** Teil von v1 — die App bleibt auf
   Handys im Querformat nutzbar.

7. **„Kellner rufen" ist global** und auf **jedem** Screen im Header sichtbar. Ein Klick
   zeigt eine kurze Bestätigung („Ein:e Kellner:in kommt gleich").

8. **Schreibweise & Preise.** Deutsche UI-Texte in Sentence-Case. Preise sind **Ganzzahlen**
   (z. B. `5`, nicht `4,99`).

---

## 4. Ordnerstruktur

```
src/
  main.jsx
  App.jsx                  # Router / aktueller Screen
  styles/
    theme.css              # Design-Tokens (Single Source of Truth)
  config/
    menu.js                # alle Zutaten, Getränke, Beilagen + Preise (Daten)
    steps.js               # die 5 Bau-Schritte als Daten
    sceneConfig.js         # Positions-/Look-Werte der Bowl-Szene
  services/
    supabaseClient.js      # erstellt den Client aus ENV-Variablen
    dataService.js         # EINZIGE Stelle für Lesen/Schreiben (Bestellungen, Status)
  state/
    orderStore.js          # Bau-Zustand (broth, noodle, protein, toppings, finish) + Warenkorb
  scene/
    BowlScene.jsx          # R3F-Canvas, nur Props
  components/
    Stage.jsx              # App-Rahmen: füllt das Fenster (fluid, Querformat-optimiert)
    Header.jsx             # Logo (→ Start), Kellner rufen, Sprache, Bestellstatus, Warenkorb
    Breadcrumb.jsx         # Brühe > Nudeln > ...
    Button.jsx             # Größen: sm | md | lg, Varianten: primary | ghost
    OptionCard.jsx         # eine Auswahl-Karte (mit "i"-Info)
    ModifierGroup.jsx      # segmentierte Auswahl (Härte, Schärfe, ...)
    QuantityStepper.jsx    # − 0 + für Toppings
    ...
  screens/
    StartScreen.jsx
    BuilderScreen.jsx      # rendert je Schritt datengesteuert
    OverviewScreen.jsx
    CartScreen.jsx
    StatusScreen.jsx
    PayScreen.jsx
    KitchenScreen.jsx      # Küchen-Ansicht: Status ändern (löst Live-Update aus)
public/
  assets/<kategorie>/<id>.png   # Dateiname == Options-id
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
  **Ausnahme Brühen:** die flache Brühen-Scheibe sieht allein komisch aus, deshalb
  zeigen Brühen-Karten die Brühe komponiert **in der Schüssel** (`BowlThumbnail`
  über die `visual`-Prop der `OptionCard`).

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
werden (zurück zum Bauen). Beim Bezahlen wird die gesammelte Rechnung per Drag-to-split auf
mehrere Personen verteilt.

Getränke &amp; Beilagen teilen sich einen Screen, aber über einen **Umschalter (Getränke | Beilagen)**
— **keine** lange gemeinsame Scroll-Liste.

## 10. Arbeitsweise

- In **kleinen Schritten** bauen: erst Grundgerüst (Stage, Header, Tokens, Button, Router),
  dann **ein Screen nach dem anderen**. Nach jedem Screen kurz stoppen, damit der Mensch
  visuell testen kann.
- Vor neuem Code prüfen: Gibt es die Komponente/den Token schon? Wiederverwenden statt duplizieren.
- Keine festen Werte einschmuggeln. Keine zweite Datenquelle neben `dataService`.
- Bei Unklarheit im Menü/Flow: nachfragen, nicht raten.
