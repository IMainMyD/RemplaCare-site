const fs = require('node:fs');
const path = require('node:path');

module.exports = function (eleventyConfig) {
  // Icône SVG insérée en ligne (currentColor ne fonctionne pas via <img>) : une seule source, src/assets/icons/<nom>.svg
  eleventyConfig.addShortcode('icon', (name) => fs.readFileSync(path.join(__dirname, 'src/assets/icons', `${name}.svg`), 'utf8'));

  eleventyConfig.addPassthroughCopy({
    'download.js': 'download.js',
    'dispositifs.json': 'dispositifs.json',
    'images': 'images',
    'vendor': 'vendor',
    'src/assets': 'assets',
  });

  return {
    dir: { input: 'src', output: '_site', includes: '_includes' },
    htmlTemplateEngine: false,
    templateFormats: ['njk', 'html'],
  };
};
