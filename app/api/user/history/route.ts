import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { firestoreService } from '@/lib/services/firestoreService'
import { CompletedTrip, TravelHistoryResponse, EnvironmentalMetrics, TrendData } from '@/lib/types'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile to get userId
    const userProfile = await firestoreService.getUserProfile(session.user.email)
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit')
    const period = searchParams.get('period') as 'week' | 'month' | 'year' | null

    // Parse date range if provided
    let dateRange: { start: Date; end: Date } | undefined
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    }

    // Get user trips with optional filtering
    const trips = await firestoreService.getUserTrips(userProfile.id, {
      limit: limit ? parseInt(limit) : undefined,
      startAfter: dateRange?.start,
      endBefore: dateRange?.end
    })

    // Calculate cumulative impact metrics
    const cumulativeImpact = await firestoreService.getUserEnvironmentalMetrics(
      userProfile.id,
      dateRange
    )

    // Get trend data
    const trends = await firestoreService.getUserTrends(
      userProfile.id,
      period || 'month',
      12
    )

    const response: TravelHistoryResponse = {
      trips,
      cumulativeImpact,
      trends
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching travel history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile to get userId
    const userProfile = await firestoreService.getUserProfile(session.user.email)
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { route, carbonFootprint, carbonSaved, completedAt } = body

    // Validate required fields
    if (!route || typeof carbonFootprint !== 'number' || typeof carbonSaved !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: route, carbonFootprint, carbonSaved' },
        { status: 400 }
      )
    }

    // Create trip data
    const tripData = {
      route,
      carbonFootprint,
      carbonSaved,
      completedAt: completedAt ? new Date(completedAt) : new Date()
    }

    // Save trip to database
    const savedTrip = await firestoreService.saveTrip(userProfile.id, tripData)

    return NextResponse.json(savedTrip, { status: 201 })
  } catch (error) {
    console.error('Error saving trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}