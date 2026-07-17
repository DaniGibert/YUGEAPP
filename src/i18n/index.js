// ============================================================
// Yuge: Mini-i18n
// Komponenten holen Texte nur über t('pfad.zum.text').
// Der Sprach-Umschalter im Header ruft setLanguage() auf; App.jsx abonniert
// die Sprache über useLanguage(), damit die ganze App neu rendert.
// ============================================================

import { useSyncExternalStore } from 'react';
import de from './de';
import en from './en';

const languages = { de, en };
export const LANGUAGE_CODES = Object.keys(languages);

let currentLanguage = 'de';
const listeners = new Set();

export function getLanguage() {
  return currentLanguage;
}

export function setLanguage(code) {
  if (!languages[code] || code === currentLanguage) return;
  currentLanguage = code;
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Re-Render bei Sprachwechsel: einmal in App.jsx aufrufen, das reicht,
// weil nichts memoisiert ist und der ganze Baum unter App neu rendert.
export function useLanguage() {
  return useSyncExternalStore(subscribe, getLanguage);
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

// tx('translatable field'): löst ein zweisprachiges { de, en }-Objekt (z. B. aus
// config/menu.js) in die aktuelle Sprache auf. Liest currentLanguage live wie t(),
// wertet also beim Sprachwechsel korrekt neu aus (der Baum re-rendert über
// useLanguage()). Rückwärtssicher: ist das Feld bereits ein String, kommt es
// unverändert zurück; null/undefined -> ''. Fallback immer auf de.
export function tx(field) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  return field[currentLanguage] ?? field.de ?? '';
}
