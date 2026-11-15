// One HTML file with everything inside (code, models, fonts), so the build opens from a single link on the phone.
// VITE_ZERKS_LEVEL picks the level the build shows (src/view/layout.ts): 20 (stage 2) by default, 10 for stage 1.
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { layoutFor } from './src/view/layout'

const layout = layoutFor(process.env.VITE_ZERKS_LEVEL)

export default defineConfig({
  plugins: [viteSingleFile(), { name: 'zerks-title', transformIndexHtml: (html) => html.replace(/<title>[\s\S]*?<\/title>/, `<title>${layout.title}</title>`) }],
  build: { target: 'es2022', assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 20_000, modulePreload: { polyfill: false } },
  esbuild: { target: 'es2022' },
})
