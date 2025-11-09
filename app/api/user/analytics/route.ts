import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { firestoreService } from '@/lib/services/firestoreService'
import { EnvironmentalMetrics, TrendData, CompletedTrip } from '@/lib/types'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

interface AnalyticsResponse {
  metrics: EnvironmentalMetrics
  trends: TrendData[]
  insights: {
    mostSustainableMonth: string
    averageTripsPerMonth: number
    topTransportModes: Array<{ mode: string; count: number; carbonSaved: number }>
    sustainabilityImprovement: number
    goalProgress?: {
      target: number
      current: number
      percentage: number
    }
  }
  monthlyMetrics: Array<{
    month: string
    carbonFootprint: number
    carbonSaved: number
    tripCount: number
    sustainabilityScore: number
  }>
  yearlyMetrics: Array<{
    year: string
    carbonFootprint: number
    carbonSaved: number
    tripCount: number
    sustainabilityScore: number
  }>
}

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
    const period = searchParams.get('period') as 'month' | 'year' | null
    const limit = searchParams.get('limit')

    // Get overall metrics
    const metrics = await firestoreService.getUserEnvironmentalMetrics(userProfile.id)

    // Get trend data for different periods
    const monthlyTrends = await firestoreService.getUserTrends(
      userProfile.id,
      'month',
      12
    )
    
    const yearlyTrends = await firestoreService.getUserTrends(
      userProfile.id,
      'year',
      5
    )

    // Get all trips for detailed analysis
    const allTrips = await firestoreService.getUserTrips(userProfile.id, {
      limit: limit ? parseInt(limit) : 1000
    })

    // Calculate insights
    const insights = await calculateInsights(allTrips, monthlyTrends)

    // Format monthly and yearly metrics
    const monthlyMetrics = monthlyTrends.map(trend => ({
      month: trend.period,
      carbonFootprint: trend.carbonFootprint,
      carbonSaved: trend.carbonSaved,
      tripCount: allTrips.filter(trip => {
        const tripMonth = trip.completedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        return tripMonth === trend.period
      }).length,
      sustainabilityScore: trend.sustainabilityScore
    }))

    const yearlyMetrics = yearlyTrends.map(trend => ({
      year: trend.period,
      carbonFootprint: trend.carbonFootprint,
      carbonSaved: trend.carbonSaved,
      tripCount: allTrips.filter(trip => {
        const tripYear = trip.completedAt.getFullYear().toString()
        return tripYear === trend.period
      }).length,
      sustainabilityScore: trend.sustainabilityScore
    }))

    const response: AnalyticsResponse = {
      metrics,
      trends: period === 'year' ? yearlyTrends : monthlyTrends,
      insights,
      monthlyMetrics,
      yearlyMetrics
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function calculateInsights(
  trips: CompletedTrip[],
  monthlyTrends: TrendData[]
): Promise<AnalyticsResponse['insights']> {
  // Find most sustainable month
  const mostSustainableMonth = monthlyTrends.reduce((best, current) => 
    current.sustainabilityScore > best.sustainabilityScore ? current : best,
    monthlyTrends[0] || { period: 'N/A', sustainabilityScore: 0 }
  ).period

  // Calculate average trips per month
  const monthsWithTrips = monthlyTrends.filter(trend => trend.carbonFootprint > 0).length
  const averageTripsPerMonth = monthsWithTrips > 0 ? trips.length / monthsWithTrips : 0

  // Analyze transport modes
  const transportModeStats = new Map<string, { count: number; carbonSaved: number }>()
  
  trips.forEach(trip => {
    trip.route.transportModes.forEach(segment => {
      const current = transportModeStats.get(segment.mode) || { count: 0, carbonSaved: 0 }
      transportModeStats.set(segment.mode, {
        count: current.count + 1,
        carbonSaved: current.carbonSaved + (trip.carbonSaved / trip.route.transportModes.length)
      })
    })
  })

  const topTransportModes = Array.from(transportModeStats.entries())
    .map(([mode, stats]) => ({ mode, ...stats }))
    .sort((a, b) => b.carbonSaved - a.carbonSaved)
    .slice(0, 5)

  // Calculate sustainability improvement (comparing first 3 months to last 3 months)
  const recentTrends = monthlyTrends.slice(-3)
  const earlierTrends = monthlyTrends.slice(0, 3)
  
  const recentAvgScore = recentTrends.reduce((sum, trend) => sum + trend.sustainabilityScore, 0) / recentTrends.length
  const earlierAvgScore = earlierTrends.reduce((sum, trend) => sum + trend.sustainabilityScore, 0) / earlierTrends.length
  
  const sustainabilityImprovement = recentAvgScore - earlierAvgScore

  // Goal progress (example: 50% reduction in carbon footprint compared to conventional methods)
  const totalConventionalFootprint = trips.reduce((sum, trip) => 
    sum + trip.carbonFootprint + trip.carbonSaved, 0
  )
  const actualFootprint = trips.reduce((sum, trip) => sum + trip.carbonFootprint, 0)
  const targetReduction = 0.5 // 50% reduction goal
  const actualReduction = totalConventionalFootprint > 0 
    ? (totalConventionalFootprint - actualFootprint) / totalConventionalFootprint 
    : 0

  const goalProgress = {
    target: targetReduction * 100,
    current: actualReduction * 100,
    percentage: targetReduction > 0 ? (actualReduction / targetReduction) * 100 : 0
  }

  return {
    mostSustainableMonth,
    averageTripsPerMonth: Math.round(averageTripsPerMonth * 10) / 10,
    topTransportModes,
    sustainabilityImprovement: Math.round(sustainabilityImprovement * 10) / 10,
    goalProgress
  }
}