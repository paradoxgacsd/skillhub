export const APP_BASE_PATH = '/skillhub'
export const DEFAULT_REGISTRY_URL = 'https://dev-integ-env.iflyrec.com'

type RuntimeConfigLike = {
  appBaseUrl?: string
  apiBaseUrl?: string
}

function trimTrailingSlash(value: string): string {
  if (value.length > 1 && value.endsWith('/')) {
    return value.slice(0, -1)
  }
  return value
}

function normalizeConfiguredBaseUrl(value?: string): string | null {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }
  return trimTrailingSlash(trimmed)
}

function normalizeOrigin(origin: string): string {
  return trimTrailingSlash(origin)
}

function hasAppBasePath(value: string): boolean {
  return value === APP_BASE_PATH || value.endsWith(APP_BASE_PATH)
}

export function getBrowserOrigin(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  const locationOrigin = window.location?.origin
  if (locationOrigin) {
    return normalizeOrigin(locationOrigin)
  }

  const protocol = window.location?.protocol
  const host = window.location?.host
  if (protocol && host) {
    return normalizeOrigin(`${protocol}//${host}`)
  }

  return ''
}

export function ensureAppBaseUrl(baseUrl: string): string {
  const normalizedBaseUrl = trimTrailingSlash(baseUrl.trim())
  if (!normalizedBaseUrl) {
    return APP_BASE_PATH
  }
  if (hasAppBasePath(normalizedBaseUrl)) {
    return normalizedBaseUrl
  }
  return `${normalizedBaseUrl}${APP_BASE_PATH}`
}

export function getRuntimeAppBaseUrl(runtimeConfig?: RuntimeConfigLike): string | null {
  const configuredUrl = normalizeConfiguredBaseUrl(runtimeConfig?.appBaseUrl)
  if (configuredUrl && !configuredUrl.includes('localhost')) {
    const appBaseUrl = ensureAppBaseUrl(configuredUrl)
    if (appBaseUrl.startsWith('/')) {
      const origin = getBrowserOrigin()
      return origin ? `${origin}${appBaseUrl}` : appBaseUrl
    }
    return appBaseUrl
  }

  const origin = getBrowserOrigin()
  if (!origin) {
    return APP_BASE_PATH
  }
  return `${origin}${APP_BASE_PATH}`
}

export function getRuntimeApiBaseUrl(runtimeConfig?: RuntimeConfigLike): string {
  const configuredUrl = normalizeConfiguredBaseUrl(runtimeConfig?.apiBaseUrl)
  if (configuredUrl) {
    return configuredUrl
  }

  const origin = getBrowserOrigin()
  if (!origin) {
    return APP_BASE_PATH
  }
  return `${origin}${APP_BASE_PATH}`
}

export function prefixAppPath(path: string): string {
  if (!path || path === '/') {
    return APP_BASE_PATH
  }

  if (path === APP_BASE_PATH || path.startsWith(`${APP_BASE_PATH}/`)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${APP_BASE_PATH}${normalizedPath}`
}

export function buildAppUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  const prefixedPath = prefixAppPath(path)
  const origin = getBrowserOrigin()
  return origin ? `${origin}${prefixedPath}` : prefixedPath
}

export function stripAppBasePath(pathname: string): string {
  if (pathname === APP_BASE_PATH) {
    return '/'
  }
  if (pathname.startsWith(`${APP_BASE_PATH}/`)) {
    return pathname.slice(APP_BASE_PATH.length)
  }
  return pathname
}
