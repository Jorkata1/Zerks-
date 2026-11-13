// One HTML file with everything inside (code, models, fonts), so the build opens from a single link on the phone.
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [viteSingleFile()],
  build: { target: 'es2022', assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 20_000, modulePreload: { polyfill: false } },
  esbuild: { target: 'es2022' },
})
