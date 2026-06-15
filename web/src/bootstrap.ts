/**
 * Bootstraps runtime configuration before the React bundle mounts.
 *
 * Deployments inject `/skillhub/runtime-config.js` at startup, and this file guarantees the app sees either
 * that config or a safe fallback object before importing the main entry.
 */
import './legacy-polyfills'
import { APP_BASE_PATH } from '@/shared/lib/app-base'

async function loadRuntimeConfig() {
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${APP_BASE_PATH}/runtime-config.js`
    script.async = false
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load runtime config'))
    document.head.appendChild(script)
  })
}

function ensureRuntimeConfigFallback() {
  if (!window.__SKILLHUB_RUNTIME_CONFIG__) {
    window.__SKILLHUB_RUNTIME_CONFIG__ = {
      apiBaseUrl: APP_BASE_PATH,
      appBaseUrl: `${window.location.origin}${APP_BASE_PATH}`,
      authDirectEnabled: 'false',
      authDirectProvider: '',
      authSessionBootstrapEnabled: 'false',
      authSessionBootstrapProvider: '',
      authSessionBootstrapAuto: 'false',
    }
  }
}

void (async () => {
  try {
    await loadRuntimeConfig()
  } catch (error) {
    console.error(error)
    ensureRuntimeConfigFallback()
  }

  await import('./main')
})()
