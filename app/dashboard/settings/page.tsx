import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/dashboard/SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch or create user settings
  let { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // If no settings exist, create default ones
  if (!settings) {
    const { data: newSettings } = await supabase
      .from('user_settings')
      .insert({
        user_id: user.id,
        check_in_frequency: 15,
        notifications_enabled: true,
        is_paused: false,
      })
      .select()
      .single()

    settings = newSettings
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your time audit preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <SettingsForm settings={settings} />
      </div>
    </div>
  )
}
