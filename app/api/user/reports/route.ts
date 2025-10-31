import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { firestoreService } from '@/lib/services/firestoreService'
import { CompletedTrip, EnvironmentalMetrics, TrendData } from '@/lib/types'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

interface SustainabilityReport {
  id: string
  userId: string
  period: {
    start: Date
    end: Date
    type: 'monthly' | 'quarterly' | 'yearly'
  }
  metrics: EnvironmentalMetrics & {
    comparisonToPrevious: {
      carbonFootprintChange: number
      carbonSavedChange: number
      sustainabilityScoreChange: number
      tripCountChange: number
    }
    benchmarks: {
      nationalAverage: number
      userPercentile: number
      topPerformerGap: number
    }
  }
  achievements: Array<{
    title: string
    description: string
    date: Date
    impact: number
  }>
  recommendations: Array<{
    category: 'transport' | 'route' | 'timing' | 'planning'
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    potentialImpact: number
  }>
  detailedAnalysis: {
    transportModeBreakdown: Array<{
      mode: string
      usage: number
      emissions: number
      efficiency: number
      trend: 'improving' | 'stable' | 'declining'
    }>
    routeAnalysis: Array<{
      route: string
      frequency: number
      avgEmissions: number
      bestAlternative: string
      potentialSavings: number
    }>
    timePatterns: {
      peakTravelTimes: string[]
      sustainabilityByTimeOfDay: Array<{
        hour: number
        avgScore: number
        tripCount: number
      }>
      weekdayVsWeekend: {
        weekday: { avgScore: number; tripCount: number }
        weekend: { avgScore: number; tripCount: number }
      }
    }
  }
  generatedAt: Date
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
    const reportType = searchParams.get('type') as 'monthly' | 'quarterly' | 'yearly' || 'monthly'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Calculate report period
    const period = calculateReportPeriod(reportType, startDate, endDate)

    // Generate comprehensive report
    const report = await generateSustainabilityReport(userProfile.id, period)

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateReportPeriod(
  type: 'monthly' | 'quarterly' | 'yearly',
  startDate?: string | null,
  endDate?: string | null
): SustainabilityReport['period'] {
  const now = new Date()
  
  if (startDate && endDate) {
    return {
      start: new Date(startDate),
      end: new Date(endDate),
      type
    }
  }

  let start: Date
  let end: Date

  switch (type) {
    case 'monthly':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      break
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), quarter * 3, 1)
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0)
      break
    case 'yearly':
      start = new Date(now.getFullYear(), 0, 1)
      end = new Date(now.getFullYear(), 11, 31)
      break
  }

  return { start, end, type }
}

async function generateSustainabilityReport(
  userId: string,
  period: SustainabilityReport['period']
): Promise<SustainabilityReport> {
  // Get current period metrics
  const currentMetrics = await firestoreService.getUserEnvironmentalMetrics(userId, {
    start: period.start,
    end: period.end
  })

  // Get previous period for comparison
  const previousPeriodStart = new Date(period.start)
  const previousPeriodEnd = new Date(period.end)
  
  if (period.type === 'monthly') {
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1)
    previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() - 1)
  } else if (period.type === 'quarterly') {
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 3)
    previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() - 3)
  } else {
    previousPeriodStart.setFullYear(previousPeriodStart.getFullYear() - 1)
    previousPeriodEnd.setFullYear(previousPeriodEnd.getFullYear() - 1)
  }

  const previousMetrics = await firestoreService.getUserEnvironmentalMetrics(userId, {
    start: previousPeriodStart,
    end: previousPeriodEnd
  })

  // Calculate comparison metrics
  const comparisonToPrevious = {
    carbonFootprintChange: calculatePercentageChange(
      previousMetrics.totalCarbonFootprint,
      currentMetrics.totalCarbonFootprint
    ),
    carbonSavedChange: calculatePercentageChange(
      previousMetrics.totalCarbonSaved,
      currentMetrics.totalCarbonSaved
    ),
    sustainabilityScoreChange: calculatePercentageChange(
      previousMetrics.averageSustainabilityScore,
      currentMetrics.averageSustainabilityScore
    ),
    tripCountChange: calculatePercentageChange(
      previousMetrics.totalTrips,
      currentMetrics.totalTrips
    )
  }

  // Mock benchmarks (in real implementation, these would come from aggregated data)
  const benchmarks = {
    nationalAverage: 65, // Average sustainability score
    userPercentile: Math.min(95, Math.max(5, currentMetrics.averageSustainabilityScore + 10)),
    topPerformerGap: Math.max(0, 90 - currentMetrics.averageSustainabilityScore)
  }

  // Get trips for detailed analysis
  const trips = await firestoreService.getUserTrips(userId, {
    startAfter: period.start,
    endBefore: period.end
  })

  // Generate achievements
  const achievements = generateAchievements(currentMetrics, previousMetrics, trips)

  // Generate recommendations
  const recommendations = generateRecommendations(trips, currentMetrics)

  // Generate detailed analysis
  const detailedAnalysis = generateDetailedAnalysis(trips)

  const report: SustainabilityReport = {
    id: `report_${userId}_${period.start.getTime()}`,
    userId,
    period,
    metrics: {
      ...currentMetrics,
      comparisonToPrevious,
      benchmarks
    },
    achievements,
    recommendations,
    detailedAnalysis,
    generatedAt: new Date()
  }

  return report
}

function calculatePercentageChange(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}

function generateAchievements(
  current: EnvironmentalMetrics,
  previous: EnvironmentalMetrics,
  trips: CompletedTrip[]
): SustainabilityReport['achievements'] {
  const achievements: SustainabilityReport['achievements'] = []

  // Carbon savings milestone
  if (current.totalCarbonSaved >= 100 && previous.totalCarbonSaved < 100) {
    achievements.push({
      title: 'Carbon Saver Milestone',
      description: 'Saved over 100kg of CO2 through sustainable travel choices',
      date: new Date(),
      impact: current.totalCarbonSaved
    })
  }

  // Sustainability score improvement
  if (current.averageSustainabilityScore > previous.averageSustainabilityScore + 10) {
    achievements.push({
      title: 'Sustainability Champion',
      description: `Improved sustainability score by ${Math.round((current.averageSustainabilityScore - previous.averageSustainabilityScore) * 10) / 10} points`,
      date: new Date(),
      impact: current.averageSustainabilityScore - previous.averageSustainabilityScore
    })
  }

  // Consistent sustainable travel
  const highSustainabilityTrips = trips.filter(trip => trip.route.sustainabilityScore >= 80)
  if (highSustainabilityTrips.length >= 5) {
    achievements.push({
      title: 'Consistency Award',
      description: `Completed ${highSustainabilityTrips.length} highly sustainable trips`,
      date: new Date(),
      impact: highSustainabilityTrips.length
    })
  }

  return achievements
}

function generateRecommendations(
  trips: CompletedTrip[],
  metrics: EnvironmentalMetrics
): SustainabilityReport['recommendations'] {
  const recommendations: SustainabilityReport['recommendations'] = []

  // Analyze transport mode usage
  const modeUsage = new Map<string, { count: number; emissions: number }>()
  trips.forEach(trip => {
    trip.route.transportModes.forEach(segment => {
      const current = modeUsage.get(segment.mode) || { count: 0, emissions: 0 }
      modeUsage.set(segment.mode, {
        count: current.count + 1,
        emissions: current.emissions + segment.carbonEmission
      })
    })
  })

  // Recommend reducing high-emission transport modes
  const highEmissionModes = Array.from(modeUsage.entries())
    .filter(([mode, data]) => data.emissions / data.count > 5) // High emissions per use
    .sort((a, b) => (b[1].emissions / b[1].count) - (a[1].emissions / a[1].count))

  if (highEmissionModes.length > 0) {
    const [mode, data] = highEmissionModes[0]
    recommendations.push({
      category: 'transport',
      priority: 'high',
      title: `Reduce ${mode} Usage`,
      description: `Consider alternatives to ${mode} travel, which accounts for ${Math.round((data.emissions / metrics.totalCarbonFootprint) * 100)}% of your carbon footprint`,
      potentialImpact: Math.round(data.emissions * 0.3) // 30% reduction potential
    })
  }

  // Route optimization recommendations
  const routeFrequency = new Map<string, CompletedTrip[]>()
  trips.forEach(trip => {
    const routeKey = `${trip.route.origin.address}-${trip.route.destination.address}`
    const current = routeFrequency.get(routeKey) || []
    routeFrequency.set(routeKey, [...current, trip])
  })

  Array.from(routeFrequency.entries())
    .filter(([_, trips]) => trips.length >= 3) // Frequent routes
    .forEach(([route, routeTrips]) => {
      const avgEmissions = routeTrips.reduce((sum, trip) => sum + trip.carbonFootprint, 0) / routeTrips.length
      const bestEmissions = Math.min(...routeTrips.map(trip => trip.carbonFootprint))
      
      if (avgEmissions > bestEmissions * 1.2) { // 20% improvement potential
        recommendations.push({
          category: 'route',
          priority: 'medium',
          title: 'Optimize Frequent Route',
          description: `Your ${route.replace('-', ' to ')} route could be optimized for better sustainability`,
          potentialImpact: Math.round((avgEmissions - bestEmissions) * routeTrips.length)
        })
      }
    })

  // Planning recommendations
  if (metrics.averageSustainabilityScore < 70) {
    recommendations.push({
      category: 'planning',
      priority: 'high',
      title: 'Improve Trip Planning',
      description: 'Consider planning trips in advance to find more sustainable transport options',
      potentialImpact: Math.round(metrics.totalCarbonFootprint * 0.15) // 15% improvement potential
    })
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })
}

function generateDetailedAnalysis(trips: CompletedTrip[]): SustainabilityReport['detailedAnalysis'] {
  // Transport mode breakdown
  const modeStats = new Map<string, { usage: number; emissions: number; scores: number[] }>()
  
  trips.forEach(trip => {
    trip.route.transportModes.forEach(segment => {
      const current = modeStats.get(segment.mode) || { usage: 0, emissions: 0, scores: [] }
      modeStats.set(segment.mode, {
        usage: current.usage + 1,
        emissions: current.emissions + segment.carbonEmission,
        scores: [...current.scores, trip.route.sustainabilityScore]
      })
    })
  })

  const transportModeBreakdown = Array.from(modeStats.entries()).map(([mode, stats]) => {
    const avgScore = stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length
    const efficiency = stats.usage > 0 ? Math.round((avgScore / (stats.emissions / stats.usage)) * 10) / 10 : 0
    
    // Determine trend (simplified - would need historical data)
    const trend: 'improving' | 'stable' | 'declining' = 'stable'
    
    return {
      mode,
      usage: stats.usage,
      emissions: Math.round(stats.emissions * 100) / 100,
      efficiency,
      trend
    }
  })

  // Route analysis
  const routeStats = new Map<string, CompletedTrip[]>()
  trips.forEach(trip => {
    const routeKey = `${trip.route.origin.address} → ${trip.route.destination.address}`
    const current = routeStats.get(routeKey) || []
    routeStats.set(routeKey, [...current, trip])
  })

  const routeAnalysis = Array.from(routeStats.entries())
    .map(([route, routeTrips]) => {
      const avgEmissions = routeTrips.reduce((sum, trip) => sum + trip.carbonFootprint, 0) / routeTrips.length
      const bestTrip = routeTrips.reduce((best, trip) => 
        trip.carbonFootprint < best.carbonFootprint ? trip : best
      )
      
      return {
        route,
        frequency: routeTrips.length,
        avgEmissions: Math.round(avgEmissions * 100) / 100,
        bestAlternative: bestTrip.route.transportModes.map(m => m.mode).join(' + '),
        potentialSavings: Math.round((avgEmissions - bestTrip.carbonFootprint) * 100) / 100
      }
    })
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5)

  // Time patterns analysis
  const hourlyStats = new Map<number, { scores: number[]; count: number }>()
  let weekdayTrips: CompletedTrip[] = []
  let weekendTrips: CompletedTrip[] = []

  trips.forEach(trip => {
    const hour = trip.completedAt.getHours()
    const dayOfWeek = trip.completedAt.getDay()
    
    const current = hourlyStats.get(hour) || { scores: [], count: 0 }
    hourlyStats.set(hour, {
      scores: [...current.scores, trip.route.sustainabilityScore],
      count: current.count + 1
    })

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weekdayTrips.push(trip)
    } else {
      weekendTrips.push(trip)
    }
  })

  const sustainabilityByTimeOfDay = Array.from(hourlyStats.entries())
    .map(([hour, stats]) => ({
      hour,
      avgScore: Math.round((stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length) * 10) / 10,
      tripCount: stats.count
    }))
    .sort((a, b) => a.hour - b.hour)

  const peakTravelTimes = sustainabilityByTimeOfDay
    .sort((a, b) => b.tripCount - a.tripCount)
    .slice(0, 3)
    .map(stat => `${stat.hour}:00`)

  const weekdayAvgScore = weekdayTrips.length > 0 
    ? weekdayTrips.reduce((sum, trip) => sum + trip.route.sustainabilityScore, 0) / weekdayTrips.length 
    : 0
  const weekendAvgScore = weekendTrips.length > 0 
    ? weekendTrips.reduce((sum, trip) => sum + trip.route.sustainabilityScore, 0) / weekendTrips.length 
    : 0

  return {
    transportModeBreakdown,
    routeAnalysis,
    timePatterns: {
      peakTravelTimes,
      sustainabilityByTimeOfDay,
      weekdayVsWeekend: {
        weekday: { avgScore: Math.round(weekdayAvgScore * 10) / 10, tripCount: weekdayTrips.length },
        weekend: { avgScore: Math.round(weekendAvgScore * 10) / 10, tripCount: weekendTrips.length }
      }
    }
  }
}