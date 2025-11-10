import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { firestoreService } from '@/lib/services/firestoreService'
import { CompletedTrip, TransportMode } from '@/lib/types'
import { getOrCreateUserProfile } from '@/lib/api-helpers'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

interface PersonalizedInsight {
  id: string
  type: 'recommendation' | 'achievement' | 'trend' | 'opportunity'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  actionable: boolean
  data?: any
}

interface InsightsResponse {
  insights: PersonalizedInsight[]
  summary: {
    totalInsights: number
    highImpactInsights: number
    actionableInsights: number
  }
  travelPatterns: {
    mostFrequentRoutes: Array<{
      origin: string
      destination: string
      frequency: number
      avgCarbonFootprint: number
      improvementPotential: number
    }>
    preferredTransportModes: Array<{
      mode: TransportMode
      usage: number
      efficiency: number
    }>
    travelTiming: {
      busiestDays: string[]
      busiestHours: number[]
      seasonalPatterns: Array<{
        season: string
        tripCount: number
        avgSustainabilityScore: number
      }>
    }
  }
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

    // Get or create user profile
    const userProfile = await getOrCreateUserProfile(session.user.email, session.user.name)

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')
    const type = searchParams.get('type') as PersonalizedInsight['type'] | null

    // Get user's travel history
    const trips = await firestoreService.getUserTrips(userProfile.id, {
      limit: limit ? parseInt(limit) : 100
    })

    // Get environmental metrics
    const metrics = await firestoreService.getUserEnvironmentalMetrics(userProfile.id)

    // Analyze travel patterns
    const travelPatterns = analyzeTravelPatterns(trips)

    // Generate personalized insights
    const insights = await generatePersonalizedInsights(trips, metrics, travelPatterns)

    // Filter by type if specified
    const filteredInsights = type 
      ? insights.filter(insight => insight.type === type)
      : insights

    const response: InsightsResponse = {
      insights: filteredInsights,
      summary: {
        totalInsights: filteredInsights.length,
        highImpactInsights: filteredInsights.filter(i => i.impact === 'high').length,
        actionableInsights: filteredInsights.filter(i => i.actionable).length
      },
      travelPatterns
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching insights:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function analyzeTravelPatterns(trips: CompletedTrip[]): InsightsResponse['travelPatterns'] {
  // Analyze most frequent routes
  const routeFrequency = new Map<string, {
    count: number
    totalCarbonFootprint: number
    trips: CompletedTrip[]
  }>()

  trips.forEach(trip => {
    const routeKey = `${trip.route.origin.address} -> ${trip.route.destination.address}`
    const current = routeFrequency.get(routeKey) || { 
      count: 0, 
      totalCarbonFootprint: 0, 
      trips: [] 
    }
    
    routeFrequency.set(routeKey, {
      count: current.count + 1,
      totalCarbonFootprint: current.totalCarbonFootprint + trip.carbonFootprint,
      trips: [...current.trips, trip]
    })
  })

  const mostFrequentRoutes = Array.from(routeFrequency.entries())
    .map(([route, data]) => {
      const [origin, destination] = route.split(' -> ')
      const avgCarbonFootprint = data.totalCarbonFootprint / data.count
      
      // Calculate improvement potential based on best vs worst trip on this route
      const carbonFootprints = data.trips.map(t => t.carbonFootprint)
      const bestFootprint = Math.min(...carbonFootprints)
      const improvementPotential = avgCarbonFootprint > 0 
        ? ((avgCarbonFootprint - bestFootprint) / avgCarbonFootprint) * 100 
        : 0

      return {
        origin,
        destination,
        frequency: data.count,
        avgCarbonFootprint: Math.round(avgCarbonFootprint * 100) / 100,
        improvementPotential: Math.round(improvementPotential * 10) / 10
      }
    })
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5)

  // Analyze transport mode preferences
  const modeUsage = new Map<TransportMode, { count: number; totalEmissions: number }>()
  
  trips.forEach(trip => {
    trip.route.transportModes.forEach(segment => {
      const current = modeUsage.get(segment.mode) || { count: 0, totalEmissions: 0 }
      modeUsage.set(segment.mode, {
        count: current.count + 1,
        totalEmissions: current.totalEmissions + segment.carbonEmission
      })
    })
  })

  const preferredTransportModes = Array.from(modeUsage.entries())
    .map(([mode, data]) => ({
      mode,
      usage: data.count,
      efficiency: data.count > 0 ? Math.round((1 / (data.totalEmissions / data.count)) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.usage - a.usage)

  // Analyze travel timing patterns
  const dayFrequency = new Map<string, number>()
  const hourFrequency = new Map<number, number>()
  const seasonFrequency = new Map<string, { count: number; totalScore: number }>()

  trips.forEach(trip => {
    const date = trip.completedAt
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
    const hour = date.getHours()
    const month = date.getMonth()
    
    // Determine season
    let season = 'Spring'
    if (month >= 5 && month <= 7) season = 'Summer'
    else if (month >= 8 && month <= 10) season = 'Fall'
    else if (month >= 11 || month <= 1) season = 'Winter'

    dayFrequency.set(dayName, (dayFrequency.get(dayName) || 0) + 1)
    hourFrequency.set(hour, (hourFrequency.get(hour) || 0) + 1)
    
    const seasonData = seasonFrequency.get(season) || { count: 0, totalScore: 0 }
    seasonFrequency.set(season, {
      count: seasonData.count + 1,
      totalScore: seasonData.totalScore + trip.route.sustainabilityScore
    })
  })

  const busiestDays = Array.from(dayFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day]) => day)

  const busiestHours = Array.from(hourFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour)

  const seasonalPatterns = Array.from(seasonFrequency.entries())
    .map(([season, data]) => ({
      season,
      tripCount: data.count,
      avgSustainabilityScore: Math.round((data.totalScore / data.count) * 10) / 10
    }))

  return {
    mostFrequentRoutes,
    preferredTransportModes,
    travelTiming: {
      busiestDays,
      busiestHours,
      seasonalPatterns
    }
  }
}

async function generatePersonalizedInsights(
  trips: CompletedTrip[],
  metrics: any,
  patterns: InsightsResponse['travelPatterns']
): Promise<PersonalizedInsight[]> {
  const insights: PersonalizedInsight[] = []

  // Achievement insights
  if (metrics.totalCarbonSaved > 100) {
    insights.push({
      id: 'achievement_carbon_saved',
      type: 'achievement',
      title: 'Eco Champion!',
      description: `You've saved ${Math.round(metrics.totalCarbonSaved)} kg of CO2 through sustainable travel choices!`,
      impact: 'high',
      actionable: false,
      data: { carbonSaved: metrics.totalCarbonSaved }
    })
  }

  // Trend insights
  if (trips.length >= 5) {
    const recentTrips = trips.slice(0, 5)
    const olderTrips = trips.slice(-5)
    
    const recentAvgScore = recentTrips.reduce((sum, trip) => sum + trip.route.sustainabilityScore, 0) / recentTrips.length
    const olderAvgScore = olderTrips.reduce((sum, trip) => sum + trip.route.sustainabilityScore, 0) / olderTrips.length
    
    if (recentAvgScore > olderAvgScore + 5) {
      insights.push({
        id: 'trend_improving',
        type: 'trend',
        title: 'Sustainability Improving',
        description: `Your sustainability score has improved by ${Math.round((recentAvgScore - olderAvgScore) * 10) / 10} points recently!`,
        impact: 'medium',
        actionable: false,
        data: { improvement: recentAvgScore - olderAvgScore }
      })
    }
  }

  // Opportunity insights
  patterns.mostFrequentRoutes.forEach(route => {
    if (route.improvementPotential > 20) {
      insights.push({
        id: `opportunity_${route.origin}_${route.destination}`,
        type: 'opportunity',
        title: 'Route Optimization Opportunity',
        description: `Your ${route.origin} to ${route.destination} route could be ${Math.round(route.improvementPotential)}% more sustainable`,
        impact: 'high',
        actionable: true,
        data: { route, improvementPotential: route.improvementPotential }
      })
    }
  })

  // Recommendation insights
  const leastEfficientMode = patterns.preferredTransportModes
    .filter(mode => mode.usage > 2)
    .sort((a, b) => a.efficiency - b.efficiency)[0]

  if (leastEfficientMode && leastEfficientMode.efficiency < 50) {
    insights.push({
      id: 'recommendation_transport_mode',
      type: 'recommendation',
      title: 'Consider Alternative Transport',
      description: `Try reducing ${leastEfficientMode.mode} usage and explore more sustainable options like train or bus`,
      impact: 'medium',
      actionable: true,
      data: { mode: leastEfficientMode.mode, efficiency: leastEfficientMode.efficiency }
    })
  }

  // Seasonal insights
  const bestSeason = patterns.travelTiming.seasonalPatterns
    .sort((a, b) => b.avgSustainabilityScore - a.avgSustainabilityScore)[0]

  if (bestSeason && bestSeason.avgSustainabilityScore > 75) {
    insights.push({
      id: 'trend_seasonal',
      type: 'trend',
      title: 'Seasonal Sustainability Pattern',
      description: `You travel most sustainably in ${bestSeason.season} with an average score of ${bestSeason.avgSustainabilityScore}`,
      impact: 'low',
      actionable: false,
      data: { season: bestSeason.season, score: bestSeason.avgSustainabilityScore }
    })
  }

  return insights.sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 }
    return impactOrder[b.impact] - impactOrder[a.impact]
  })
}