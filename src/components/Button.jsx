// Der EINE Button der App. Größen & Varianten leben nur hier,
// „alle Buttons kleiner" heißt: diese Datei ändern, keinen Screen.

const sizes = {
  sm: 'px-3 py-1.5 text-small rounded-sm',
  md: 'px-5 py-2.5 text-body rounded-md',
  lg: 'px-7 py-3.5 text-body-lg rounded-lg',
};

const variants = {
  primary: 'bg-primary text-surface hover:bg-primary-700 active:bg-primary-700',
  ghost: 'border border-line bg-transparent text-ink-600 hover:border-ink-400 hover:text-ink-900',
  // dark = ruhige, aber klar sichtbare Aktion (z. B. Bezahlen auf dem Status-Screen);
  // Rot bleibt dem Bestell-Flow vorbehalten. Hover eine Stufe heller.
  dark: 'bg-ink-900 text-surface hover:bg-ink-600 active:bg-ink-600',
};

export default function Button({
  size = 'md',
  variant = 'primary',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type="button"
      className={`inline-flex cursor-pointer select-none items-center justify-center gap-2 font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
