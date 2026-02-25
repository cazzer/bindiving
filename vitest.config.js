import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['app/**/*.test.js', 'app/**/*.test.mjs'],
    exclude: ['node_modules', 'netlify/**']
  }
})
