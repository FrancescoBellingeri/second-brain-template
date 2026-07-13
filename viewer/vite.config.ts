import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Maintainer-only build. Output is one self-contained HTML file (all JS/CSS
// inlined, zero external requests) so it can be opened via file:// and
// shipped to end users who have no Node install — see viewer/README.md.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
})
