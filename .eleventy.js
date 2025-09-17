import { minify } from 'html-minifier-terser';
import { eleventyImageTransformPlugin } from '@11ty/eleventy-img'
import path from 'path';

export default function(eleventyConfig) {
  eleventyConfig.addBundle("css");
  eleventyConfig.addBundle("cssprint");
  // Set custom directories for input, output, includes, and data
  eleventyConfig.addPassthroughCopy({
    "public/css": "/css",
    "public/fonts": "/fonts",
    "public/images/icons": "/"
  });

  eleventyConfig.ignores.add("public/js/");

  // Image plugin configuration
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    extensions: 'html',
    formats: ['avif', 'webp', 'jpeg'], 
    widths: [480, 720, 900, 1200, 'auto'],
    defaultAttributes: {
      loading: 'lazy',
      decoding: 'async',
      sizes: '90vw',
    },
    outputDir: './_site/img/optimized/',
    urlPath: '/img/optimized/',
    filenameFormat: (id, src, width, format) => {
      const { name } = path.parse(src);
      return `${name}-${width}w.${format}`;
    },
    sharpJpegOptions: { quality: 82, progressive: true },
    sharpWebpOptions: { quality: 75 },
    sharpAvifOptions: { quality: 45 }, // lower = smaller, watch for banding
  });
  // Minify HTML output
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
