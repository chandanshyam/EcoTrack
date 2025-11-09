'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Header from '@/components/Header'
import TravelHistory from '@/components/TravelHistory'

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
        <TravelHistory />
      </div>
    </div>
  )
}