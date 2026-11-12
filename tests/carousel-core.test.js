const test = require('node:test');
const assert = require('node:assert/strict');
const { createCarousel } = require('../src/assets/js/carousel-core.js');

test("démarre à l'indice donné ou 0", () => {
  assert.equal(createCarousel({ count: 4 }).getIndex(), 0);
  assert.equal(createCarousel({ count: 4, startIndex: 2 }).getIndex(), 2);
});

test('startIndex invalide lève une erreur', () => {
  assert.throws(() => createCarousel({ count: 4, startIndex: 4 }));
  assert.throws(() => createCarousel({ count: 4, startIndex: -1 }));
  assert.throws(() => createCarousel({ count: 4, startIndex: 1.5 }));
});

test('next et prev bouclent', () => {
  const c = createCarousel({ count: 4, startIndex: 3 });
  assert.equal(c.next(), 0);
  assert.equal(c.getIndex(), 0);
  assert.equal(c.prev(), 3);
  assert.equal(c.getIndex(), 3);
});

test('goTo ignore un indice invalide', () => {
  const c = createCarousel({ count: 4, startIndex: 1 });
  assert.equal(c.goTo(9), 1);
  assert.equal(c.goTo(-1), 1);
  assert.equal(c.goTo(1.5), 1);
  assert.equal(c.getIndex(), 1);
  assert.equal(c.goTo(2), 2);
  assert.equal(c.getIndex(), 2);
});

test('tick avance tant que le défilement est actif', () => {
  const c = createCarousel({ count: 4 });
  assert.equal(c.tick(), 1);
  assert.equal(c.tick(), 2);
  assert.equal(c.isAutoplay(), true);
});

test('un clic utilisateur arrête définitivement le défilement', () => {
  const c = createCarousel({ count: 4 });
  c.userInteracted();
  assert.equal(c.tick(), null);
  assert.equal(c.getIndex(), 0);
  assert.equal(c.isAutoplay(), false);
  assert.equal(c.goTo(1), 1);
  assert.equal(c.isAutoplay(), false);
});

test('count invalide', () => {
  assert.throws(() => createCarousel({ count: 0 }));
  assert.throws(() => createCarousel({ count: -2 }));
  assert.throws(() => createCarousel({ count: 2.5 }));
  assert.throws(() => createCarousel({}));
});
