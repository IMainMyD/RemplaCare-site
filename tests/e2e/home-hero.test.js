const test = require('node:test');
const assert = require('node:assert');
const { startServer } = require('../helpers/serve');
const { launch } = require('../helpers/browser');

let server, browser;
test.before(async () => { server = await startServer('_site'); browser = await launch(); });
test.after(async () => { await browser.close(); await server.close(); });

async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const page = await ctx.newPage();
  await page.goto(server.url + '/');
  return page;
}

test('hero : textes exacts', async () => {
  const page = await open();
  assert.equal((await page.locator('h1').innerText()).trim(), 'Le calendrier des professionnels de santé');
  assert.equal((await page.locator('.hero-sub').innerText()).trim(), 'Spécialement conçu pour les remplaçants');
  assert.equal((await page.locator('.hero-text').innerText()).trim(),
    'Ayez une vision de votre CA prévisionnel, anticipez vos cotisations et consacrez-vous à votre pratique.');
  const btns = page.locator('.hero-cta a');
  assert.deepEqual((await btns.allTextContents()).map((t) => t.trim()), ["S'inscrire", "Télécharger l'app"]);
  assert.deepEqual(await btns.evaluateAll((els) => els.map((e) => e.hasAttribute('data-download'))), [true, true]);
  await page.close();
});

test('quatre onglets, un panneau visible', async () => {
  const page = await open();
  assert.equal(await page.locator('[role=tab]').count(), 4);
  assert.equal(await page.locator('[role=tab][aria-selected="true"]').count(), 1);
  let visible = 0;
  for (const p of await page.locator('[role=tabpanel]').all()) if (await p.isVisible()) visible++;
  assert.equal(visible, 1);
  await page.close();
});

test('titres des panneaux conformes à la spec', async () => {
  const page = await open({ javaScriptEnabled: false });
  assert.deepEqual((await page.locator('.panel h3').allTextContents()).map((t) => t.trim()), [
    'Organisez votre vie grâce à un calendrier répondant à vos besoins.',
    'Suivez quotidiennement votre activité',
    'Ne craignez plus les rattrapages et anticipez pour ne plus subir',
    'Des outils à votre disposition',
  ]);
  await page.close();
});

test('Moniteur garde son texte', async () => {
  const page = await open({ javaScriptEnabled: false });
  const t = await page.locator('#panel-moniteur').textContent();
  assert.ok(t.includes("Fixez-vous des objectifs et mettez en place ce qu'il faut pour les atteindre"));
  assert.ok(t.includes('Tracez vos paiements'));
  await page.close();
});

test("le simulateur ne parle pas d'impôts", async () => {
  const page = await open({ javaScriptEnabled: false });
  const t = await page.locator('#panel-simulateur').textContent();
  assert.ok(t.includes('URSSAF et CARPIMKO'));
  assert.ok(!t.includes('mpôt'));
  await page.close();
});

test('durée par défaut du minuteur : 6 s', async () => {
  const page = await open();
  const d = await page.locator('.tab[aria-selected="true"] .ring-path').evaluate((e) => getComputedStyle(e).animationDuration);
  assert.equal(d, '6s');
  await page.close();
});

test('sans JavaScript, les quatre panneaux sont visibles', async () => {
  const page = await open({ javaScriptEnabled: false });
  for (const p of await page.locator('.panel').all()) assert.equal(await p.isVisible(), true);
  assert.equal(await page.locator('.nav-link').count(), 4);
  assert.equal(await page.locator('.site-header').isVisible(), true);
  await page.close();
});

test('liens « En savoir plus »', async () => {
  const page = await open();
  assert.deepEqual(await page.locator('.panel-more').evaluateAll((els) => els.map((e) => e.getAttribute('href'))),
    ['/nos-solutions#calendrier', '/nos-solutions#moniteur', '/simulateur', '/ordonnance']);
  await page.close();
});
