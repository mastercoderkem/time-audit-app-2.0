'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Settings {
  id: string
  user_id: string
  check_in_frequency: number
  notifications_enabled: boolean
  is_paused: boolean
}

export default function SettingsForm({ settings }: { settings: Settings | null }) {
  const [frequency, setFrequency] = useState(settings?.check_in_frequency || 15)
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    settings?.notifications_enabled ?? true
  )
  const [isPaused, setIsPaused] = useState(settings?.is_paused || false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        check_in_frequency: frequency,
        notifications_enabled: notificationsEnabled,
        is_paused: isPaused,
      })
      .eq('user_id', user.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Check-in Frequency
        </label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={5}>Every 5 minutes</option>
          <option value={15}>Every 15 minutes</option>
          <option value={30}>Every 30 minutes</option>
          <option value={60}>Every hour</option>
          <option value={120}>Every 2 hours</option>
        </select>
        <p className="text-sm text-gray-500 mt-1">
          How often you want to be reminded to log your activity
        </p>
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
        <div>
          <label className="text-sm font-medium text-gray-700">
            Enable Notifications
          </label>
          <p className="text-sm text-gray-500">
            Receive browser notifications for check-ins
          </p>
        </div>
        <input
          type="checkbox"
          checked={notificationsEnabled}
          onChange={(e) => setNotificationsEnabled(e.target.checked)}
          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
        <div>
          <label className="text-sm font-medium text-gray-700">
            Pause Tracking
          </label>
          <p className="text-sm text-gray-500">
            Temporarily stop receiving check-in notifications
          </p>
        </div>
        <input
          type="checkbox"
          checked={isPaused}
          onChange={(e) => setIsPaused(e.target.checked)}
          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="text-green-600 text-sm bg-green-50 p-3 rounded">
          Settings saved successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  )
}
