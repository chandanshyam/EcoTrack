'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function Header() {
  const { data: session, status } = useSession()

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="text-xl font-bold text-gray-900">EcoTrack</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-green-600 transition-colors">
              Plan Trip
            </Link>
            {session && (
              <>
                <Link href="/dashboard" className="text-gray-700 hover:text-green-600 transition-colors">
                  Dashboard
                </Link>
                <Link href="/history" className="text-gray-700 hover:text-green-600 transition-colors">
                  History
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            ) : session ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {session.user.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {session.user.name}
                  </span>
                </div>
                <Button
                  onClick={() => signOut()}
                  variant="outline"
                  size="sm"
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => signIn()}
                size="sm"
              >
                Sign in
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}