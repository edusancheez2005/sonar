// Service Worker for Sonar push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}

  const title = data.title || 'Sonar Whale Alert'
  const options = {
    body: data.body || 'New whale activity detected',
    icon: '/icon-192.png',
    badge: '/favicon-32x32.png',
    tag: data.tag || 'sonar-alert',
    data: {
      url: data.url || '/wallet-tracker',
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/wallet-tracker'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
