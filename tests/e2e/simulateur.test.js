const test = require('node:test');
const assert = require('node:assert');
const { startServer } = require('../helpers/serve');
const { launch } = require('../helpers/browser');

let server, browser;
test.before(async () => { server = await startServer('_site'); browser = await launch(); });
test.after(async () => { await browser.close(); await server.close(); });

async function open() {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto(server.url + '/simulateur');
  return page;
}

test('le formulaire et le résultat sont présents', async () => {
  const page = await open();
  assert.equal(await page.locator('#ca').count(), 1);
  assert.equal(await page.locator('#go').count(), 1);
  assert.equal(await page.locator('#resultats').count(), 1);
  await page.close();
});

test('nav : Simulateur est la page courante', async () => {
  const page = await open();
  assert.equal(await page.locator('a.nav-link[data-nav="simulateur"]').getAttribute('aria-current'), 'page');
  await page.close();
});

test('la barre est masquée à l\'impression', async () => {
  const page = await open();
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.site-header').evaluate((e) => getComputedStyle(e).display), 'none');
  await page.close();
});

test('la mention sur l\'impôt est conservée', async () => {
  const page = await open();
  const text = await page.locator('body').innerText();
  assert.ok(text.includes('Il ne calcule pas l\'impôt sur le revenu'));
  await page.close();
});
