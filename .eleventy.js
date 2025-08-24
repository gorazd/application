
export default function(eleventyConfig) {
  eleventyConfig.addBundle("css");
  eleventyConfig.addBundle("cssprint");
  // Set custom directories for input, output, includes, and data
  eleventyConfig.addPassthroughCopy({
    "public/css": "/css",
    "public/fonts": "/fonts",
    "public/dist": "/"
  });

  eleventyConfig.addWatchTarget("public/dist/");
  eleventyConfig.ignores.add("public/js/");

  return {
    dir: {
      input: "content",
      includes: "../_includes",
      data: "../_data",
      output: "_site"
    }
  };
};
