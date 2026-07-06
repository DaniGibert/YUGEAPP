import BowlGraphic from '../components/BowlGraphic';
import Button from '../components/Button';
import { t } from '../i18n';

// Start: leere Schüssel in Draufsicht, dampfend, klickbar (CLAUDE.md §8).
// Die Schüssel skaliert über flex-1 mit der verfügbaren Fensterhöhe.
export default function StartScreen({ onNavigate }) {
  return (
    <section className="flex h-full flex-col items-center justify-center gap-4 py-4">
      <button
        type="button"
        onClick={() => onNavigate?.('builder')}
        aria-label={t('start.hint')}
        className="flex min-h-0 w-full flex-1 cursor-pointer flex-col items-center justify-center gap-4"
      >
        {/* Schüssel-Wrapper: nur die Schüssel reagiert beim Tippen, nicht der ganze Screen */}
        <span className="relative min-h-0 flex-1 transition-transform active:scale-95">
          {/* Dampf: mittig ueber der Schuessel */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-6 flex justify-center gap-5">
            {[0, 0.9, 1.8].map((delay) => (
              <span
                key={delay}
                className="animate-steam h-14 w-3 rounded-full bg-line opacity-0 blur-sm"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </span>

          {/* Schüssel (Draufsicht) */}
          <span className="animate-float block h-full">
            <BowlGraphic className="h-full w-auto max-w-full drop-shadow-xl" />
          </span>
        </span>

        <p className="text-body-lg text-ink-400">{t('start.hint')}</p>
      </button>

      {/* Sekundärpfad für Gäste ohne Bowl-Wunsch: leise, aber auffindbar */}
      <Button size="sm" variant="ghost" onClick={() => onNavigate?.('cart')}>
        {t('start.drinksOnly')}
      </Button>
    </section>
  );
}
