import uiStrings from '../data/uiStrings.json' with { type: 'json' };
import { getLang, pickBilingual } from './locale.js';

/**
 * @param {string} key dot path e.g. menu.start
 */
export function t(key) {
  const parts = key.split('.');
  /** @type {unknown} */
  let node = uiStrings;
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return key;
    node = /** @type {Record<string, unknown>} */ (node)[part];
  }
  if (node && typeof node === 'object' && ('vi' in node || 'en' in node)) {
    return pickBilingual(/** @type {{ vi?: string, en?: string }} */ (node));
  }
  if (typeof node === 'string') return node;
  return key;
}

/**
 * @param {string} key
 * @param {Record<string, string|number>} vars
 */
export function tFmt(key, vars) {
  let out = t(key);
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}

export { getLang, pickBilingual };
