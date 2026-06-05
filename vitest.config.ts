import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Default environment for renderer/component tests
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    environmentMatchGlobs: [
      // Main-process tests run in Node
      ['src/main/**', 'node'],
      // Store and lib tests don't need DOM
      ['src/renderer/src/store/**', 'node'],
      ['src/renderer/src/lib/**', 'node'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/renderer/src/lib/**',
        'src/renderer/src/store/**',
        'src/renderer/src/components/**',
        'src/main/**',
      ],
      exclude: [
        'src/main/index.ts',     // Electron bootstrap, not unit-testable
        'src/preload/**',
        '**/__tests__/**',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
    },
  },
})
