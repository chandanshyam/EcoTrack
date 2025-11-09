'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Header from '@/components/Header'
import SustainabilityDashboard from '@/components/SustainabilityDashboard'
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

        {/* Sustainability Dashboard */}
        <SustainabilityDashboard className="mb-12" />

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
            <Link href="/preferences">
              <button className="btn-secondary w-full text-lg py-4">
                EDIT PREFERENCES
              </button>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-brutal">
          <h2 className="heading-brutal text-3xl mb-6">QUICK ACTIONS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/" className="block">
              <div className="card-green p-6 text-center hover:translate-x-1 hover:translate-y-1 transition-transform">
                <svg className="w-12 h-12 mx-auto text-neo-black mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <h3 className="heading-brutal text-lg mb-2">PLAN TRIP</h3>
                <p className="text-brutal text-sm">Find sustainable routes</p>
              </div>
            </Link>

            <Link href="/history" className="block">
              <div className="card-cyan p-6 text-center hover:translate-x-1 hover:translate-y-1 transition-transform">
                <svg className="w-12 h-12 mx-auto text-neo-black mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="heading-brutal text-lg mb-2">VIEW HISTORY</h3>
                <p className="text-brutal text-sm">Review past trips</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}