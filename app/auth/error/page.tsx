'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Suspense } from 'react'

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'An error occurred during authentication.',
}

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  
  const errorMessage = error && errorMessages[error] 
    ? errorMessages[error] 
    : errorMessages.Default

  return (
    <Card className="p-8">
      <div className="space-y-6 text-center">
        <div className="text-red-600">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sign in failed
          </h3>
          <p className="text-sm text-gray-600">
            {errorMessage}
          </p>
        </div>
        
        <div className="space-y-3">
          <Link href="/auth/signin">
            <Button className="w-full">
              Try again
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Go home
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}

export default function AuthError() {

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
        </div>
        
        <Suspense fallback={
          <Card className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          </Card>
        }>
          <ErrorContent />
        </Suspense>
      </div>
    </div>
  )
}