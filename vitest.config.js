import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['app/**/*.test.js', 'app/**/*.test.mjs', 'netlify/functions/**/*.test.mts'],
    exclude: ['node_modules']
  }
})
