import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { firestoreService } from '@/lib/services/firestoreService'
import { UserPreferences } from '@/lib/types'

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

    const userProfile = await firestoreService.getUserProfile(session.user.email)
    
    if (!userProfile) {
      // Create default profile if it doesn't exist
      const defaultProfile = {
        email: session.user.email,
        name: session.user.name || '',
        preferences: {
          prioritizeSustainability: true,
          maxTravelTime: undefined,
          budgetLimit: undefined,
          preferredTransportModes: [],
        },
        createdAt: new Date(),
      }
      
      await firestoreService.createUserProfile(session.user.email, defaultProfile)
      return NextResponse.json(defaultProfile)
    }

    return NextResponse.json(userProfile)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, preferences } = body

    // Validate preferences structure
    if (preferences && typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Invalid preferences format' },
        { status: 400 }
      )
    }

    const updatedProfile = await firestoreService.updateUserProfile(
      session.user.email,
      {
        name,
        preferences,
      }
    )

    return NextResponse.json(updatedProfile)
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}