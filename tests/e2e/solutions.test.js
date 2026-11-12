const test = require('node:test');
const assert = require('node:assert');
const { startServer } = require('../helpers/serve');
const { launch } = require('../helpers/browser');

let server, browser;
test.before(async () => { server = await startServer('_site'); browser = await launch(); });
test.after(async () => { await browser.close(); await server.close(); });

const norm = (s) => s.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
async function open(w = 1280, h = 900) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(server.url + '/nos-solutions');
  return page;
}
const text = async (page, sel) => norm(await page.locator(sel).innerText());

test('deux colonnes avec les prix', async () => {
  const page = await open();
  const free = await text(page, '.plan-free');
  const pro = await text(page, '.plan-pro');
  assert.ok(free.includes('Gratuit'));
  const dl = page.locator('.plan-free [data-download]');
  assert.equal(await dl.count(), 1);
  assert.equal(norm(await dl.innerText()), "Télécharger l'app");
  for (const s of ['8,99 €', '79 €', 'par mois', 'par an']) assert.ok(pro.includes(s), s);
  await page.close();
});

test('contenu des colonnes', async () => {
  const page = await open();
  const free = await text(page, '.plan-free');
  const pro = await text(page, '.plan-pro');
  for (const s of ['Un objectif par an', 'Import de calendrier', "Générateur d'ordonnance"]) assert.ok(free.includes(s), s);
  assert.ok(!free.includes('Objectifs illimités'));
  for (const s of ['Objectifs illimités', 'cotisations à provisionner', '27 %', 'Tout le Gratuit']) assert.ok(pro.includes(s), s);
  await page.close();
});

test('bouton du Pro', async () => {
  const page = await open();
  const cta = page.locator('.plan-pro .plan-cta');
  assert.equal(norm(await cta.innerText()), 'Bientôt disponible');
  const href = await cta.getAttribute('href');
  assert.ok(href.startsWith('mailto:contact@remplacare.fr?subject='));
  assert.ok(decodeURIComponent(href.split('subject=')[1]).includes('Pro'));
  await page.close();
});

test('ancres', async () => {
  const page = await open();
  assert.equal(await page.locator('#calendrier').count(), 1);
  assert.equal(await page.locator('#moniteur').count(), 1);
  assert.ok(norm(await page.locator('#calendrier').innerText()).includes('Calendrier'));
  assert.ok(norm(await page.locator('#moniteur').innerText()).includes('Moniteur'));
  await page.close();
});

test('Nos Solutions est la page courante', async () => {
  const page = await open();
  assert.equal(await page.getAttribute('a.nav-link[data-nav="solutions"]', 'aria-current'), 'page');
  await page.close();
});

test('la page tient sur 375 px', async () => {
  const page = await open(375, 800);
  const a = await page.locator('.plan-free').boundingBox();
  const b = await page.locator('.plan-pro').boundingBox();
  assert.ok(b.y >= a.y + a.height - 1, 'colonnes empilées');
  assert.ok(Math.abs(a.x - b.x) < 2);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.close();
});

test('deux colonnes côte à côte sur grand écran', async () => {
  const page = await open();
  const a = await page.locator('.plan-free').boundingBox();
  const b = await page.locator('.plan-pro').boundingBox();
  assert.ok(b.x > a.x + a.width - 1);
  await page.close();
});

test('titre du document', async () => {
  const page = await open();
  assert.equal(await page.title(), 'Nos solutions — RemplaCare');
  await page.close();
});
