const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { VOUVOIEMENT_PAGES } = require('./helpers/pages');

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

// \b de JS ignore les lettres accentuées (« incomplètes » contiendrait « tes ») : bornes Unicode.
const L = '[\\p{L}\\p{N}_]';
const TU = new RegExp(`(?<!${L})(tu|toi|ton|ta|tes|te)(?!${L})|(?<!${L})t'|-toi(?!${L})|-tu(?!${L})`, 'giu');
const IMPERATIFS = new RegExp(`(?<!${L})(Clique|Installe|Pointe|Importe|Choisis|Saisis|Pose|Regarde|Touche|Essaie|Appuie|Utilise|Télécharge)(?!${L})`, 'gu');

test('aucun tutoiement dans les pages migrées', () => {
  const problemes = [];
  for (const page of VOUVOIEMENT_PAGES) {
    const text = visibleText(fs.readFileSync(path.join(__dirname, '..', '_site', page), 'utf8'));
    for (const re of [TU, IMPERATIFS]) {
      for (const m of text.matchAll(re)) {
        const s = Math.max(0, m.index - 30);
        problemes.push(`${page}: « …${text.slice(s, m.index + 30).replace(/\s+/g, ' ')}… »`);
      }
    }
  }
  assert.deepStrictEqual(problemes, []);
});
