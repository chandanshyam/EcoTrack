import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { firestoreService } from '@/lib/services/firestoreService'
import { generateSustainabilityTargets } from '@/lib/services/geminiService'
import { getOrCreateUserProfile } from '@/lib/api-helpers'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

interface SustainabilityTarget {
  carbonReduction: number
  sustainabilityScore: number
  carbonSaved: number
  tripCount: number
  description: string
}

interface TargetsResponse {
  monthly: SustainabilityTarget
  yearly: SustainabilityTarget
  generatedAt: string
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

    // Check if we have cached targets that are still valid
    const cachedTargets = await firestoreService.getUserTargets(userProfile.id)

    const now = new Date()
    const currentMonth = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    const currentYear = now.getFullYear().toString()

    // Return cached targets if they're for the current month/year
    if (
      cachedTargets &&
      cachedTargets.currentMonth === currentMonth &&
      cachedTargets.currentYear === currentYear
    ) {
      const response: TargetsResponse = {
        monthly: cachedTargets.monthly,
        yearly: cachedTargets.yearly,
        generatedAt: cachedTargets.generatedAt.toISOString()
      }
      return NextResponse.json(response)
    }

    // If no valid cached targets, generate new ones
    // Get user's environmental metrics
    const metrics = await firestoreService.getUserEnvironmentalMetrics(userProfile.id)

    // Get monthly trends (last 12 months)
    const monthlyTrends = await firestoreService.getUserTrends(
      userProfile.id,
      'month',
      12
    )

    // Get yearly trends (last 5 years)
    const yearlyTrends = await firestoreService.getUserTrends(
      userProfile.id,
      'year',
      5
    )

    // Get all trips for detailed metrics
    const allTrips = await firestoreService.getUserTrips(userProfile.id, {
      limit: 1000
    })

    // Format monthly metrics
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

    // Format yearly metrics
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

    // Generate AI-powered targets
    const targets = await generateSustainabilityTargets({
      totalTrips: metrics.totalTrips,
      totalCarbonFootprint: metrics.totalCarbonFootprint,
      totalCarbonSaved: metrics.totalCarbonSaved,
      averageSustainabilityScore: metrics.averageSustainabilityScore,
      monthlyMetrics,
      yearlyMetrics
    })

    // Save targets to database for caching
    await firestoreService.saveUserTargets(userProfile.id, targets)

    const response: TargetsResponse = {
      monthly: targets.monthly,
      yearly: targets.yearly,
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error generating sustainability targets:', error)
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

    // Get or create user profile
    const userProfile = await getOrCreateUserProfile(session.user.email, session.user.name)

    // Force regenerate targets (called when a trip is saved)
    // Get user's environmental metrics
    const metrics = await firestoreService.getUserEnvironmentalMetrics(userProfile.id)

    // Get monthly trends (last 12 months)
    const monthlyTrends = await firestoreService.getUserTrends(
      userProfile.id,
      'month',
      12
    )

    // Get yearly trends (last 5 years)
    const yearlyTrends = await firestoreService.getUserTrends(
      userProfile.id,
      'year',
      5
    )

    // Get all trips for detailed metrics
    const allTrips = await firestoreService.getUserTrips(userProfile.id, {
      limit: 1000
    })

    // Format monthly metrics
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

    // Format yearly metrics
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

    // Generate AI-powered targets
    const targets = await generateSustainabilityTargets({
      totalTrips: metrics.totalTrips,
      totalCarbonFootprint: metrics.totalCarbonFootprint,
      totalCarbonSaved: metrics.totalCarbonSaved,
      averageSustainabilityScore: metrics.averageSustainabilityScore,
      monthlyMetrics,
      yearlyMetrics
    })

    // Save targets to database
    await firestoreService.saveUserTargets(userProfile.id, targets)

    const response: TargetsResponse = {
      monthly: targets.monthly,
      yearly: targets.yearly,
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error regenerating sustainability targets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
