'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PendingActivityStorage } from '@/lib/storage/pending-activities'

interface ActivityFormProps {
  lastActivity?: string
}

export default function ActivityForm({ lastActivity }: ActivityFormProps) {
  const [activity, setActivity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Auto-focus when window/tab regains focus
  useEffect(() => {
    const handleFocus = () => {
      textareaRef.current?.focus()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Sync pending activities on mount and periodically
  useEffect(() => {
    syncPendingActivities()

    // Retry failed activities every 30 seconds
    const interval = setInterval(syncPendingActivities, 30000)
    return () => clearInterval(interval)
  }, [])

  async function syncPendingActivities() {
    const pending = PendingActivityStorage.getPending()
    if (pending.length === 0) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    for (const activity of pending) {
      try {
        const { error: insertError } = await supabase
          .from('activities')
          .insert({
            user_id: activity.user_id,
            activity_text: activity.activity_text,
            logged_at: activity.logged_at,
          })

        if (insertError) {
          console.error('Error syncing activity:', insertError)
          PendingActivityStorage.markFailed(activity.id)
        } else {
          PendingActivityStorage.markConfirmed(activity.id)
        }
      } catch (err) {
        console.error('Network error syncing activity:', err)
        PendingActivityStorage.markFailed(activity.id)
      }
    }

    // Refresh to show updated data
    router.refresh()
  }

  async function handleSubmit(e?: React.FormEvent, activityText?: string) {
    if (e) e.preventDefault()

    const textToLog = activityText || activity
    if (!textToLog.trim()) return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    // Generate temporary local ID
    const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    // Save to localStorage FIRST (optimistic)
    PendingActivityStorage.addPending({
      id: localId,
      user_id: user.id,
      activity_text: textToLog.trim(),
      logged_at: now,
      created_at: now,
    })

    // Clear form immediately (optimistic UI)
    setActivity('')
    setLoading(false)
    router.refresh()

    // Then try to save to Supabase
    try {
      const { error: insertError } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          activity_text: textToLog.trim(),
          logged_at: now,
        })

      if (insertError) {
        console.error('Error inserting to Supabase:', insertError)
        PendingActivityStorage.markFailed(localId)
        setError('Activity saved locally, will retry sync')
      } else {
        // Mark as confirmed in localStorage
        PendingActivityStorage.markConfirmed(localId)
      }
    } catch (err) {
      console.error('Network error:', err)
      PendingActivityStorage.markFailed(localId)
      setError('Activity saved locally, will retry sync')
    }

    // Final refresh to update UI with confirmed status
    setTimeout(() => router.refresh(), 1000)
  }

  function handleSameAsPrevious() {
    if (lastActivity) {
      handleSubmit(undefined, lastActivity)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd+Enter or Ctrl+Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="activity" className="block text-sm font-medium text-gray-700 mb-2">
          What have you been working on?
        </label>
        <textarea
          id="activity"
          ref={textareaRef}
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="E.g., Responded to emails, worked on project X, had a meeting..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 placeholder:text-gray-500"
          rows={3}
          required
        />
        <p className="text-xs text-gray-500 mt-1">Press ⌘+Enter to submit</p>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !activity.trim()}
          className={`${lastActivity ? 'w-3/4' : 'w-full'} bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? 'Logging...' : 'Log Activity'}
        </button>
        {lastActivity && (
          <button
            type="button"
            onClick={handleSameAsPrevious}
            disabled={loading}
            className="w-1/4 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Same as Previous
          </button>
        )}
      </div>
    </form>
  )
}
