const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { startServer } = require('./helpers/serve');

const root = path.join(__dirname, '..');
const exists = (p) => fs.existsSync(path.join(root, p));

test('le build produit les sept pages avec leurs URL actuelles', () => {
  execSync('npx @11ty/eleventy', { cwd: root, stdio: 'pipe' });
  for (const p of ['index', 'simulateur', 'ordonnance', 'cgu', 'confidentialite', 'feedback', 'reset-password']) {
    assert.ok(exists(`_site/${p}.html`), `_site/${p}.html manquant`);
  }
});

test('les fichiers statiques sont copiés', () => {
  for (const p of ['download.js', 'dispositifs.json', 'images/logo-ordonnance.png',
    'vendor/html2canvas-1.4.1.min.js', 'vendor/jspdf-2.5.1.umd.min.js']) {
    assert.ok(exists(`_site/${p}`), `_site/${p} manquant`);
  }
});

test('vercel.json garde cleanUrls et les redirections', () => {
  const v = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.strictEqual(v.cleanUrls, true);
  for (const source of ['/beta', '/landing']) {
    assert.ok(v.redirects.some((r) => r.source === source && r.destination === '/'), `redirection ${source}`);
  }
  assert.strictEqual(v.buildCommand, 'npx @11ty/eleventy');
  assert.strictEqual(v.outputDirectory, '_site');
});

test('/simulateur et /simulateur.html répondent', async () => {
  const server = await startServer(path.join(root, '_site'));
  try {
    for (const p of ['/simulateur', '/simulateur.html']) {
      const res = await fetch(server.url + p);
      assert.strictEqual(res.status, 200, p);
    }
  } finally {
    await server.close();
  }
});
