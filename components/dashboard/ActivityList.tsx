'use client'

import { format, isToday, startOfDay } from 'date-fns'
import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'

interface Activity {
  id: string
  activity_text: string
  logged_at: string
  created_at: string
}

export default function ActivityList({ activities }: { activities: Activity[] }) {
  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups = new Map<string, Activity[]>()

    activities.forEach((activity) => {
      const date = startOfDay(new Date(activity.logged_at))
      const dateKey = date.toISOString()

      if (!groups.has(dateKey)) {
        groups.set(dateKey, [])
      }
      groups.get(dateKey)!.push(activity)
    })

    // Convert to array and sort by date (newest first)
    return Array.from(groups.entries())
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
      .map(([dateKey, acts]) => ({
        date: new Date(dateKey),
        activities: acts.sort((a, b) =>
          new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
        )
      }))
  }, [activities])

  const [selectedDateIndex, setSelectedDateIndex] = useState(0)

  function handleExport() {
    // Create a new workbook
    const workbook = XLSX.utils.book_new()

    // Add a sheet for each day
    groupedActivities.forEach((group) => {
      const sheetName = isToday(group.date)
        ? 'Today'
        : format(group.date, 'MMM d yyyy')

      // Prepare data for the sheet
      const sheetData = group.activities.map((activity) => ({
        Time: format(new Date(activity.logged_at), 'HH:mm'),
        Activity: activity.activity_text,
      }))

      // Create worksheet from data
      const worksheet = XLSX.utils.json_to_sheet(sheetData)

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    })

    // Generate filename with current date
    const filename = `time-audit-${format(new Date(), 'yyyy-MM-dd')}.xlsx`

    // Write the file
    XLSX.writeFile(workbook, filename)
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">No activities logged yet</p>
        <p className="text-sm">Start logging your activities above!</p>
      </div>
    )
  }

  const selectedGroup = groupedActivities[selectedDateIndex]

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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
        {groupedActivities.map((group, index) => {
          const dateLabel = isToday(group.date)
            ? 'Today'
            : format(group.date, 'MMM d')

          return (
            <button
              key={group.date.toISOString()}
              onClick={() => setSelectedDateIndex(index)}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                index === selectedDateIndex
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {dateLabel}
              <span className="ml-2 text-xs text-gray-400">
                ({group.activities.length})
              </span>
            </button>
          )
        })}
      </div>

      {/* Activities for selected date */}
      <div className="space-y-4">
        {selectedGroup.activities.map((activity) => (
          <div
            key={activity.id}
            className="border-l-4 border-blue-500 bg-gray-50 p-4 rounded-r-lg"
          >
            <p className="text-gray-900 mb-2">{activity.activity_text}</p>
            <p className="text-sm text-gray-500">
              {format(new Date(activity.logged_at), 'HH:mm')}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
