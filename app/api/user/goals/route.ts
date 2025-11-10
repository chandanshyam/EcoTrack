import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { firestoreService } from '@/lib/services/firestoreService'
import { getOrCreateUserProfile } from '@/lib/api-helpers'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

interface SustainabilityGoal {
  id: string
  userId: string
  type: 'carbon_reduction' | 'sustainability_score' | 'trip_count' | 'transport_mode'
  target: number
  period: 'monthly' | 'yearly'
  description: string
  createdAt: Date
  isActive: boolean
}

interface GoalProgress {
  goal: SustainabilityGoal
  current: number
  percentage: number
  status: 'on_track' | 'behind' | 'achieved' | 'exceeded'
  daysRemaining: number
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

    // Get user's goals (mock implementation - would be stored in Firestore)
    const goals = await getUserGoals(userProfile.id)
    
    // Calculate progress for each goal
    const goalsWithProgress: GoalProgress[] = []
    
    for (const goal of goals) {
      const progress = await calculateGoalProgress(userProfile.id, goal)
      goalsWithProgress.push(progress)
    }

    return NextResponse.json({
      goals: goalsWithProgress,
      summary: {
        totalGoals: goals.length,
        activeGoals: goals.filter(g => g.isActive).length,
        achievedGoals: goalsWithProgress.filter(g => g.status === 'achieved').length,
        onTrackGoals: goalsWithProgress.filter(g => g.status === 'on_track').length
      }
    })
  } catch (error) {
    console.error('Error fetching goals:', error)
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

    const body = await request.json()
    const { type, target, period, description } = body

    // Validate required fields
    if (!type || typeof target !== 'number' || !period || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: type, target, period, description' },
        { status: 400 }
      )
    }

    // Create new goal
    const newGoal: SustainabilityGoal = {
      id: `goal_${Date.now()}`, // In real implementation, would use Firestore auto-generated ID
      userId: userProfile.id,
      type,
      target,
      period,
      description,
      createdAt: new Date(),
      isActive: true
    }

    // Save goal (mock implementation)
    await saveUserGoal(newGoal)

    return NextResponse.json(newGoal, { status: 201 })
  } catch (error) {
    console.error('Error creating goal:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Mock functions - in real implementation, these would interact with Firestore
async function getUserGoals(userId: string): Promise<SustainabilityGoal[]> {
  // Mock goals for demonstration
  return [
    {
      id: 'goal_1',
      userId,
      type: 'carbon_reduction',
      target: 50, // 50% reduction
      period: 'monthly',
      description: 'Reduce carbon footprint by 50% compared to conventional travel',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      isActive: true
    },
    {
      id: 'goal_2',
      userId,
      type: 'sustainability_score',
      target: 80, // Average score of 80
      period: 'monthly',
      description: 'Maintain average sustainability score above 80',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      isActive: true
    }
  ]
}

async function saveUserGoal(goal: SustainabilityGoal): Promise<void> {
  // Mock implementation - would save to Firestore
  console.log('Saving goal:', goal)
}

async function calculateGoalProgress(userId: string, goal: SustainabilityGoal): Promise<GoalProgress> {
  const now = new Date()
  const startOfPeriod = goal.period === 'monthly' 
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), 0, 1)
  
  const endOfPeriod = goal.period === 'monthly'
    ? new Date(now.getFullYear(), now.getMonth() + 1, 0)
    : new Date(now.getFullYear(), 11, 31)

  // Get metrics for the current period
  const metrics = await firestoreService.getUserEnvironmentalMetrics(userId, {
    start: startOfPeriod,
    end: endOfPeriod
  })

  let current = 0
  let percentage = 0
  let status: GoalProgress['status'] = 'behind'

  switch (goal.type) {
    case 'carbon_reduction':
      // Calculate reduction percentage
      const totalTrips = await firestoreService.getUserTrips(userId, {
        startAfter: startOfPeriod,
        endBefore: endOfPeriod
      })
      const totalConventional = totalTrips.reduce((sum, trip) => 
        sum + trip.carbonFootprint + trip.carbonSaved, 0
      )
      current = totalConventional > 0 
        ? ((totalConventional - metrics.totalCarbonFootprint) / totalConventional) * 100
        : 0
      break

    case 'sustainability_score':
      current = metrics.averageSustainabilityScore
      break

    case 'trip_count':
      current = metrics.totalTrips
      break

    default:
      current = 0
  }

  percentage = goal.target > 0 ? (current / goal.target) * 100 : 0

  // Determine status
  if (percentage >= 100) {
    status = percentage > 120 ? 'exceeded' : 'achieved'
  } else if (percentage >= 80) {
    status = 'on_track'
  } else {
    status = 'behind'
  }

  const daysRemaining = Math.ceil((endOfPeriod.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return {
    goal,
    current: Math.round(current * 10) / 10,
    percentage: Math.round(percentage * 10) / 10,
    status,
    daysRemaining: Math.max(0, daysRemaining)
  }
}