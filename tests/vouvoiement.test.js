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

const { TU, IMPERATIFS } = require('./helpers/tutoiement');

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

// Chaînes littérales des scripts : un tutoiement y est visible à l'écran (pop-up, etc.).
function litteraux(src) {
  const sansCommentaires = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
  const re = /'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"|`((?:\\.|[^`\\])*)`/g;
  return [...sansCommentaires.matchAll(re)].map((m) => (m[1] ?? m[2] ?? m[3]).replace(/\\'/g, "'"));
}

test('aucun tutoiement dans les chaînes des scripts', () => {
  const racine = path.join(__dirname, '..');
  const fichiers = ['download.js', 'src/assets/js/nav.js', 'src/assets/js/carousel.js', 'src/assets/js/carousel-core.js'];
  const { tutoiements } = require('./helpers/tutoiement');
  const problemes = [];
  for (const f of fichiers) {
    const chaines = litteraux(fs.readFileSync(path.join(racine, f), 'utf8'));
    assert.ok(chaines.length > 0, `${f} : aucune chaîne extraite`);
    for (const c of chaines) for (const p of tutoiements(c)) problemes.push(`${f}: ${p}`);
  }
  assert.deepStrictEqual(problemes, []);
});
