const test = require('node:test');
const assert = require('node:assert');
const { startServer } = require('../helpers/serve');
const { launch } = require('../helpers/browser');

let server, browser;
test.before(async () => { server = await startServer('_site'); browser = await launch(); });
test.after(async () => { await browser.close(); await server.close(); });

async function open(width = 1280) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(server.url + '/');
  return page;
}

test('ordre des sections', async () => {
  const page = await open();
  const order = await page.evaluate(() => {
    const ids = ['optimise', 'probleme', 'avant-apres', 'valeur', 'fondateur', 'faq', 'cta-final'];
    const car = document.querySelector('[data-carousel]');
    const els = ids.map((i) => document.getElementById(i));
    if (els.some((e) => !e)) return { missing: ids.filter((i) => !document.getElementById(i)) };
    const chain = [car, ...els];
    const ok = chain.every((e, i) => i === 0 || (chain[i - 1].compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING));
    return { ok };
  });
  assert.deepStrictEqual(order, { ok: true });
  await page.close();
});

test('contenu retiré ou remplacé', async () => {
  const page = await open();
  const text = await page.evaluate(() => document.body.innerText);
  for (const t of ['2 h récupérées', 'Zéro surprise', 'Ton prochain mois', 'Votre prochain mois commence maintenant']) {
    assert.ok(!text.includes(t), `ne doit pas contenir « ${t} »`);
  }
  assert.ok((await page.locator('#faq').textContent()).includes('8,99'));
  assert.equal(await page.locator('.cta-band').count(), 1);
  await page.close();
});

test('quatre questions en cartes', async () => {
  const page = await open();
  const radii = await page.$$eval('#probleme .pain', (els) => els.map((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius)));
  assert.equal(radii.length, 4);
  for (const r of radii) assert.ok(r >= 16, `rayon ${r}`);
  await page.close();
});

test('boutons du bandeau final', async () => {
  const page = await open();
  assert.equal(await page.locator('#cta-final [data-download]').count(), 2);
  await page.close();
});

test('pas de débordement horizontal', async () => {
  for (const w of [375, 768, 1280]) {
    const page = await open(w);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(over <= 0, `débordement ${over}px à ${w}`);
    await page.close();
  }
});

test('section « Optimisé pour les remplaçants »', async () => {
  const page = await open();
  const norm = (t) => t.replace(/\s+/g, ' ').trim();
  assert.equal(norm(await page.locator('#optimise h2').textContent()),
    'Optimisé pour les remplaçants travaillant sur plusieurs tournées');
  assert.equal(norm(await page.locator('#optimise p').textContent()),
    'Votre travail est de soigner, mais ne perdez pas de vue ce que vous devez gagner. RemplaCare comptabilise votre CA, afin que vous ayez du temps pour ce qui compte.');
  const btn = page.locator('#optimise a[data-download]');
  assert.equal(norm(await btn.textContent()), 'Télécharger gratuitement');
  const st = await page.locator('#optimise').evaluate((e) => {
    const c = getComputedStyle(e); return { bg: c.backgroundColor, pt: parseFloat(c.paddingTop), ta: c.textAlign };
  });
  assert.equal(st.bg, 'rgb(255, 255, 255)');
  assert.ok(st.pt >= 80, 'padding ' + st.pt);
  assert.equal(st.ta, 'center');
  await btn.click();
  await page.waitForSelector('.dl-overlay.open');
  await page.close();
});
