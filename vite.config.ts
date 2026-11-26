import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { releaseHtml } from './scripts/release-html';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    releaseHtml(),
    {
      name: 'fuzzs-font-licenses',
      apply: 'build',
      generateBundle() {
        for (const font of ['inter', 'space-grotesk']) {
          this.emitFile({
            type: 'asset',
            fileName: `licenses/${font}-OFL.txt`,
            source: readFileSync(`node_modules/@fontsource-variable/${font}/LICENSE`),
          });
        }
      },
    },
  ],
  appType: 'mpa',
  optimizeDeps: { include: ['three/addons/controls/OrbitControls.js'] },
  build: { license: { fileName: 'third-party-notices.md' } },
});
