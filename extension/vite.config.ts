import { defineConfig } from 'vite'
import { resolve } from 'path'

// Chrome extension scripts cannot use ES modules.
// We build content script and popup script separately as IIFE bundles,
// then copy static assets (popup.html, manifest, icons) via build.sh.

const target = process.env.BUILD_TARGET || 'popup'

export default defineConfig(({ mode }) => {
  const apiHost = mode === 'development' ? 'http://localhost:8888' : 'https://bindiving.com'

  const entry = target === 'content'
    ? resolve(__dirname, 'src/content.ts')
    : resolve(__dirname, 'src/popup.ts')

  const name = target === 'content' ? 'BinDivingContent' : 'BinDivingPopup'

  return {
    define: { 'import.meta.env.API_HOST': JSON.stringify(apiHost) },
    build: {
      outDir: 'dist',
      emptyOutDir: target === 'popup', // only first build clears dist
      lib: {
        entry,
        formats: ['iife'],
        name,
        fileName: () => `${target}.js`,
      },
    },
  }
})
