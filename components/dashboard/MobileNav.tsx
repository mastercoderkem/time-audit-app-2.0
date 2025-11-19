'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signout } from '@/app/actions/auth'

interface MobileNavProps {
  userEmail: string
}

export default function MobileNav({ userEmail }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  async function handleSignout() {
    await signout()
  }

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
        aria-label="Toggle menu"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-64 bg-white shadow-xl z-50 md:hidden">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <span className="text-lg font-semibold text-gray-900">Menu</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 p-4 space-y-2">
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-3 rounded-md text-sm font-medium ${
                    pathname === '/dashboard'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-3 rounded-md text-sm font-medium ${
                    pathname === '/dashboard/settings'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Settings
                </Link>
              </nav>

              {/* User Info & Logout */}
              <div className="border-t p-4 space-y-3">
                <div className="px-4 py-2">
                  <p className="text-xs text-gray-500 mb-1">Signed in as</p>
                  <p className="text-sm text-gray-900 font-medium truncate">{userEmail}</p>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false)
                    handleSignout()
                  }}
                  className="w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md text-left"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
