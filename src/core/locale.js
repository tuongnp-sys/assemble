const STORAGE_KEY = 'tretramdot_lang';

/** @type {'vi'|'en'} */
let currentLang = 'vi';

/** @type {Set<(lang: 'vi'|'en') => void>} */
const listeners = new Set();

function loadStoredLang() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'en' || raw === 'vi') return raw;
    }
  } catch {
    /* ignore */
  }
  return 'vi';
}

currentLang = loadStoredLang();

/**
 * @returns {'vi'|'en'}
 */
export function getLang() {
  return currentLang;
}

/**
 * @param {'vi'|'en'} lang
 */
export function setLang(lang) {
  if (lang !== 'vi' && lang !== 'en') return;
  if (lang === currentLang) return;
  currentLang = lang;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang === 'vi' ? 'vi' : 'en';
  }
  for (const fn of listeners) {
    try {
      fn(currentLang);
    } catch (err) {
      console.warn('[i18n] lang listener failed', err);
    }
  }
}

/**
 * @param {(lang: 'vi'|'en') => void} fn
 * @returns {() => void}
 */
export function subscribeLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * @param {{ vi?: string, en?: string }|null|undefined} block
 */
export function pickBilingual(block) {
  if (!block) return '';
  return block[currentLang] ?? block.vi ?? block.en ?? '';
}

/**
 * @param {'vi'|'en'} [lang]
 */
export function toggleLang(lang) {
  if (lang) {
    setLang(lang);
    return;
  }
  setLang(currentLang === 'vi' ? 'en' : 'vi');
}

if (typeof document !== 'undefined') {
  document.documentElement.lang = currentLang === 'vi' ? 'vi' : 'en';
}
