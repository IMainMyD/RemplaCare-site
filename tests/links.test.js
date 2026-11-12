const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SITE = path.join(__dirname, '..', '_site');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
function resolve(urlPath) {
  const base = path.join(SITE, urlPath.replace(/\/+$/, ''));
  return [base, base + '.html', path.join(base, 'index.html')].find(isFile);
}

test('aucun lien ou ressource interne cassé', () => {
  const problems = [];
  for (const file of walk(SITE).filter((f) => f.endsWith('.html'))) {
    const html = fs.readFileSync(file, 'utf8');
    const pagePath = '/' + path.relative(SITE, file).replace(/\\/g, '/');
    const re = /<(?:a|link)\b[^>]*?\shref=["']([^"']*)["']|<(?:script|img|source|iframe)\b[^>]*?\ssrc=["']([^"']*)["']/gi;
    let m;
    while ((m = re.exec(html))) {
      const url = (m[1] ?? m[2]).trim();
      if (!url || /^(mailto:|tel:|javascript:|data:|https?:|\/\/)/i.test(url)) continue;
      const [beforeHash, hash = ''] = url.split('#');
      const clean = beforeHash.split('?')[0];
      let target;
      if (clean === '') target = file;
      else {
        const abs = clean.startsWith('/') ? clean : path.posix.join(path.posix.dirname(pagePath), clean);
        target = resolve(abs);
      }
      if (!target) { problems.push(`${pagePath} -> ${url} (introuvable)`); continue; }
      // #telecharger : déclencheur de la fenêtre « Télécharger » (data-download), pas une ancre de page.
      if (hash === 'telecharger') continue;
      if (hash && target.endsWith('.html')) {
        const id = decodeURIComponent(hash).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const targetHtml = fs.readFileSync(target, 'utf8');
        if (!new RegExp(`\\sid=["']${id}["']`).test(targetHtml)) problems.push(`${pagePath} -> ${url} (ancre absente)`);
      }
    }
  }
  assert.deepEqual(problems, []);
});
