'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Header from '@/components/Header'

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neo-white">
        <Header />
        <div className="container-brutal">
          <div className="space-y-6">
            <div className="bg-neo-lime border-4 border-neo-black h-12 w-1/4 animate-pulse"></div>
            <div className="space-y-4">
              <div className="bg-neo-mustard border-4 border-neo-black h-32 animate-pulse"></div>
              <div className="bg-neo-teal border-4 border-neo-black h-32 animate-pulse"></div>
              <div className="bg-neo-coral border-4 border-neo-black h-32 animate-pulse"></div>
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
        <div className="mb-8">
          <h1 className="heading-brutal text-4xl mb-4">TRAVEL HISTORY</h1>
          <div className="status-info inline-block">
            REVIEW YOUR PAST TRIPS AND ENVIRONMENTAL IMPACT
          </div>
        </div>

        <div className="card-brutal">
          <div className="text-center py-12">
            <div className="inline-block card-yellow p-6 mb-6">
              <svg className="w-16 h-16 text-neo-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="heading-brutal text-2xl mb-4">NO TRIPS YET</h2>
            <p className="text-brutal text-neo-black mb-6">
              YOUR TRAVEL HISTORY WILL APPEAR HERE ONCE YOU COMPLETE YOUR FIRST TRIP.
            </p>
            <div className="status-warning inline-block">
              TRIP HISTORY FUNCTIONALITY COMING SOON
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}