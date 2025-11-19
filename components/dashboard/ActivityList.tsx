'use client'

import { format, isToday, startOfDay, endOfDay } from 'date-fns'
import { useState, useMemo, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { PendingActivityStorage, type PendingActivity } from '@/lib/storage/pending-activities'
import { createClient } from '@/lib/supabase/client'

interface Activity {
  id: string
  activity_text: string
  logged_at: string
  created_at: string
}

interface DateActivity {
  logged_at: string
}

export default function ActivityList({ availableDates }: { availableDates: DateActivity[] }) {
  const [pendingActivities, setPendingActivities] = useState<PendingActivity[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Group available dates
  const uniqueDates = useMemo(() => {
    const dateSet = new Set<string>()

    // Add dates from Supabase
    availableDates.forEach((item) => {
      const date = startOfDay(new Date(item.logged_at))
      dateSet.add(date.toISOString())
    })

    // Add dates from pending activities
    pendingActivities.forEach((item) => {
      const date = startOfDay(new Date(item.logged_at))
      dateSet.add(date.toISOString())
    })

    // Convert to array and sort (newest first)
    return Array.from(dateSet)
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => b.getTime() - a.getTime())
  }, [availableDates, pendingActivities])

  const [selectedDateIndex, setSelectedDateIndex] = useState(0)
  const [tabScrollPosition, setTabScrollPosition] = useState(0)
  const selectedDate = uniqueDates[selectedDateIndex]

  // Pagination: show 7 tabs at a time
  const TABS_PER_PAGE = 7
  const totalPages = Math.ceil(uniqueDates.length / TABS_PER_PAGE)
  const currentPage = Math.floor(tabScrollPosition / TABS_PER_PAGE)
  const visibleDates = uniqueDates.slice(
    tabScrollPosition,
    tabScrollPosition + TABS_PER_PAGE
  )

  function scrollTabsLeft() {
    if (tabScrollPosition > 0) {
      setTabScrollPosition(Math.max(0, tabScrollPosition - TABS_PER_PAGE))
    }
  }

  function scrollTabsRight() {
    if (tabScrollPosition + TABS_PER_PAGE < uniqueDates.length) {
      setTabScrollPosition(
        Math.min(uniqueDates.length - TABS_PER_PAGE, tabScrollPosition + TABS_PER_PAGE)
      )
    }
  }

  // Load pending activities from localStorage
  useEffect(() => {
    setPendingActivities(PendingActivityStorage.getAll())
    PendingActivityStorage.cleanup()
  }, [])

  // Fetch activities for selected date
  useEffect(() => {
    if (!selectedDate) return

    async function fetchActivitiesForDate() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const startDate = startOfDay(selectedDate).toISOString()
      const endDate = endOfDay(selectedDate).toISOString()

      const { data } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', startDate)
        .lte('logged_at', endDate)
        .order('logged_at', { ascending: false })

      setActivities(data || [])
      setLoading(false)
    }

    fetchActivitiesForDate()
  }, [selectedDate])

  // Combine confirmed activities + pending for selected date
  const displayActivities = useMemo(() => {
    if (!selectedDate) return []

    const startDate = startOfDay(selectedDate).getTime()
    const endDate = endOfDay(selectedDate).getTime()

    // Filter pending activities for this date
    const pendingForDate = pendingActivities.filter((p) => {
      const activityDate = new Date(p.logged_at).getTime()
      return activityDate >= startDate && activityDate <= endDate
    })

    // Combine and remove duplicates
    const confirmedIds = new Set(activities.map(a => a.id))
    const uniquePending = pendingForDate.filter(p => !confirmedIds.has(p.id))

    return [...activities, ...uniquePending].sort((a, b) =>
      new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
    )
  }, [activities, pendingActivities, selectedDate])

  async function handleEdit(activityId: string, newText: string) {
    if (!newText.trim()) return

    const supabase = createClient()
    const { error } = await supabase
      .from('activities')
      .update({ activity_text: newText.trim() })
      .eq('id', activityId)

    if (error) {
      console.error('Error updating activity:', error)
      alert('Failed to update activity')
      return
    }

    setEditingId(null)
    // Refresh activities for current date
    const startDate = startOfDay(selectedDate).toISOString()
    const endDate = endOfDay(selectedDate).toISOString()

    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .gte('logged_at', startDate)
      .lte('logged_at', endDate)
      .order('logged_at', { ascending: false })

    setActivities(data || [])
  }

  function startEditing(activity: Activity | PendingActivity) {
    // Don't allow editing pending/failed activities
    if ('status' in activity && activity.status !== 'confirmed') return

    setEditingId(activity.id)
    setEditText(activity.activity_text)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditText('')
  }

  async function handleExport() {
    // Fetch ALL activities for export
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: allActivities } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })

    if (!allActivities) return

    // Group by date
    const groupedByDate = new Map<string, Activity[]>()
    allActivities.forEach((activity) => {
      const date = startOfDay(new Date(activity.logged_at))
      const dateKey = date.toISOString()

      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, [])
      }
      groupedByDate.get(dateKey)!.push(activity)
    })

    // Create workbook
    const workbook = XLSX.utils.book_new()

    // Add a sheet for each day
    Array.from(groupedByDate.entries())
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
      .forEach(([dateKey, acts]) => {
        const date = new Date(dateKey)
        const sheetName = isToday(date)
          ? 'Today'
          : format(date, 'MMM d yyyy')

        const sheetData = acts.map((activity) => ({
          Time: format(new Date(activity.logged_at), 'HH:mm'),
          Activity: activity.activity_text,
        }))

        const worksheet = XLSX.utils.json_to_sheet(sheetData)
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
      })

    // Generate filename
    const filename = `time-audit-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    XLSX.writeFile(workbook, filename)
  }

  if (uniqueDates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">No activities logged yet</p>
        <p className="text-sm">Start logging your activities above!</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header with Export Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition"
        >
          Export Data
        </button>
      </div>

      {/* Tabs with Pagination */}
      <div className="mb-6">
        <div className="flex items-center gap-2 border-b border-gray-200">
          {/* Left Arrow */}
          {totalPages > 1 && (
            <button
              onClick={scrollTabsLeft}
              disabled={tabScrollPosition === 0}
              className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Previous dates"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4 text-gray-600"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}

          {/* Tabs */}
          <div className="flex gap-2 flex-1 overflow-hidden">
            {visibleDates.map((date, visibleIndex) => {
              const actualIndex = tabScrollPosition + visibleIndex
              const dateLabel = isToday(date) ? 'Today' : format(date, 'MMM d')

              // Count activities for this date (only show count on selected tab)
              const startDate = startOfDay(date).getTime()
              const endDate = endOfDay(date).getTime()
              const count = [...activities, ...pendingActivities].filter((a) => {
                const activityDate = new Date(a.logged_at).getTime()
                return activityDate >= startDate && activityDate <= endDate
              }).length

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDateIndex(actualIndex)}
                  className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                    actualIndex === selectedDateIndex
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {dateLabel}
                  {actualIndex === selectedDateIndex && (
                    <span className="ml-2 text-xs text-gray-400">
                      ({count})
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Right Arrow */}
          {totalPages > 1 && (
            <button
              onClick={scrollTabsRight}
              disabled={tabScrollPosition + TABS_PER_PAGE >= uniqueDates.length}
              className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Next dates"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4 text-gray-600"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}
        </div>

        {/* Pagination indicator */}
        {totalPages > 1 && (
          <div className="text-center mt-2 text-xs text-gray-500">
            Page {currentPage + 1} of {totalPages}
          </div>
        )}
      </div>

      {/* Activities for selected date */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-4">
          {displayActivities.map((activity) => {
            const isPending = 'status' in activity && activity.status === 'pending'
            const isFailed = 'status' in activity && activity.status === 'failed'
            const isEditing = editingId === activity.id
            const canEdit = !('status' in activity) || activity.status === 'confirmed'

            return (
              <div
                key={activity.id}
                className={`border-l-4 p-4 rounded-r-lg group relative ${
                  isFailed
                    ? 'border-red-500 bg-red-50'
                    : isPending
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-blue-500 bg-gray-50'
                }`}
              >
                {isEditing ? (
                  // Edit mode
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(activity.id, editText)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <div className="flex items-start justify-between">
                      <p className="text-gray-900 mb-2 flex-1">{activity.activity_text}</p>
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <span className="text-xs text-yellow-700 font-medium">Syncing...</span>
                        )}
                        {isFailed && (
                          <span className="text-xs text-red-700 font-medium">Retry pending</span>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => startEditing(activity)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                            title="Edit activity"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4 text-gray-600"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      {format(new Date(activity.logged_at), 'HH:mm')}
                    </p>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
