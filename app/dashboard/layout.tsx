import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/actions/auth'
import Link from 'next/link'
import MobileNav from '@/components/dashboard/MobileNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold text-blue-600">
                Time Audit
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Settings
                </Link>
              </div>
            </div>

            {/* Desktop User Info */}
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <form action={signout}>
                <button
                  type="submit"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Logout
                </button>
              </form>
            </div>

            {/* Mobile Hamburger */}
            <MobileNav userEmail={user.email || ''} />
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}
