// ============================================================
// Yuge: Mini-i18n
// Komponenten holen Texte nur über t('pfad.zum.text').
// Der Sprach-Umschalter im Header ruft später setLanguage() auf.
// ============================================================

import de from './de';

const languages = { de };
let currentLanguage = 'de';

export function setLanguage(code) {
  if (languages[code]) currentLanguage = code;
}

export function t(key, vars) {
  let value = key
    .split('.')
    .reduce((obj, part) => (obj == null ? undefined : obj[part]), languages[currentLanguage]);
  if (typeof value === 'string' && vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
  }
  return value ?? key;
}
