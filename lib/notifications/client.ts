/**
 * Client-side notification utilities
 */

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications')
  }

  const permission = await Notification.requestPermission()
  return permission
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker registered:', registration)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

export function checkNotificationSupport(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator
}

export function getNotificationPermission(): NotificationPermission | null {
  if (!('Notification' in window)) {
    return null
  }
  return Notification.permission
}

export async function scheduleLocalNotification(delayMs: number, frequencyMinutes: number): Promise<void> {
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted')
    return
  }

  // For browser-based notifications, we'll use setTimeout
  // In production, this would be handled by a backend service
  setTimeout(() => {
    if (document.hidden) {
      // Only show notification if tab is not active
      const timeText = frequencyMinutes === 1
        ? '1 minute'
        : `${frequencyMinutes} minutes`

      new Notification('Time Audit Check-in', {
        body: `What have you been working on for the last ${timeText}?`,
        icon: '/icon-192x192.png',
        tag: 'time-audit-check-in',
        requireInteraction: false,
      })
    }
  }, delayMs)
}

export function startNotificationSchedule(frequencyMinutes: number): NodeJS.Timeout {
  const intervalMs = frequencyMinutes * 60 * 1000

  // Schedule first notification
  scheduleLocalNotification(intervalMs, frequencyMinutes)

  // Set up recurring notifications
  const interval = setInterval(() => {
    scheduleLocalNotification(0, frequencyMinutes)
  }, intervalMs)

  return interval
}

export function stopNotificationSchedule(interval: NodeJS.Timeout): void {
  clearInterval(interval)
}
