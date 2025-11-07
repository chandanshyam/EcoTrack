'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function Header() {
  const { data: session, status } = useSession()

  return (
    <header className="bg-neo-black border-b-4 border-neo-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 hover-glitch">
              <div className="card-green p-2">
                <span className="text-brutal text-2xl">E</span>
              </div>
              <span className="heading-brutal text-2xl text-neo-white">ECOTRACK</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="btn-secondary text-sm py-2 px-4 hover:bg-neo-cyan transition-colors">
              PLAN TRIP
            </Link>
            {session && (
              <>
                <Link href="/dashboard" className="btn-secondary text-sm py-2 px-4 hover:bg-neo-pink transition-colors">
                  DASHBOARD
                </Link>
                <Link href="/history" className="btn-secondary text-sm py-2 px-4 hover:bg-neo-orange transition-colors">
                  HISTORY
                </Link>
                <Link href="/preferences" className="btn-secondary text-sm py-2 px-4 hover:bg-neo-yellow transition-colors">
                  SETTINGS
                </Link>
              </>
            )}
          </nav>

          {/* User Section */}
          <div className="flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="bg-neo-lime border-4 border-neo-black shadow-brutal-sm p-3">
                <div className="w-6 h-6 bg-neo-black animate-pulse"></div>
              </div>
            ) : session ? (
              <div className="flex items-center space-x-3">
                {session.user.image && (
                  <Link href="/profile" className="bg-neo-teal border-4 border-neo-black shadow-brutal-sm p-2 hover:translate-x-1 hover:translate-y-1 transition-transform">
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-8 h-8 border-2 border-neo-black"
                    />
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="bg-neo-red border-4 border-neo-black shadow-brutal-sm text-neo-white font-bold uppercase tracking-wide py-2 px-6 transition-all duration-200 hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                >
                  SIGN OUT
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className="bg-neo-lime border-4 border-neo-black shadow-brutal text-neo-black font-bold uppercase tracking-wide py-3 px-8 text-base transition-all duration-200 hover:translate-x-1 hover:translate-y-1 hover:shadow-brutal-sm active:translate-x-2 active:translate-y-2 active:shadow-none"
              >
                SIGN IN/UP
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}