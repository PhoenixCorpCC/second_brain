import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Web Share Target — intercept the POST from Android
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.pathname.endsWith('/share') && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request))
  }
})

async function handleShareTarget(request) {
  try {
    const formData = await request.formData()
    const shareData = {
      title: formData.get('title') || '',
      text:  formData.get('text')  || '',
      url:   formData.get('url')   || '',
    }
    const cache = await caches.open('share-target-v1')
    await cache.put(
      new Request('/share-data'),
      new Response(JSON.stringify(shareData), { headers: { 'Content-Type': 'application/json' } })
    )
  } catch (_) { /* ignore parse errors */ }

  return Response.redirect(self.registration.scope + '?source=share', 303)
}
