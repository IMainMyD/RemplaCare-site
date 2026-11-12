const test = require('node:test');
const assert = require('node:assert');
const { startServer } = require('../helpers/serve');
const { launch } = require('../helpers/browser');

let server, browser;
test.before(async () => { server = await startServer('_site'); browser = await launch(); });
test.after(async () => { await browser.close(); await server.close(); });

const TOOLS = ['calendrier', 'moniteur', 'simulateur', 'trousse'];

const SHORT = '--t-switch:40ms';
async function open({ fast = true, cycle = '300ms', times = SHORT, ...opts } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const page = await ctx.newPage();
  await page.goto(server.url + '/');
  await page.addStyleTag({ content: `:root{${times}${fast ? `;--cycle:${cycle}` : ''}}` });
  return page;
}
// Phase « idle » atteinte, puis fins des transitions CSS du carré (rendu éventuellement en retard).
const waitIdle = async (page, timeout = 3000) => {
  await page.waitForFunction(
    () => document.querySelector('[data-carousel]').getAttribute('data-phase') === 'idle', null, { timeout });
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => !(a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.tab-ring')))
    .map((a) => a.finished)));
};
const recordPhases = (page) => page.evaluate(() => {
  const root = document.querySelector('[data-carousel]');
  window.__phases = [];
  new MutationObserver(() => window.__phases.push(root.getAttribute('data-phase')))
    .observe(root, { attributes: true, attributeFilter: ['data-phase'] });
});
const phases = async (page) => (await page.evaluate(() => window.__phases))
  .filter((p, i, a) => i === 0 || p !== a[i - 1]);
const visiblePanels = async (page) => {
  const out = [];
  for (const t of TOOLS) if (await page.isVisible('#panel-' + t)) out.push(t);
  return out;
};
const left = async (page, sel) => (await page.locator(sel).boundingBox()).x;
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
  const page = await open({ fast: false });
  await page.click('#tab-moniteur');
  await waitIdle(page);
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
  assert.equal(await page.getAttribute('[data-carousel]', 'data-autoplay'), 'on');
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

test('mouvement réduit : pas de défilement automatique', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(server.url + '/');
  await page.addStyleTag({ content: ':root{--cycle:300ms}' });
  await sleep(1200);
  assert.equal(await selected(page), 'calendrier');
  assert.equal(await page.getAttribute('[data-carousel]', 'data-autoplay'), 'off');
  assert.equal(await page.getAttribute('[data-carousel]', 'data-phase'), 'idle');
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
  assert.equal(await page.getAttribute('[data-carousel]', 'data-autoplay'), 'on');
  await page.close();
});

test('Alt+Flèche n\'est pas capturée par le carrousel', async () => {
  const page = await open({ fast: false });
  const tool = await selected(page);
  await page.locator('[role=tab][aria-selected="true"]').focus();
  const notPrevented = await page.evaluate(() => document.activeElement.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true, cancelable: true })));
  assert.equal(notPrevented, true);
  assert.equal(await selected(page), tool);
  assert.equal(await page.evaluate(() => document.querySelector('[data-autoplay]').dataset.autoplay), 'on');
  await page.close();
});

// ── Transition : fondu, glissement du carré, fondu ─────────────────────────
test('état final après transition', async () => {
  const page = await open({ fast: false });
  await page.click('#tab-simulateur');
  await waitIdle(page);
  assert.deepEqual(await page.locator('[role=tab][aria-selected="true"]').evaluateAll((e) => e.map((x) => x.dataset.tool)), ['simulateur']);
  assert.deepEqual(await visiblePanels(page), ['simulateur']);
  await page.mouse.move(5, 5);
  const g = await left(page, '.tab-glider'), t = await left(page, '#tab-simulateur');
  assert.ok(Math.abs(g - t) <= 1, `glider ${g} / onglet ${t}`);
  assert.equal(await page.getAttribute('[data-carousel]', 'data-phase'), 'idle');
  await page.close();
});

test('le carré prend la couleur de l\'outil actif', async () => {
  const page = await open({ fast: false });
  const expected = {
    moniteur: 'rgb(160, 179, 82)', simulateur: 'rgb(217, 150, 126)',
    trousse: 'rgb(242, 92, 5)', calendrier: 'rgb(194, 224, 242)',
  };
  for (const t of ['moniteur', 'simulateur', 'trousse', 'calendrier']) {
    await page.click('#tab-' + t);
    await waitIdle(page);
    const st = await page.locator('.tab-glider').evaluate((e) => {
      const c = getComputedStyle(e); return { bg: c.backgroundColor, border: c.borderTopColor };
    });
    assert.equal(st.bg, expected[t], t);
    const m = st.border.match(/[\d.]+/g).map(Number);
    assert.deepEqual(m.slice(0, 3), [255, 255, 255]);
    assert.ok(m.length < 4 || m[3] >= 0.9, 'contour blanc opaque : ' + st.border);
  }
  await page.close();
});

test('les onglets inactifs sont transparents', async () => {
  const page = await open({ fast: false });
  await page.mouse.move(5, 5);
  const alphas = await page.locator('[role=tab][aria-selected="false"]').evaluateAll((els) => els.map((e) => {
    const m = getComputedStyle(e).backgroundColor.match(/[\d.]+/g).map(Number);
    return m.length < 4 ? 1 : m[3];
  }));
  assert.equal(alphas.length, 3);
  for (const a of alphas) assert.ok(a <= 0.2, 'alpha ' + a);
  await page.close();
});

test('clics rapides : le dernier gagne', async () => {
  const page = await open({ fast: false, times: '--t-switch:300ms' });
  await page.click('#tab-moniteur');
  await page.click('#tab-trousse');
  await waitIdle(page);
  assert.deepEqual(await page.locator('[role=tab][aria-selected="true"]').evaluateAll((e) => e.map((x) => x.dataset.tool)), ['trousse']);
  assert.deepEqual(await visiblePanels(page), ['trousse']);
  await page.mouse.move(5, 5);
  const g = await left(page, '.tab-glider'), t = await left(page, '#tab-trousse');
  assert.ok(Math.abs(g - t) <= 1, `glider ${g} / onglet ${t}`);
  await page.close();
});

for (const width of [1280, 375]) {
  test(`hauteurs stables entre les quatre outils (${width}px)`, async () => {
    const page = await open({ fast: false, viewport: { width, height: 900 } });
    const heights = [], stages = [];
    for (const t of TOOLS) {
      await page.click('#tab-' + t, { force: true });
      await waitIdle(page);
      heights.push((await page.locator('#panel-' + t).boundingBox()).height);
      stages.push((await page.locator('.stage').boundingBox()).height);
    }
    for (const h of heights) assert.ok(Math.abs(h - heights[0]) <= 1, 'cartes ' + heights);
    for (const h of stages) assert.ok(Math.abs(h - stages[0]) <= 1, 'scène ' + stages);
    await page.close();
  });
}

test('mouvement réduit : bascule instantanée', async () => {
  const page = await open({ fast: false, reducedMotion: 'reduce', times: '--t-switch:3s' });
  await page.click('#tab-moniteur');
  assert.equal(await page.getAttribute('[data-carousel]', 'data-phase'), 'idle');
  assert.equal(await page.isVisible('#panel-moniteur'), true);
  assert.equal(await page.isVisible('#panel-calendrier'), false);
  assert.equal(await page.locator('.tab-glider').evaluate((e) => getComputedStyle(e).transitionDuration), '0s');
  await page.close();
});

test('l\'anneau ne démarre qu\'une fois le mouvement terminé', async () => {
  const page = await open({ fast: false, times: '--t-switch:300ms' });
  await page.mouse.move(5, 5);
  await page.addStyleTag({ content: ':root{--cycle:300ms}' });
  await page.waitForFunction(() => document.querySelector('[data-carousel]').getAttribute('data-phase') === 'moving', null, { timeout: 3000 });
  const ring = () => page.locator('#tab-moniteur .ring-path').evaluate((e) => getComputedStyle(e).animationName);
  assert.equal(await ring(), 'none');
  await waitIdle(page);
  assert.equal(await ring(), 'ring');
  await page.close();
});

// ── Mouvement unique : fondu enchaîné + glissement ─────────────────────────
test('phases observées : moving puis idle', async () => {
  const page = await open({ fast: false, times: '--t-switch:150ms' });
  await recordPhases(page);
  await page.click('#tab-moniteur');
  await waitIdle(page);
  assert.deepEqual(await phases(page), ['moving', 'idle']);
  await page.close();
});

test('le défilement automatique passe par le mouvement', async () => {
  const page = await open({ fast: false, times: '--t-switch:100ms' });
  await recordPhases(page);
  await page.addStyleTag({ content: ':root{--cycle:300ms}' });
  await waitSelected(page, 'moniteur');
  await waitIdle(page);
  assert.deepEqual((await phases(page)).slice(0, 2), ['moving', 'idle']);
  await page.close();
});

test('fondu enchaîné : jamais de carte absente, le carré est entre les deux onglets', async () => {
  const page = await open({ fast: false, times: '--t-switch:1500ms' });
  await page.mouse.move(5, 5);
  await page.click('#tab-moniteur');
  const samples = await page.evaluate(() => new Promise((resolve) => {
    const out = [], t0 = performance.now();
    const op = (id) => parseFloat(getComputedStyle(document.getElementById(id)).opacity);
    (function tick() {
      const t = performance.now() - t0;
      out.push({ t, a: op('panel-calendrier'), b: op('panel-moniteur'),
        g: document.querySelector('.tab-glider').getBoundingClientRect().left });
      if (t < 1400) requestAnimationFrame(tick); else resolve(out);
    })();
  }));
  const l0 = await left(page, '#tab-calendrier'), l1 = await left(page, '#tab-moniteur');
  for (const x of samples) assert.ok(Math.max(x.a, x.b) > 0.3, `carte absente à ${x.t} : ${x.a}/${x.b}`);
  const mid = samples.filter((x) => x.t > 500 && x.t < 1000);
  assert.ok(mid.length > 3);
  assert.ok(mid.some((x) => x.a > 0.05 && x.a < 0.95 && x.b > 0.05 && x.b < 0.95), 'pas de fondu enchaîné');
  assert.ok(mid.some((x) => x.g > l0 + 5 && x.g < l1 - 5), 'le carré ne glisse pas');
  await page.close();
});

// ── Défilement continu ─────────────────────────────────────────────────────
test('un clic ne stoppe pas le défilement et ne met pas en pause', async () => {
  const page = await open();
  await page.click('#tab-moniteur');
  assert.equal(await page.getAttribute('[data-carousel]', 'data-paused'), null);
  assert.equal(await page.getAttribute('[data-carousel]', 'data-autoplay'), 'on');
  await page.mouse.move(5, 5);
  await waitSelected(page, 'simulateur');
  assert.equal(await page.getAttribute('[data-carousel]', 'data-autoplay'), 'on');
  await page.close();
});

test('le survol ne met pas en pause', async () => {
  const page = await open();
  await page.hover('[data-carousel]');
  assert.equal(await page.getAttribute('[data-carousel]', 'data-paused'), null);
  const first = await selected(page);
  await page.waitForFunction((f) => document.querySelector('[role=tab][aria-selected="true"]').dataset.tool !== f, first, { timeout: 4000 });
  await page.close();
});

test('la molette ne stoppe pas le défilement', async () => {
  const page = await open();
  await page.mouse.move(640, 650);
  await page.mouse.wheel(0, 400);
  await sleep(100);
  await page.mouse.wheel(0, -400);
  for (let n = 0; n < 2; n++) {
    const cur = await selected(page);
    await page.waitForFunction((f) => document.querySelector('[role=tab][aria-selected="true"]').dataset.tool !== f, cur, { timeout: 4000 });
  }
  assert.equal(await page.getAttribute('[data-carousel]', 'data-paused'), null);
  await page.close();
});

test('le défilement boucle : 4e outil puis Calendrier', async () => {
  const page = await open();
  await page.mouse.move(5, 5);
  await page.click('#tab-trousse');
  await waitSelected(page, 'calendrier');
  await page.close();
});

test('le focus clavier dans une carte met en pause, la sortie reprend', async () => {
  const page = await open({ cycle: '1s' });
  await page.mouse.move(5, 5);
  await page.focus('#tab-calendrier');
  assert.equal(await page.getAttribute('[data-carousel]', 'data-paused'), null, 'un onglet ne met pas en pause');
  for (let i = 0; i < 6; i++) {
    if (await page.evaluate(() => !!document.activeElement.closest('.panel'))) break;
    await page.keyboard.press('Tab');
  }
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('.panel')), true);
  assert.notEqual(await page.getAttribute('[data-carousel]', 'data-paused'), null);
  await sleep(2400);
  assert.equal(await selected(page), 'calendrier');
  await page.evaluate(() => document.activeElement.blur());
  assert.equal(await page.getAttribute('[data-carousel]', 'data-paused'), null);
  await page.waitForFunction(
    () => document.querySelector('[role=tab][aria-selected="true"]').dataset.tool !== 'calendrier', null, { timeout: 5000 });
  await page.close();
});
