import { defineConfig } from 'vite';
import llmsTxt from './build/llms-txt.js';
import stripHtmlComments from './build/strip-html-comments.js';

export default defineConfig({
  /* stripHtmlComments must come after llmsTxt only for readability —
     llmsTxt reads index.html off disk in writeBundle rather than taking
     the transformed HTML, so the two never see each other's output. */
  plugins: [llmsTxt(), stripHtmlComments()],
  build: {
    // es2020 for dynamic import() — the lazy cuelume load in src/js/sound.js
    target: 'es2020',
    outDir: 'dist',
  },
});
