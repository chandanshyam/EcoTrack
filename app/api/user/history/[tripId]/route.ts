import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { firestoreService } from '@/lib/services/firestoreService'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
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

    const trip = await firestoreService.getTrip(userProfile.id, params.tripId)
    
    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(trip)
  } catch (error) {
    console.error('Error fetching trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
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

    // Check if trip exists and belongs to user
    const trip = await firestoreService.getTrip(userProfile.id, params.tripId)
    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    await firestoreService.deleteTrip(userProfile.id, params.tripId)

    return NextResponse.json(
      { message: 'Trip deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}