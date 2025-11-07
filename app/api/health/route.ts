import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitor } from '@/lib/utils/performance'
import { databaseHealthChecker } from '@/lib/utils/database'

export async function GET(request: NextRequest) {
  const endTiming: (metadata?: Record<string, any>) => void = performanceMonitor.startTiming('api-health-check');
  const startTime = Date.now();

  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  const services = {
    googleMaps: {
      configured: !!googleMapsKey,
      status: googleMapsKey ? 'Ready' : 'Missing API Key',
      details: {
        hasKey: !!googleMapsKey,
        keyLength: googleMapsKey?.length || 0
      }
    },
    gemini: {
      configured: !!geminiKey,
      status: geminiKey ? 'Ready' : 'Missing API Key',
      details: {
        hasKey: !!geminiKey,
        keyLength: geminiKey?.length || 0
      }
    },
    firebase: {
      configured: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL),
      status: (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL)
        ? 'Ready' : 'Missing Configuration',
      details: {
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        projectId: process.env.FIREBASE_PROJECT_ID || 'Not set'
      }
    },
    auth: {
      configured: !!(process.env.NEXTAUTH_SECRET && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      status: process.env.NEXTAUTH_SECRET
        ? (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? 'Ready' : 'Missing OAuth Credentials')
        : 'Missing NextAuth Secret',
      details: {
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000'
      }
    }
  }

  const allConfigured = Object.values(services).every(service => service.configured)
  const criticalServices = ['googleMaps', 'gemini', 'auth']
  const criticalConfigured = criticalServices.every(service => services[service as keyof typeof services].configured)

  // Check database health
  const dbHealthy = await databaseHealthChecker.checkHealth()
  
  // Get performance metrics
  const performanceStats = performanceMonitor.getSummary()
  const responseTime = Date.now() - startTime

  // Test basic functionality
  const functionalityTests = {
    canPlanTrips: services.googleMaps.configured && services.gemini.configured,
    canAuthenticate: services.auth.configured,
    canSaveData: services.firebase.configured,
    canAccessProfile: services.auth.configured && services.firebase.configured
  }

  const overallHealthy = allConfigured && dbHealthy
  
  endTiming({ 
    healthy: overallHealthy, 
    responseTime,
    dbHealthy,
    servicesConfigured: allConfigured 
  })

  return NextResponse.json({
    status: overallHealthy ? 'Healthy' : criticalConfigured && dbHealthy ? 'Degraded' : 'Unhealthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    responseTime,
    server: {
      port: process.env.PORT || '3001',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    },
    services,
    database: {
      healthy: dbHealthy,
      status: dbHealthy ? 'Connected' : 'Connection Issues'
    },
    functionality: functionalityTests,
    performance: {
      summary: performanceStats,
      healthCheckTime: responseTime
    },
    recommendations: [
      !services.auth.configured && '🔑 Set up Google OAuth: Go to Google Cloud Console → Credentials → Create OAuth 2.0 Client',
      !services.googleMaps.configured && '🗺️ Add Google Maps API key with proper permissions',
      !services.gemini.configured && '🤖 Add Gemini AI API key from Google AI Studio',
      !services.firebase.configured && '🔥 Configure Firebase credentials for data persistence',
      !dbHealthy && '🔥 Database connection issues detected',
      services.auth.configured && services.googleMaps.configured && services.gemini.configured && dbHealthy && '✅ All services ready! Try planning a trip.'
    ].filter(Boolean),
    quickTests: {
      healthEndpoint: '✅ Working (you\'re seeing this)',
      environmentVariables: allConfigured ? '✅ All set' : '⚠️ Some missing',
      coreServices: criticalConfigured ? '✅ Ready' : '❌ Need setup',
      database: dbHealthy ? '✅ Connected' : '❌ Issues detected'
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
  }, {
    status: overallHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}
export async function HEAD() {
  // Simple health check for monitoring systems
  try {
    const dbHealthy = await databaseHealthChecker.checkHealth()
    const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const envHealthy = !!(googleMapsKey && geminiKey)

    return new NextResponse(null, {
      status: dbHealthy && envHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}