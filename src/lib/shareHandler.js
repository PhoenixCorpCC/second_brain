const CACHE_NAME = 'share-target-v1'
const SHARE_DATA_KEY = '/share-data'

export async function readSharedData() {
  if (!('caches' in window)) return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const response = await cache.match(SHARE_DATA_KEY)
    if (!response) return null
    const data = await response.json()
    await cache.delete(SHARE_DATA_KEY)
    return data
  } catch {
    return null
  }
}

export function isShareReturn() {
  return new URLSearchParams(window.location.search).get('source') === 'share'
}

export function clearShareParam() {
  const url = new URL(window.location.href)
  url.searchParams.delete('source')
  window.history.replaceState({}, '', url.toString())
}
