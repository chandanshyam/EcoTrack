import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'

export async function GET(request: NextRequest) {
  const services = {
    googleMaps: {
      configured: !!env.GOOGLE_MAPS_API_KEY,
      status: env.GOOGLE_MAPS_API_KEY ? 'Ready' : 'Missing API Key',
      details: {
        hasKey: !!env.GOOGLE_MAPS_API_KEY,
        keyLength: env.GOOGLE_MAPS_API_KEY?.length || 0
      }
    },
    gemini: {
      configured: !!env.GEMINI_API_KEY,
      status: env.GEMINI_API_KEY ? 'Ready' : 'Missing API Key',
      details: {
        hasKey: !!env.GEMINI_API_KEY,
        keyLength: env.GEMINI_API_KEY?.length || 0
      }
    },
    firebase: {
      configured: !!(env.FIREBASE_PROJECT_ID && env.FIREBASE_PRIVATE_KEY && env.FIREBASE_CLIENT_EMAIL),
      status: (env.FIREBASE_PROJECT_ID && env.FIREBASE_PRIVATE_KEY && env.FIREBASE_CLIENT_EMAIL) 
        ? 'Ready' : 'Missing Configuration',
      details: {
        hasProjectId: !!env.FIREBASE_PROJECT_ID,
        hasPrivateKey: !!env.FIREBASE_PRIVATE_KEY,
        hasClientEmail: !!env.FIREBASE_CLIENT_EMAIL,
        projectId: env.FIREBASE_PROJECT_ID || 'Not set'
      }
    },
    auth: {
      configured: !!(env.NEXTAUTH_SECRET && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      status: env.NEXTAUTH_SECRET 
        ? (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? 'Ready' : 'Missing OAuth Credentials')
        : 'Missing NextAuth Secret',
      details: {
        hasSecret: !!env.NEXTAUTH_SECRET,
        hasClientId: !!env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!env.GOOGLE_CLIENT_SECRET,
        nextAuthUrl: env.NEXTAUTH_URL
      }
    }
  }

  const allConfigured = Object.values(services).every(service => service.configured)
  const criticalServices = ['googleMaps', 'gemini', 'auth']
  const criticalConfigured = criticalServices.every(service => services[service as keyof typeof services].configured)

  // Test basic functionality
  const functionalityTests = {
    canPlanTrips: services.googleMaps.configured && services.gemini.configured,
    canAuthenticate: services.auth.configured,
    canSaveData: services.firebase.configured,
    canAccessProfile: services.auth.configured && services.firebase.configured
  }

  return NextResponse.json({
    status: allConfigured ? 'All Services Ready' : criticalConfigured ? 'Core Services Ready' : 'Critical Services Missing',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    server: {
      port: process.env.PORT || '3001',
      nodeVersion: process.version,
      platform: process.platform
    },
    services,
    functionality: functionalityTests,
    recommendations: [
      !services.auth.configured && '🔑 Set up Google OAuth: Go to Google Cloud Console → Credentials → Create OAuth 2.0 Client',
      !services.googleMaps.configured && '🗺️ Add Google Maps API key with proper permissions',
      !services.gemini.configured && '🤖 Add Gemini AI API key from Google AI Studio',
      !services.firebase.configured && '🔥 Configure Firebase credentials for data persistence',
      services.auth.configured && services.googleMaps.configured && services.gemini.configured && '✅ Core services ready! Try planning a trip.'
    ].filter(Boolean),
    quickTests: {
      healthEndpoint: '✅ Working (you\'re seeing this)',
      environmentVariables: allConfigured ? '✅ All set' : '⚠️ Some missing',
      coreServices: criticalConfigured ? '✅ Ready' : '❌ Need setup'
    },
    nextSteps: !criticalConfigured ? [
      '1. Set up Google OAuth credentials',
      '2. Test authentication by clicking Sign In',
      '3. Try planning a trip from New York to Boston',
      '4. Check user profile and preferences'
    ] : [
      '✅ All core services configured!',
      'Try the app features:',
      '• Plan a sustainable trip',
      '• Sign in and save preferences',
      '• View your dashboard'
    ]
  })
}