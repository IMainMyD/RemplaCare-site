const test = require('node:test');
const assert = require('node:assert');
const { startServer } = require('../helpers/serve');
const { launch } = require('../helpers/browser');

let server, browser;
test.before(async () => { server = await startServer('_site'); browser = await launch(); });
test.after(async () => { await browser.close(); await server.close(); });

async function open(width = 1280, height = 800) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(server.url + '/ordonnance');
  return page;
}

test('le générateur se charge', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const reponse = page.waitForResponse((r) => r.url().endsWith('/dispositifs.json'));
  await page.goto(server.url + '/ordonnance');
  assert.equal((await reponse).status(), 200);
  assert.equal(await page.locator('#btnPrintTop').count(), 1);
  await page.close();
});

test('l\'en-tête de page colle sous la nouvelle barre', async () => {
  const page = await open();
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(200);
  const haut = await page.locator('.page-header').evaluate((e) => e.getBoundingClientRect().top);
  const barre = await page.locator('.site-header').evaluate((e) => e.getBoundingClientRect().height);
  assert.ok(Math.abs(haut - barre) <= 1, `page-header à ${haut}, barre de ${barre}`);
  await page.close();
});

test('la barre est masquée à l\'impression', async () => {
  const page = await open();
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.site-header').evaluate((e) => getComputedStyle(e).display), 'none');
  assert.equal(await page.locator('.site-footer').evaluate((e) => getComputedStyle(e).display), 'none');
  await page.close();
});

test('Ordonnance est la page courante', async () => {
  const page = await open();
  assert.equal(await page.locator('a.nav-link[data-nav="ordonnance"]').getAttribute('aria-current'), 'page');
  await page.close();
});

test('le pied de page partagé n\'est pas restylé par la page', async () => {
  const mesure = async (chemin) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(server.url + chemin);
    const r = await page.locator('.site-footer .wrap').evaluate((e) => {
      const c = getComputedStyle(e);
      return { maxWidth: c.maxWidth, paddingTop: c.paddingTop };
    });
    await page.close();
    return r;
  };
  assert.deepEqual(await mesure('/ordonnance'), await mesure('/cgu'));
});

test('sur mobile, la barre d\'onglets colle sous l\'en-tête de page', async () => {
  const page = await open(375, 700);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(200);
  const [bas, haut] = await page.evaluate(() => [
    document.querySelector('.page-header').getBoundingClientRect().bottom,
    document.querySelector('.tab-bar').getBoundingClientRect().top,
  ]);
  assert.ok(Math.abs(bas - haut) <= 1, `en-tête bas ${bas}, onglets haut ${haut}`);
  await page.close();
});
