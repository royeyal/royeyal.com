import { defineConfig } from 'vite';
import llmsTxt from './build/llms-txt.js';

export default defineConfig({
  plugins: [llmsTxt()],
  build: {
    // es2020 for dynamic import() — the lazy cuelume load in src/js/sound.js
    target: 'es2020',
    outDir: 'dist',
  },
});
