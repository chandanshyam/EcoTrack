import { firestoreService } from '@/lib/services/firestoreService'
import { User } from '@/lib/types'

/**
 * Get or create user profile for authenticated user
 * Auto-creates profile if it doesn't exist
 */
export async function getOrCreateUserProfile(
  email: string,
  name?: string | null
): Promise<User> {
  let userProfile = await firestoreService.getUserProfile(email)

  if (!userProfile) {
    // Auto-create profile for new users
    console.log('Creating user profile for:', email)
    userProfile = await firestoreService.createUserProfile(email, {
      email,
      name: name || '',
      preferences: {
        prioritizeSustainability: true,
        maxTravelTime: 480,
        budgetLimit: 1000,
        preferredTransportModes: []
      },
      createdAt: new Date()
    })
  }

  return userProfile
}
