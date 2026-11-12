const test = require('node:test');
const assert = require('node:assert');
const { startServer } = require('../helpers/serve');
const { launch } = require('../helpers/browser');

let server, browser;
test.before(async () => { server = await startServer('_site'); browser = await launch(); });
test.after(async () => { await browser.close(); await server.close(); });

const PAGES = ['/', '/nos-solutions', '/simulateur', '/ordonnance', '/cgu', '/confidentialite', '/feedback', '/reset-password', '/ressources'];

test('aucun défilement horizontal à 375 px', async () => {
  for (const p of PAGES) {
    const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
    await page.goto(server.url + p);
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert.ok(sw <= iw, `${p} : scrollWidth ${sw} > ${iw}`);
    await page.close();
  }
});

test("la fenêtre Télécharger s'ouvre depuis les trois boutons", async () => {
  for (const [w, sel] of [[1280, '.nav-download'], [1280, '.hero-cta a:first-child'], [1280, '#cta-final [data-download]']]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto(server.url + '/');
    await page.locator(sel).first().scrollIntoViewIfNeeded();
    await page.locator(sel).first().click();
    await page.waitForSelector('.dl-overlay.open');
    await page.close();
  }
});

test('les anciennes URL répondent', async () => {
  for (const p of ['/simulateur', '/simulateur.html', '/ordonnance', '/ordonnance.html']) {
    const res = await fetch(server.url + p);
    assert.equal(res.status, 200, p);
  }
});

test("une ancre n'atterrit pas sous la barre fixe", async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(server.url + '/nos-solutions#moniteur');
  await page.waitForTimeout(1200);
  const top = await page.evaluate(() => document.getElementById('moniteur').getBoundingClientRect().top);
  assert.ok(top >= 68, `top = ${top}`);
  assert.ok(await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('moniteur')).scrollMarginTop) >= 84));
  await page.close();
});

test('la fenêtre Télécharger reprend la palette du site', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(server.url + '/');
  const bg = (sel) => page.locator(sel).evaluate((e) => getComputedStyle(e).backgroundColor);
  assert.equal(await bg('.dl-android'), 'rgb(0, 96, 38)');
  assert.equal(await bg('.dl-ios'), 'rgb(30, 50, 74)');
  assert.equal(await page.locator('.dl-card h2').evaluate((e) => getComputedStyle(e).color), 'rgb(30, 50, 74)');
  await page.close();
});

test('le texte du hero ne coupe pas « consacrez-vous »', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(server.url + '/');
  assert.equal(await page.locator('.hero-text .nowrap').innerText(), 'consacrez-vous');
  await page.close();
});
