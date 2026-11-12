module.exports = function (eleventyConfig) {
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
