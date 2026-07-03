import { useState } from 'react';
import { useLanguage } from './i18n';
import Stage from './components/Stage';
import Header from './components/Header';
import StartScreen from './screens/StartScreen';
import BuilderScreen from './screens/BuilderScreen';
import OverviewScreen from './screens/OverviewScreen';
import CartScreen from './screens/CartScreen';
import StatusScreen from './screens/StatusScreen';
import PayScreen from './screens/PayScreen';
import KitchenScreen from './screens/KitchenScreen';

// Einfacher State-Router: Screen-Id -> Komponente. Der Gast-Flow navigiert
// sich selbst (Start -> Builder -> Übersicht -> Warenkorb -> Status -> Bezahlen);
// Status & Warenkorb sind zusätzlich global über den Header erreichbar.
const SCREENS = {
  start: StartScreen,
  builder: BuilderScreen,
  overview: OverviewScreen,
  cart: CartScreen,
  status: StatusScreen,
  pay: PayScreen,
  kitchen: KitchenScreen,
};

// Personal-Ansicht: eigenes Gerät öffnet die App mit ?ansicht=kueche,
// dann gibt es nur die Küche, ohne Gast-Navigation.
const KITCHEN_MODE = new URLSearchParams(window.location.search).get('ansicht') === 'kueche';

export default function App() {
  const [screen, setScreen] = useState(KITCHEN_MODE ? 'kitchen' : 'start');
  // Sprachwechsel rendert die ganze App neu (alle t()-Texte aktualisieren sich)
  useLanguage();
  const Screen = SCREENS[screen];
  const navigate = KITCHEN_MODE ? undefined : setScreen;

  return (
    <Stage>
      <Header onNavigate={navigate} minimal={KITCHEN_MODE} />
      <main className="min-h-0 flex-1">
        <Screen onNavigate={navigate} />
      </main>
    </Stage>
  );
}
