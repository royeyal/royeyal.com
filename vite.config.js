import { defineConfig } from 'vite';
import projects from './build/projects.js';
import llmsTxt from './build/llms-txt.js';
import stripHtmlComments from './build/strip-html-comments.js';
import requireFonts from './build/require-fonts.js';

export default defineConfig({
  /* projects() renders the freelance grid into index.html and must come
     first: it runs `pre`, so it is done before stripHtmlComments (`post`)
     could remove its placeholder. stripHtmlComments after llmsTxt is
     readability only — llmsTxt writes from the data modules in
     writeBundle, so the two never see each other's output.
     requireFonts() only reads public/ at buildStart, so its position is
     free; it goes first so a missing font fails before any other work. */
  plugins: [requireFonts(), projects(), llmsTxt(), stripHtmlComments()],
  build: {
    // es2020 for dynamic import() — the lazy cuelume load in src/js/sound.js
    target: 'es2020',
    outDir: 'dist',
  },
});
