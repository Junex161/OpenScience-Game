import { defineConfig } from 'vite';

// base './' makes the build work under any GitHub Pages sub-path
// (e.g. https://junex161.github.io/OpenScience-Game/).
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
