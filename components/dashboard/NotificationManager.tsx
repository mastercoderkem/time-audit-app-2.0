'use client'

import { useEffect, useState } from 'react'
import {
  requestNotificationPermission,
  registerServiceWorker,
  checkNotificationSupport,
  getNotificationPermission,
  startNotificationSchedule,
  stopNotificationSchedule,
} from '@/lib/notifications/client'

interface NotificationManagerProps {
  frequency: number // in minutes
  enabled: boolean
  isPaused: boolean
}

export default function NotificationManager({
  frequency,
  enabled,
  isPaused,
}: NotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [supported, setSupported] = useState(false)
  const [interval, setInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setSupported(checkNotificationSupport())
    setPermission(getNotificationPermission())
  }, [])

  useEffect(() => {
    // Register service worker on mount
    if (supported) {
      registerServiceWorker()
    }
  }, [supported])

  useEffect(() => {
    // Start/stop notifications based on settings
    if (permission === 'granted' && enabled && !isPaused && supported) {
      // Clear any existing interval
      if (interval) {
        stopNotificationSchedule(interval)
      }

      // Start new interval
      const newInterval = startNotificationSchedule(frequency)
      setInterval(newInterval)

      return () => {
        if (newInterval) {
          stopNotificationSchedule(newInterval)
        }
      }
    } else {
      // Stop notifications if disabled or paused
      if (interval) {
        stopNotificationSchedule(interval)
        setInterval(null)
      }
    }
  }, [permission, enabled, isPaused, frequency, supported])

  async function handleEnableNotifications() {
    try {
      const newPermission = await requestNotificationPermission()
      setPermission(newPermission)

      if (newPermission === 'granted') {
        // Show a test notification
        new Notification('Notifications Enabled!', {
          body: 'You will now receive check-in reminders.',
          icon: '/icon-192x192.png',
        })
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error)
      alert('Failed to enable notifications. Please check your browser settings.')
    }
  }

  if (!supported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800 text-sm">
          <strong>Browser notifications are not supported</strong> in your browser.
          Please use a modern browser like Chrome, Firefox, or Safari.
        </p>
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-800 text-sm mb-2">
          <strong>Notifications are blocked</strong>
        </p>
        <p className="text-red-700 text-sm">
          Please enable notifications in your browser settings to receive check-in reminders.
        </p>
      </div>
    )
  }

  if (permission === 'default') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-blue-900 font-medium mb-1">Enable Browser Notifications</p>
            <p className="text-blue-700 text-sm">
              Get reminders to log your activities every {frequency} minutes.
            </p>
          </div>
          <button
            onClick={handleEnableNotifications}
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium"
          >
            Enable
          </button>
        </div>
      </div>
    )
  }

  if (permission === 'granted') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-green-900 font-medium mb-1">
              ✓ Notifications Enabled
            </p>
            <p className="text-green-700 text-sm">
              {isPaused
                ? '⏸️ Notifications are paused'
                : enabled
                ? `You'll receive check-ins every ${frequency} minutes`
                : 'Enable notifications in settings to start receiving reminders'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
