import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DevPerformanceOverlay } from '@/components/PerformanceDashboard'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EcoTrack - AI-Powered Sustainable Travel Planner',
  description: 'Plan eco-friendly trips with AI-powered sustainability analysis and route optimization.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <SessionProvider>
            <div className="min-h-screen bg-gray-50">
              {children}
            </div>
            <DevPerformanceOverlay />
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}