'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-neo-white">
      <Header />
      <div className="container-brutal">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="heading-brutal text-4xl md:text-6xl mb-4">
            WELCOME BACK, {(session.user.name || 'TRAVELER').toUpperCase()}!
          </h1>
          <div className="card-yellow inline-block px-6 py-3">
            <p className="text-brutal">TRACK YOUR SUSTAINABLE JOURNEY</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="card-green text-center">
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-neo-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-brutal text-sm mb-2">TOTAL TRIPS</p>
            <p className="heading-brutal text-4xl">0</p>
          </div>

          <div className="card-cyan text-center">
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-neo-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <p className="text-brutal text-sm mb-2">CO₂ SAVED</p>
            <p className="heading-brutal text-4xl">0 KG</p>
          </div>

          <div className="card-pink text-center">
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-neo-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-brutal text-sm mb-2">AVG. SUSTAINABILITY</p>
            <p className="heading-brutal text-4xl">--</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="card-brutal">
            <h2 className="heading-brutal text-2xl mb-4">PLAN YOUR NEXT TRIP</h2>
            <div className="card-yellow p-4 mb-6">
              <p className="text-brutal">DISCOVER SUSTAINABLE TRAVEL OPTIONS WITH AI-POWERED ROUTE PLANNING</p>
            </div>
            <Link href="/">
              <button className="btn-primary w-full text-lg py-4">
                START PLANNING
              </button>
            </Link>
          </div>

          <div className="card-brutal">
            <h2 className="heading-brutal text-2xl mb-4">MANAGE PREFERENCES</h2>
            <div className="card-cyan p-4 mb-6">
              <p className="text-brutal">CUSTOMIZE YOUR TRAVEL PREFERENCES AND SUSTAINABILITY GOALS</p>
            </div>
            <Link href="/profile">
              <button className="btn-secondary w-full text-lg py-4">
                EDIT PROFILE
              </button>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card-brutal">
          <h2 className="heading-brutal text-3xl mb-6">RECENT ACTIVITY</h2>
          <div className="text-center py-12">
            <div className="card-yellow inline-block p-8 mb-6">
              <svg className="w-16 h-16 text-neo-black mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="heading-brutal text-2xl mb-4">NO TRIPS YET</h3>
            <div className="card-pink inline-block px-6 py-3">
              <p className="text-brutal">START PLANNING YOUR FIRST SUSTAINABLE TRIP</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}