import { defineConfig } from 'vite';
import eleventy from '@11ty/eleventy-plugin-vite';

export default defineConfig({
  plugins: [eleventy()],
  build: {
    rollupOptions: {
      // Customize Rollup options if needed
    },
    minify: 'esbuild', // Use esbuild for fast minification
  },
  optimizeDeps: {
    include: ['gsap', 'gsap/Draggable', 'gsap/Flip', 'gsap/ScrollTrigger', 'gsap/ScrollToPlugin'],
  },
});
