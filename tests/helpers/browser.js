// Playwright est installé globalement : lancer avec NODE_PATH=$(npm root -g).
async function launch() {
  return require('playwright').chromium.launch();
}

module.exports = { launch };
