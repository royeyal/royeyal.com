import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // es2020 for dynamic import() — the lazy cuelume load in src/js/sound.js
    target: 'es2020',
    outDir: 'dist',
  },
});
