import eleventyPluginVite from "@11ty/eleventy-plugin-vite";

export default function(eleventyConfig) {
  eleventyConfig.addPlugin(eleventyPluginVite, {
    viteOptions: {
      // Vite options can be customized here if needed
    },
  });

  eleventyConfig.addBundle("css");
  eleventyConfig.addBundle("cssprint");
  // Set custom directories for input, output, includes, and data
  eleventyConfig.addPassthroughCopy({ "public": "/" });

  return {
    dir: {
      input: "content",
      includes: "../_includes",
      data: "../_data",
      output: "_site"
    }
  };
};
