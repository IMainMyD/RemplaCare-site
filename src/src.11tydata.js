// Garde les URL actuelles (/simulateur.html, etc.) : une page foo.html est écrite en _site/foo.html.
// (Un permalink JSON en chaîne n'est pas interprété avec htmlTemplateEngine: false.)
module.exports = {
  permalink: (data) => `${data.page.filePathStem}.html`,
};
