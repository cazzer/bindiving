import { defineConfig } from 'vite'
import { resolve } from 'path'

// Chrome extension scripts cannot use ES modules.
// We build each entry point separately as IIFE.
// BUILD_TARGET selects which entry: content | background

const target = process.env.BUILD_TARGET || 'content'

export default defineConfig(({ mode }) => {
  const apiHost = mode === 'development' ? 'http://localhost:8888' : 'https://bindiving.com'

  const entries: Record<string, { entry: string; name: string }> = {
    content: { entry: resolve(__dirname, 'src/content.ts'), name: 'BinDivingContent' },
    background: { entry: resolve(__dirname, 'src/background.ts'), name: 'BinDivingBG' },
  }

  const { entry, name } = entries[target] || entries.content

  return {
    define: { 'import.meta.env.API_HOST': JSON.stringify(apiHost) },
    build: {
      outDir: 'dist',
      emptyOutDir: target === 'content', // first build clears dist
      lib: {
        entry,
        formats: ['iife'],
        name,
        fileName: () => `${target}.js`,
      },
    },
  }
})
