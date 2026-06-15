import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { APP_BASE_PATH } from './src/shared/lib/app-base'

const LEGACY_BROWSER_TARGETS = ['chrome83', 'edge83', 'firefox78', 'safari14']
const DEV_API_TARGET = 'http://localhost:8085'

export default defineConfig({
  base: `${APP_BASE_PATH}/`,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: LEGACY_BROWSER_TARGETS,
    cssTarget: LEGACY_BROWSER_TARGETS,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: LEGACY_BROWSER_TARGETS,
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
  server: {
    port: 3000,
    watch: {
      usePolling: true,
      interval: 150,
    },
    proxy: {
      [`${APP_BASE_PATH}/api`]: {
        target: DEV_API_TARGET,
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.slice(APP_BASE_PATH.length),
      },
      [`${APP_BASE_PATH}/oauth2`]: {
        target: DEV_API_TARGET,
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.slice(APP_BASE_PATH.length),
      },
      [`${APP_BASE_PATH}/.well-known`]: {
        target: DEV_API_TARGET,
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.slice(APP_BASE_PATH.length),
      },
      [`${APP_BASE_PATH}/login/oauth2`]: {
        target: DEV_API_TARGET,
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.slice(APP_BASE_PATH.length),
      },
    },
  },
})
