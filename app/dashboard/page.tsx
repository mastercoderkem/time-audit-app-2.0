import { createClient } from '@/lib/supabase/server'
import ActivityForm from '@/components/dashboard/ActivityForm'
import ActivityList from '@/components/dashboard/ActivityList'
import NotificationManager from '@/components/dashboard/NotificationManager'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch available dates (lightweight query - just dates with activity counts)
  const { data: dateCounts } = await supabase
    .from('activities')
    .select('logged_at')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })

  // Get most recent activity for "Same as Previous" button
  const { data: recentActivity } = await supabase
    .from('activities')
    .select('activity_text')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })
    .limit(1)
    .single()

  // Fetch user settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Time Audit</h1>
        <p className="text-gray-600">
          {settings?.is_paused
            ? '⏸️ Notifications are paused'
            : `✓ Checking in every ${settings?.check_in_frequency || 15} minutes`}
        </p>
      </div>

      <NotificationManager
        frequency={settings?.check_in_frequency || 15}
        enabled={settings?.notifications_enabled ?? true}
        isPaused={settings?.is_paused || false}
      />

      <div className="grid gap-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Log Activity</h2>
          <ActivityForm lastActivity={recentActivity?.activity_text} />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activities</h2>
          <ActivityList availableDates={dateCounts || []} />
        </div>
      </div>
    </div>
  )
}
