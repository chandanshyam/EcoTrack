'use client'

import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SignIn() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push('/')
      }
    })
  }, [router])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      const result = await signIn('google', {
        callbackUrl: '/',
        redirect: false,
      })
      
      if (result?.ok) {
        router.push('/')
      } else if (result?.error) {
        console.error('Sign in error:', result.error)
      }
    } catch (error) {
      console.error('Sign in failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neo-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="inline-block card-green p-6 mb-6">
            <svg className="w-16 h-16 text-neo-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="heading-brutal text-5xl mb-4">
            ECOTRACK
          </h1>
          <div className="card-yellow inline-block px-6 py-3">
            <p className="text-brutal text-sm">AI-POWERED SUSTAINABLE TRAVEL</p>
          </div>
        </div>

        {/* Sign In Card */}
        <div className="card-brutal">
          <h2 className="heading-brutal text-2xl mb-6 text-center">
            SIGN IN
          </h2>

          <div className="space-y-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="btn-primary w-full flex justify-center items-center space-x-3"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-brutal">
                {isLoading ? 'SIGNING IN...' : 'CONTINUE WITH GOOGLE'}
              </span>
            </button>

            <div className="divider-brutal"></div>

            <div className="status-info text-center">
              <p className="text-sm">
                PLAN SUSTAINABLE TRIPS WITH AI-POWERED INSIGHTS
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}