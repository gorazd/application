# JavaScript Build Process with esbuild and Eleventy

## Overview

This document outlines the current implementation of the **esbuild** integration into the Eleventy project. The goal is to have an efficient JavaScript bundling and minification pipeline for both development and production environments.

## Current Implementation

The project now uses a single, powerful `build-js.js` script to handle all JavaScript bundling. This script is inspired by modern esbuild setups and provides a robust solution for both development and production.

### Key Features:

*   **Single Build Script:** `build-js.js` is the single source of truth for the JavaScript build process.
*   **Environment-Specific Builds:** The script differentiates between development (`--watch` flag) and production (`ELEVENTY_ENV=production`) builds.
*   **Bundle Analysis:** In production builds, the script generates a metafile and provides a bundle analysis, giving insights into the composition of the final JavaScript bundle.
*   **Advanced Configuration:** The script includes advanced esbuild options for tree-shaking, GSAP optimization, and more.

### File Structure:

```
public/js/
  main.js                 # Source JavaScript file
  animations.js           # Other JS modules

_site/js/
  main.bundle.js          # Bundled output for development and production

build-js.js               # Standalone build script
.eleventy.js              # Updated 11ty config
package.json              # Updated with new scripts
```

## Workflow

### Development

1.  Run `npm start`.
2.  This command should trigger the `build-js.js` script in watch mode (`node build-js.js --watch`).
3.  esbuild will watch for changes in the JavaScript files and rebuild the bundle automatically.

### Production

1.  Run `npm run build`.
2.  This command should trigger the `build-js.js` script to create a minified, production-ready bundle.
3.  The script will also output a bundle analysis to the console.
