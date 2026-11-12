const test = require('node:test');
const assert = require('node:assert');
const { startServer } = require('../helpers/serve');
const { launch } = require('../helpers/browser');
const { tutoiements } = require('../helpers/tutoiement');

let server, browser;
test.before(async () => { server = await startServer('_site'); browser = await launch(); });
test.after(async () => { await browser.close(); await server.close(); });

test('le pop-up de téléchargement vouvoie (aide Android comprise)', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(server.url + '/');
  await page.locator('.nav-download').click();
  await page.waitForSelector('.dl-overlay.open');
  const text = await page.locator('.dl-card').evaluate((e) => e.textContent);
  assert.ok(text.includes('Remplacare.apk'), 'le texte d\'aide doit être dans le DOM');
  assert.deepEqual(tutoiements(text), []);
  await page.close();
});
