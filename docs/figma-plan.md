# Yuge in Figma bauen (Design-System + Screens)

Bauplan für die Umsetzung des gecodeten Projekts in Figma. Quelle der Wahrheit
bleibt der Code (`src/styles/theme.css`, `src/components/`, `src/screens/`).
Reihenfolge: erst Variablen (Tokens), dann Components, dann Screens.

## Ziel-Datei
- Figma-Datei "Hifi": https://www.figma.com/design/byfTLTUYhmLyzitMUBSMp0/Hifi
- In der Figma-Desktop-App geoeffnet lassen, waehrend gebaut wird.

## Schritt 1: Variablen (aus theme.css)

### Farben
Neutral:
- bg #FBF7F1
- surface #FFFFFF
- line #EAE0D5
- ink-400 #8B8078
- ink-600 #4A413A
- ink-900 #1C1714

Marke & Akzent:
- primary #E4483D
- primary-700 #C4372E
- gold #F2B33D
- nori #2E5D4B

Kategorie-Akzente (pro Bau-Schritt):
- broth #B5793F
- noodle #E0B15C
- protein #C65B52
- topping #4F7A5E
- finish #E0762C

Status:
- success #3B8A5C
- warning #E4A11B
- error #C0392B

### Typografie (Text-Styles)
Fonts: "Bricolage Grotesque" (Display/Headings, 600-800), "Inter" (UI/Text, 400/500/600)
- display: 28-56px fluid (Basis ~56px), line 1.02, weight 800
- h1: 32px, line 1.1, weight 700
- h2: 24px, line 1.15, weight 700
- body-lg: 18px, line 1.5
- body: 16px, line 1.5
- small: 14px, line 1.45
- caption: 12px, line 1.4

### Radien
- sm 8, md 12, lg 16, xl 24

## Schritt 2: Components (aus src/components/)
An Variablen binden, nicht fest verdrahten.
- Button: size sm|md|lg, variant primary|ghost|dark
- OptionCard (Bild, i-Info-Popover)
- ModifierGroup (segmentiert, gleitende Pill)
- QuantityStepper (- 0 +)
- AddCard (gestrichelte Hinzufuegen-Karte)
- Breadcrumb (Schritte mit Haken/offenem Punkt, Kategorie-Farbe)
- BowlThumbnail (Mini-Bowl)
- ItemThumbnail (Produktbild Getraenke/Beilagen)
- Header (Logo, Vollbild, Kellner rufen, Sprache, Bestellstatus mit Live-Punkt, Warenkorb)
- Stage (App-Rahmen)

## Schritt 3: Screens (aus src/screens/)
Aus den Components oben zusammensetzen:
- StartScreen (zwei Spalten: links CTA/Getraenke/Empfehlungen, rechts Schuessel)
- BuilderScreen (datengesteuert je Schritt)
- OverviewScreen
- CartScreen (Umschalter Getraenke|Beilagen)
- StatusScreen (Hero-Szene, Tracker, Nachbestell-Weiche, Rechnung, Bezahlen)
- PayScreen (Zusammen|Getrennt, Bar|Karte)
- KitchenScreen

## Einschraenkung
Die 3D-Bowl-Szene (three.js) und PNG-Assets werden in Figma als Platzhalter/Bilder
dargestellt, nicht als lebende 3D-Szene. Der Rest wird 1:1 aufgebaut.
