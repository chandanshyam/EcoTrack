import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { firestoreService } from '@/lib/services/firestoreService'
import { EnvironmentalMetrics, TrendData, CompletedTrip, TransportMode } from '@/lib/types'
import { CARBON_EMISSION_FACTORS } from '@/lib/services/carbonCalculationService'

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

    // Get user profile (don't auto-create for analytics)
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

    // Recalculate total carbon saved from segments (more accurate than stored trip.carbonSaved)
    const recalculatedCarbonSaved = calculateTotalCarbonSavedFromSegments(allTrips)

    // Override metrics with recalculated carbon saved
    const updatedMetrics = {
      ...metrics,
      totalCarbonSaved: recalculatedCarbonSaved
    }

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
      metrics: updatedMetrics,
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

/**
 * Calculate total carbon saved by summing per-segment savings
 * This is more accurate than using stored trip.carbonSaved values
 */
function calculateTotalCarbonSavedFromSegments(trips: CompletedTrip[]): number {
  const carEmissionFactor = CARBON_EMISSION_FACTORS[TransportMode.CAR].base // 0.338 kg CO2e per mile
  let totalCarbonSaved = 0

  trips.forEach(trip => {
    trip.route.transportModes.forEach(segment => {
      // Calculate what a car would emit for this segment's distance
      const carEmissionsForSegment = segment.distance * carEmissionFactor

      // Calculate carbon saved for this specific segment (only positive values)
      const segmentCarbonSaved = Math.max(0, carEmissionsForSegment - segment.carbonEmission)

      totalCarbonSaved += segmentCarbonSaved
    })
  })

  return totalCarbonSaved
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

  // Calculate average trips per month based on actual trip dates
  const uniqueMonths = new Set<string>()
  trips.forEach(trip => {
    const monthKey = `${trip.completedAt.getFullYear()}-${String(trip.completedAt.getMonth() + 1).padStart(2, '0')}`
    uniqueMonths.add(monthKey)
  })
  const monthsWithTrips = uniqueMonths.size
  const averageTripsPerMonth = monthsWithTrips > 0 ? trips.length / monthsWithTrips : 0

  // Analyze transport modes
  // Calculate carbon saved per segment compared to driving that distance
  const carEmissionFactor = CARBON_EMISSION_FACTORS[TransportMode.CAR].base // 0.338 kg CO2e per mile
  const transportModeStats = new Map<string, { count: number; carbonSaved: number }>()

  trips.forEach(trip => {
    trip.route.transportModes.forEach(segment => {
      const current = transportModeStats.get(segment.mode) || { count: 0, carbonSaved: 0 }

      // Calculate what a car would emit for this segment's distance
      const carEmissionsForSegment = segment.distance * carEmissionFactor

      // Calculate carbon saved for this specific segment (only positive values)
      const segmentCarbonSaved = Math.max(0, carEmissionsForSegment - segment.carbonEmission)

      transportModeStats.set(segment.mode, {
        count: current.count + 1,
        carbonSaved: current.carbonSaved + segmentCarbonSaved
      })
    })
  })

  const topTransportModes = Array.from(transportModeStats.entries())
    .map(([mode, stats]) => ({ mode, ...stats }))
    .sort((a, b) => b.carbonSaved - a.carbonSaved)
    .slice(0, 5)

  // Calculate sustainability improvement (comparing first 3 months to last 3 months based on actual trips)
  let sustainabilityImprovement = 0

  if (trips.length >= 2) {
    // Group trips by month
    const tripsByMonth = new Map<string, CompletedTrip[]>()
    trips.forEach(trip => {
      const monthKey = `${trip.completedAt.getFullYear()}-${String(trip.completedAt.getMonth() + 1).padStart(2, '0')}`
      if (!tripsByMonth.has(monthKey)) {
        tripsByMonth.set(monthKey, [])
      }
      tripsByMonth.get(monthKey)!.push(trip)
    })

    // Sort months chronologically
    const sortedMonths = Array.from(tripsByMonth.keys()).sort()

    if (sortedMonths.length >= 2) {
      // Get first and last 3 months (or however many we have)
      const monthsToCompare = Math.min(3, Math.floor(sortedMonths.length / 2))
      const earlierMonths = sortedMonths.slice(0, monthsToCompare)
      const recentMonths = sortedMonths.slice(-monthsToCompare)

      // Calculate average scores for earlier months
      let earlierTotalScore = 0
      let earlierTripCount = 0
      earlierMonths.forEach(month => {
        tripsByMonth.get(month)!.forEach(trip => {
          earlierTotalScore += trip.route.sustainabilityScore
          earlierTripCount++
        })
      })
      const earlierAvgScore = earlierTripCount > 0 ? earlierTotalScore / earlierTripCount : 0

      // Calculate average scores for recent months
      let recentTotalScore = 0
      let recentTripCount = 0
      recentMonths.forEach(month => {
        tripsByMonth.get(month)!.forEach(trip => {
          recentTotalScore += trip.route.sustainabilityScore
          recentTripCount++
        })
      })
      const recentAvgScore = recentTripCount > 0 ? recentTotalScore / recentTripCount : 0

      sustainabilityImprovement = recentAvgScore - earlierAvgScore
    }
  }

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