const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

function lum(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const css = fs.readFileSync(path.join(__dirname, '..', 'src/assets/css/tokens.css'), 'utf8');
const tok = (n) => css.match(new RegExp(`--${n}\\s*:\\s*(#[0-9A-Fa-f]{6})`))[1];

test('palette exacte', () => {
  assert.equal(tok('navy').toUpperCase(), '#1E324A');
  assert.equal(tok('green').toUpperCase(), '#006026');
  assert.equal(tok('powder').toUpperCase(), '#C2E0F2');
  assert.equal(tok('olive').toUpperCase(), '#A0B352');
  assert.equal(tok('orange').toUpperCase(), '#F25C05');
  assert.equal(tok('salmon').toUpperCase(), '#D9967E');
});

test('contrastes AA', () => {
  const navy = tok('navy'), green = tok('green'), W = '#FFFFFF';
  const cases = [
    [navy, W], [W, navy], [green, W], [W, green],
    [navy, tok('powder')], [navy, tok('olive')], [navy, tok('salmon')],
    [green, tok('powder')], [green, '#D5E6F2'],
  ];
  for (const [a, b] of cases) {
    assert.ok(contrast(a, b) >= 4.5, `${a} sur ${b} = ${contrast(a, b).toFixed(2)}`);
  }
});
