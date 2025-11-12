'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ActivityFormProps {
  lastActivity?: string
}

export default function ActivityForm({ lastActivity }: ActivityFormProps) {
  const [activity, setActivity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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

    const { error: insertError } = await supabase
      .from('activities')
      .insert({
        user_id: user.id,
        activity_text: textToLog.trim(),
        logged_at: new Date().toISOString(),
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setActivity('')
    setLoading(false)
    router.refresh()
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
        <button
          type="submit"
          disabled={loading || !activity.trim()}
          className={`${lastActivity ? 'w-3/4' : 'w-full'} bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? 'Logging...' : 'Log Activity'}
        </button>
      </div>
    </form>
  )
}
