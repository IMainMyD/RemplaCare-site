const test = require('node:test');
const assert = require('node:assert');
const { startServer } = require('../helpers/serve');
const { launch } = require('../helpers/browser');

let server, browser;
test.before(async () => { server = await startServer('_site'); browser = await launch(); });
test.after(async () => { await browser.close(); await server.close(); });

const TOOLS = ['calendrier', 'moniteur', 'simulateur', 'trousse'];

async function open({ fast = true, cycle = '300ms', ...opts } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const page = await ctx.newPage();
  await page.goto(server.url + '/');
  if (fast) await page.addStyleTag({ content: `:root{--cycle:${cycle}}` });
  return page;
}
const selected = (page) => page.evaluate(() =>
  document.querySelector('[role=tab][aria-selected="true"]').dataset.tool);
const waitSelected = (page, tool, timeout = 5000) => page.waitForFunction(
  (t) => document.querySelector('[role=tab][aria-selected="true"]').dataset.tool === t, tool, { timeout });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('contrat ARIA : onglets et panneaux liés', async () => {
  const page = await open({ fast: false });
  for (const t of TOOLS) {
    const tab = page.locator('#tab-' + t);
    assert.equal(await tab.getAttribute('aria-controls'), 'panel-' + t);
    assert.equal(await page.locator('#panel-' + t).getAttribute('aria-labelledby'), 'tab-' + t);
    assert.equal(await page.locator('#panel-' + t).getAttribute('tabindex'), '0');
  }
  assert.equal(await page.locator('[role=tab][tabindex="0"]').count(), 1);
  assert.equal(await page.locator('[role=tabpanel][hidden]').count(), 3);
  assert.equal(await page.locator('#panel-calendrier').getAttribute('hidden'), null);
  assert.equal(await page.locator('.ring-path').first().getAttribute('d'),
    'M44 2 H59 A27 27 0 0 1 86 29 V59 A27 27 0 0 1 59 86 H29 A27 27 0 0 1 2 59 V29 A27 27 0 0 1 29 2 Z');
  await page.close();
});

test('un clic sur une icône affiche son panneau', async () => {
  const page = await open();
  await page.click('#tab-moniteur');
  assert.equal(await page.getAttribute('#tab-moniteur', 'aria-selected'), 'true');
  assert.equal(await page.getAttribute('#tab-moniteur', 'tabindex'), '0');
  assert.equal(await page.isVisible('#panel-moniteur'), true);
  for (const t of ['calendrier', 'simulateur', 'trousse']) {
    assert.equal(await page.isVisible('#panel-' + t), false);
    assert.equal(await page.getAttribute('#tab-' + t, 'tabindex'), '-1');
  }
  assert.equal(await page.locator('[role=tab][tabindex="0"]').count(), 1);
  await page.close();
});

test('flèches : suivant et précédent, avec bouclage', async () => {
  const page = await open({ fast: false });
  await page.click('[data-carousel-prev]');
  assert.equal(await selected(page), 'trousse');
  await page.click('[data-carousel-next]');
  assert.equal(await selected(page), 'calendrier');
  await page.close();
});

test('clavier : flèches gauche/droite, Début, Fin', async () => {
  const page = await open({ fast: false });
  await page.focus('#tab-calendrier');
  await page.keyboard.press('ArrowRight');
  assert.equal(await selected(page), 'moniteur');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'tab-moniteur');
  await page.keyboard.press('End');
  assert.equal(await selected(page), 'trousse');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'tab-trousse');
  await page.keyboard.press('Home');
  assert.equal(await selected(page), 'calendrier');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await selected(page), 'trousse');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'tab-trousse');
  assert.equal(await page.getAttribute('[data-carousel]', 'data-autoplay'), 'off');
  await page.close();
});

test('défilement automatique après le cycle', async () => {
  const page = await open();
  await page.mouse.move(5, 5);
  await page.waitForFunction(
    () => document.querySelector('[role=tab][aria-selected="true"]').dataset.tool !== 'calendrier',
    null, { timeout: 5000 });
  assert.equal(await page.getAttribute('[data-carousel]', 'data-autoplay'), 'on');
  await page.close();
});

test('un clic arrête le défilement', async () => {
  const page = await open();
  await page.click('#tab-moniteur');
  await sleep(1200);
  assert.equal(await selected(page), 'moniteur');
  assert.equal(await page.getAttribute('[data-carousel]', 'data-autoplay'), 'off');
  await page.close();
});

test('le survol met en pause', async () => {
  const page = await open({ cycle: '1s' });
  await page.hover('[data-carousel]');
  assert.equal(await selected(page), 'calendrier');
  assert.notEqual(await page.getAttribute('[data-carousel]', 'data-paused'), null);
  await sleep(3200);
  assert.equal(await selected(page), 'calendrier');
  await page.mouse.move(5, 5);
  assert.equal(await page.getAttribute('[data-carousel]', 'data-paused'), null);
  await page.waitForFunction(
    () => document.querySelector('[role=tab][aria-selected="true"]').dataset.tool !== 'calendrier',
    null, { timeout: 5000 });
  await page.close();
});

test('le focus clavier met en pause', async () => {
  const page = await open({ cycle: '1s' });
  await page.mouse.move(5, 5);
  await page.focus('#tab-calendrier');
  await sleep(3200);
  assert.equal(await selected(page), 'calendrier');
  assert.notEqual(await page.getAttribute('[data-carousel]', 'data-paused'), null);
  await page.close();
});

test('mouvement réduit : pas de défilement automatique', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(server.url + '/');
  await page.addStyleTag({ content: ':root{--cycle:300ms}' });
  await sleep(1200);
  assert.equal(await selected(page), 'calendrier');
  assert.equal(await page.getAttribute('[data-carousel]', 'data-autoplay'), 'off');
  const names = await page.locator('.ring-path').evaluateAll((els) => els.map((e) => getComputedStyle(e).animationName));
  assert.deepEqual(names, ['none', 'none', 'none', 'none']);
  await ctx.close();
});

test('balayage sur mobile', async () => {
  const page = await open({ viewport: { width: 375, height: 700 }, hasTouch: true, isMobile: true, fast: false });
  const cdp = await page.context().newCDPSession(page);
  await page.evaluate((yy) => window.scrollTo(0, window.scrollY + document.querySelector('.panels').getBoundingClientRect().top - 100));
  const by = await page.locator('.panels').boundingBox();
  const yy = by.y + 40;
  const t = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: yy }] });
  await t('touchStart', 300); await t('touchMove', 220); await t('touchMove', 120); await t('touchEnd', 120);
  await waitSelected(page, 'moniteur', 3000);
  assert.equal(await page.getAttribute('[data-carousel]', 'data-autoplay'), 'off');
  await page.close();
});

test('pause cumulée : sortie de la souris avec le focus encore dedans', async () => {
  const page = await open({ cycle: '1s' });
  await page.mouse.move(5, 5);
  await page.focus('#tab-calendrier');
  await page.hover('[data-carousel]');
  await page.mouse.move(5, 5);
  await sleep(3200);
  assert.equal(await selected(page), 'calendrier');
  assert.notEqual(await page.getAttribute('[data-carousel]', 'data-paused'), null);
  await page.close();
});

test('pause cumulée : perte du focus avec la souris encore dessus', async () => {
  const page = await open({ cycle: '1s' });
  await page.hover('[data-carousel]');
  await page.focus('#tab-calendrier');
  await page.evaluate(() => document.activeElement.blur());
  await sleep(3200);
  assert.equal(await selected(page), 'calendrier');
  assert.notEqual(await page.getAttribute('[data-carousel]', 'data-paused'), null);
  await page.close();
});
