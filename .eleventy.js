import { minify } from 'html-minifier-terser';
import { eleventyImageTransformPlugin } from '@11ty/eleventy-img'
import path from 'path';
import { getPlaiceholder } from 'plaiceholder';
import * as cheerio from 'cheerio';
import fs from "fs";

export default function(eleventyConfig) {
  eleventyConfig.addBundle("css");
  eleventyConfig.addBundle("cssprint");

  // Add date filter for sitemap
  eleventyConfig.addFilter("dateToRfc3339", (dateObj) => {
    return new Date(dateObj).toISOString().replace(/\.\d{3}Z$/, 'Z');
  });
  // Set custom directories for input, output, includes, and data
  eleventyConfig.addPassthroughCopy({
    "public/css": "/css",
    "public/fonts": "/fonts",
    "public/images/icons": "/",
    "content/images": "/images"
  });
  eleventyConfig.addWatchTarget("public/css");

  eleventyConfig.ignores.add("public/js/");

  // Simplified image plugin configuration
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    extensions: 'html',
    formats: ['avif', 'webp', 'jpeg'], 
    widths: [ 720, 900, 1200, 'auto'],
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

  // Add color extraction transform that runs after image processing
  eleventyConfig.addTransform("addImageColors", async function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      const $ = cheerio.load(content);
      const images = $("img[src]");
      
      for (let i = 0; i < images.length; i++) {
        const img = $(images[i]);
        const src = img.attr("src");
        
        // Check if this is a processed image URL
        if (src && src.includes("/img/optimized/")) {
          try {
            // For the new image plugin, we need to reconstruct the original path
            // from the filename pattern: /img/optimized/filename-width.format
            const filename = src.split('/').pop(); // Get just the filename
            const baseName = filename.replace(/-\d+w\.(jpeg|webp|avif)$/, ''); // Remove width and extension
            
            // Try different extensions since we have both .jpg and .png files
            const possiblePaths = [
              `./content/images/${baseName}.jpg`,
              `./content/images/${baseName}.png`,
              `./content/images/${baseName}.jpeg`
            ];
            
            let originalSrc = null;
            for (const path of possiblePaths) {
              if (fs.existsSync(path)) {
                originalSrc = path;
                break;
              }
            }
            
            // Check if the original file exists
            if (originalSrc && fs.existsSync(originalSrc)) {
              const { color } = await getPlaiceholder(originalSrc);
              
              // Add placeholder class and background color
              img.addClass("image-placeholder");
              const existingStyle = img.attr("style") || "";
              img.attr("style", `background-color: ${color.hex}; background-size: cover; background-position: center; ${existingStyle}`);
              img.attr("onload", "this.classList.add('loaded')");
            }
          } catch (error) {
            console.warn(`Color extraction failed for ${src}:`, error.message);
          }
        }
      }
      
      return $.html();
    }
    return content;
  });

  eleventyConfig.on("eleventy.after", () => {
    const sourceDir = ".cache/@11ty/img/";
    const targetDir = path.join(eleventyConfig.directories.output, "/img/optimized/");
    
    if (fs.existsSync(sourceDir)) {
      fs.cpSync(sourceDir, targetDir, {
        recursive: true
      });
    }
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