export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined

  try {
    const parsed = new URL(url, window.location.origin)
    const isLocalBackend = ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)
    if (isLocalBackend && parsed.pathname.startsWith('/media/')) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    return url
  }

  return url
}