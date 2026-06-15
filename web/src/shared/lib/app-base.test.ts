import { afterEach, describe, expect, it } from 'vitest'
import {
  APP_BASE_PATH,
  buildAppUrl,
  ensureAppBaseUrl,
  getRuntimeApiBaseUrl,
  getRuntimeAppBaseUrl,
  prefixAppPath,
  stripAppBasePath,
} from './app-base'

describe('app-base', () => {
  const originalWindow = globalThis.window

  function setMockWindow(location: Partial<Location> = {}) {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {
        location: {
          origin: 'https://skill.example.com',
          protocol: 'https:',
          host: 'skill.example.com',
          ...location,
        },
      },
    })
  }

  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: originalWindow,
      })
      return
    }

    Reflect.deleteProperty(globalThis, 'window')
  })

  it('exposes the deployment base path', () => {
    expect(APP_BASE_PATH).toBe('/skillhub')
  })

  it('prefixes app routes exactly once', () => {
    expect(prefixAppPath('/dashboard')).toBe('/skillhub/dashboard')
    expect(prefixAppPath('/skillhub/dashboard')).toBe('/skillhub/dashboard')
    expect(prefixAppPath('/')).toBe('/skillhub')
  })

  it('strips the app base path from router returnTo values', () => {
    expect(stripAppBasePath('/skillhub/dashboard/reviews')).toBe('/dashboard/reviews')
    expect(stripAppBasePath('/skillhub')).toBe('/')
    expect(stripAppBasePath('/dashboard')).toBe('/dashboard')
  })

  it('builds absolute app URLs under the base path', () => {
    setMockWindow()

    expect(buildAppUrl('/login')).toBe('https://skill.example.com/skillhub/login')
  })

  it('adds the app base path to configured app origins', () => {
    setMockWindow()

    expect(getRuntimeAppBaseUrl({ appBaseUrl: 'https://app.example.com' })).toBe('https://app.example.com/skillhub')
    expect(getRuntimeAppBaseUrl({ appBaseUrl: 'https://app.example.com/skillhub' })).toBe('https://app.example.com/skillhub')
    expect(getRuntimeAppBaseUrl({ appBaseUrl: '/skillhub' })).toBe('https://skill.example.com/skillhub')
  })

  it('falls back to the browser origin plus app base path for localhost app config', () => {
    setMockWindow()

    expect(getRuntimeAppBaseUrl({ appBaseUrl: 'http://localhost:3000' })).toBe('https://skill.example.com/skillhub')
  })

  it('uses configured api base URLs as-is and defaults to the app base path', () => {
    setMockWindow()

    expect(getRuntimeApiBaseUrl({ apiBaseUrl: '/custom' })).toBe('/custom')
    expect(getRuntimeApiBaseUrl({})).toBe('https://skill.example.com/skillhub')
  })

  it('ensures share and registry bases include the app base path', () => {
    expect(ensureAppBaseUrl('https://skill.example.com')).toBe('https://skill.example.com/skillhub')
    expect(ensureAppBaseUrl('https://skill.example.com/skillhub')).toBe('https://skill.example.com/skillhub')
  })
})
