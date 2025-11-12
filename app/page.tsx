import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-8 px-4">
        <div>
          <h1 className="text-6xl font-bold text-gray-900 mb-4">Time Audit</h1>
          <p className="text-xl text-gray-600">Track your time, own your day</p>
        </div>

        <div className="space-y-4">
          <p className="text-lg text-gray-700 max-w-md mx-auto">
            Get notified throughout the day to log what you're working on.
            Build awareness of how you spend your time.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/signup"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              Login
            </Link>
          </div>
        </div>

        <div className="pt-8 text-sm text-gray-500">
          <p>✓ Browser notifications</p>
          <p>✓ Customizable check-in frequency</p>
          <p>✓ Track and review your activities</p>
        </div>
      </div>
    </div>
  )
}
