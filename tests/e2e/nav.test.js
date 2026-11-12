const test = require('node:test');
const assert = require('node:assert');
const { startServer } = require('../helpers/serve');
const { launch } = require('../helpers/browser');

let server, browser;
test.before(async () => { server = await startServer('_site'); browser = await launch(); });
test.after(async () => { await browser.close(); await server.close(); });

async function open(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(server.url + '/ressources');
  return page;
}

test('liens de la barre dans l\'ordre', async () => {
  const page = await open(1280, 800);
  assert.deepEqual(await page.locator('.nav-link').allTextContents(),
    ['Ordonnance', 'Simulateur de cotisation', 'Ressources', 'Nos Solutions']);
  const hrefs = await page.locator('.nav-link').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  assert.deepEqual(hrefs, ['/ordonnance', '/simulateur', '/ressources', '/nos-solutions']);
  assert.equal(await page.locator('.nav-contact').getAttribute('href'), 'mailto:contact@remplacare.fr');
  assert.equal(await page.locator('.nav-download').evaluate((e) => e.hasAttribute('data-download')), true);
  await page.close();
});

test('la barre reste en haut au scroll', async () => {
  const page = await open(1280, 800);
  await page.addStyleTag({ content: 'main{height:3000px}' });
  await page.evaluate(() => window.scrollTo(0, 3000));
  const top = await page.locator('.site-header').evaluate((e) => e.getBoundingClientRect().top);
  assert.equal(top, 0);
  await page.close();
});

test('menu burger sous 900 px', async () => {
  const page = await open(375, 700);
  for (const l of await page.locator('.nav-link').all()) assert.equal(await l.isVisible(), false);
  const burger = page.locator('.nav-burger');
  assert.equal(await burger.isVisible(), true);
  assert.equal(await page.locator('.nav-download').isVisible(), true);
  await burger.click();
  assert.equal(await burger.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator('#nav-menu').isVisible(), true);
  for (const l of await page.locator('#nav-menu .nav-link').all()) assert.equal(await l.isVisible(), true);
  assert.equal(await page.locator('#nav-menu .nav-link').count(), 4);
  await burger.click();
  assert.equal(await burger.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('#nav-menu').isVisible(), false);
  assert.equal(await page.locator('.nav-download').isVisible(), true);
  await page.close();
});

test('ressources est noindex', async () => {
  const page = await open(1280, 800);
  assert.match(await page.locator('meta[name=robots]').getAttribute('content'), /noindex/);
  await page.close();
});

test('lien Nous contacter mobile aux couleurs de la palette', async () => {
  const page = await open(375, 700);
  await page.locator('.nav-burger').click();
  const link = page.locator('#nav-menu .nav-contact-mobile');
  assert.equal(await link.isVisible(), true);
  const s = await link.evaluate((e) => { const c = getComputedStyle(e); return [c.color, c.backgroundColor]; });
  assert.deepEqual(s, ['rgb(255, 255, 255)', 'rgb(30, 50, 74)']);
  await page.close();
});

test('pas de débordement de la barre entre 900 et 1100 px', async () => {
  for (const w of [900, 1000, 1100]) {
    const page = await open(w, 800);
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      h: document.querySelector('.site-header').getBoundingClientRect().height,
      nh: document.querySelector('.site-nav').scrollHeight,
    }));
    assert.ok(m.sw <= m.iw, `${w}: scrollWidth ${m.sw} > ${m.iw}`);
    assert.equal(m.h, 68, `${w}: hauteur ${m.h}`);
    assert.ok(m.nh <= 68, `${w}: contenu de la barre ${m.nh}`);
    await page.close();
  }
});
