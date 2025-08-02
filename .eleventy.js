export default function(eleventyConfig) {
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
