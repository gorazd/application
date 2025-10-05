import { minify } from 'html-minifier-terser';
import { eleventyImageTransformPlugin } from '@11ty/eleventy-img'
import path from 'path';
import { getPlaiceholder } from 'plaiceholder';
import * as cheerio from 'cheerio';
import fs from "fs";

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
    widths: [100, 480, 720, 900, 1200, 'auto'],
    defaultAttributes: {
      loading: 'lazy',
      decoding: 'async',
      sizes: '90vw',
    },
    urlPath: '/img/optimized/',
		outputDir: ".cache/@11ty/img/",
    filenameFormat: (id, src, width, format) => {
      const { name } = path.parse(src);
      return `${name}-${width}w.${format}`;
    },
    sharpJpegOptions: { quality: 82, progressive: true },
    sharpWebpOptions: { quality: 75 },
    sharpAvifOptions: { quality: 45 },
  });

  eleventyConfig.on("eleventy.after", () => {
		fs.cpSync(".cache/@11ty/img/", path.join(eleventyConfig.directories.output, "/img/optimized/"), {
			recursive: true
		});
	});

  // Add transform to extract dominant colors from images
  eleventyConfig.addTransform("imageColors", async function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      const $ = cheerio.load(content);
      const images = $("img[src]");
      
      for (let i = 0; i < images.length; i++) {
        const img = $(images[i]);
        let src = img.attr("src");
        
        if (src && src.includes("/.11ty/image/")) {
          try {
            // Parse the original path from the /.11ty/image/ URL
            const urlParams = new URLSearchParams(src.split('?')[1]);
            const originalSrc = decodeURIComponent(urlParams.get('src') || '');
            const imagePath = `./${originalSrc}`;
            
            // Check if file exists
            const fs = await import('fs');
            if (!fs.existsSync(imagePath)) continue;
            
            const result = await getPlaiceholder(imagePath);
            const { color } = await getPlaiceholder(imagePath);

            console.log(color);
            // Add class and background, remove inline blur
            img.addClass("image-placeholder");
            img.attr("style", `background-color: ${color.hex}; background-size: cover; background-position: center; ${img.attr("style") || ""}`);
            img.attr("onload", "this.classList.add('loaded')");
          } catch (error) {
            console.error(`Color extraction failed for ${src}:`, error.message);
          }
        }
      }
      
      return $.html();
    }
    return content;
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