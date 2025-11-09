'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

const errorMessages: Record<string, string> = {
  Configuration: 'THERE IS A PROBLEM WITH THE SERVER CONFIGURATION.',
  AccessDenied: 'YOU DO NOT HAVE PERMISSION TO SIGN IN.',
  Verification: 'THE VERIFICATION TOKEN HAS EXPIRED OR HAS ALREADY BEEN USED.',
  Default: 'AN ERROR OCCURRED DURING AUTHENTICATION.',
}

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessage = error && errorMessages[error]
    ? errorMessages[error]
    : errorMessages.Default

  return (
    <div className="card-brutal">
      <div className="space-y-6 text-center">
        <div className="inline-block bg-neo-red border-4 border-neo-black p-4">
          <svg className="w-12 h-12 text-neo-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <div>
          <h3 className="heading-brutal text-xl mb-4">
            SIGN IN FAILED
          </h3>
          <div className="status-error">
            <p className="text-sm">
              {errorMessage}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Link href="/auth/signin" className="block">
            <button className="btn-primary w-full">
              TRY AGAIN
            </button>
          </Link>
          <Link href="/" className="block">
            <button className="btn-secondary w-full">
              GO HOME
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neo-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="inline-block card-green p-6 mb-6">
            <svg className="w-16 h-16 text-neo-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="heading-brutal text-4xl mb-4">
            AUTHENTICATION ERROR
          </h1>
        </div>

        <Suspense fallback={
          <div className="card-brutal">
            <div className="text-center py-8">
              <div className="inline-block bg-neo-lime border-4 border-neo-black p-4">
                <div className="w-8 h-8 bg-neo-black animate-pulse"></div>
              </div>
            </div>
          </div>
        }>
          <ErrorContent />
        </Suspense>
      </div>
    </div>
  )
}