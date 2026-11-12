// Expressions partagées de détection du tutoiement (\b de JS ignore les lettres accentuées : bornes Unicode).
const L = '[\\p{L}\\p{N}_]';
const TU = new RegExp(`(?<!${L})(tu|toi|ton|ta|tes|te)(?!${L})|(?<!${L})t'|-toi(?!${L})|-tu(?!${L})`, 'giu');
const IMPERATIFS = new RegExp(`(?<!${L})(Clique|Installe|Pointe|Importe|Choisis|Saisis|Pose|Regarde|Touche|Essaie|Appuie|Utilise|Télécharge|Ouvre|Rouvre|Autorise|Active|Lance|Ajoute|Vérifie)(?!${L})`, 'gu');

function tutoiements(text) {
  const out = [];
  for (const re of [TU, IMPERATIFS]) {
    for (const m of text.matchAll(re)) {
      const s = Math.max(0, m.index - 30);
      out.push(`« …${text.slice(s, m.index + 30).replace(/\s+/g, ' ')}… »`);
    }
  }
  return out;
}
module.exports = { TU, IMPERATIFS, tutoiements };
