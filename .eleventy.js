import { minify } from 'html-minifier-terser';

export default function(eleventyConfig) {
  eleventyConfig.addBundle("css");
  eleventyConfig.addBundle("cssprint");
  // Set custom directories for input, output, includes, and data
  eleventyConfig.addPassthroughCopy({
    "public/css": "/css",
    "public/fonts": "/fonts",
    "public/images": "/images",
    "public/images/icons": "/",
    "public/model": "/model"
  });

  eleventyConfig.ignores.add("public/js/");

  eleventyConfig.addTransform("htmlmin", async function(content) {
    if ( this.page.outputPath && this.page.outputPath.endsWith(".html") ) {
      let minified = await minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
        minifyCSS: true,
        minifyJS: true,
      });
      return minified;
    }
    return content;
  });

  return {
    dir: {
      input: "content",
      includes: "../_includes",
      data: "../_data",
      output: "_site"
    }
  };
};
