import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';
import { User, CompletedTrip, RouteOption, EnvironmentalMetrics, TrendData } from '@/lib/types';

// Initialize Firebase Admin SDK
let db: Firestore | null = null;

function initializeFirebase(): Firestore {
  try {
    // Check if Firebase is already initialized
    if (getApps().length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing Firebase configuration. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.');
      }

      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      console.log('Firebase Admin SDK initialized successfully');
    }

    return getFirestore();
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
}

// Initialize Firestore
try {
  db = initializeFirebase();
} catch (error) {
  console.error('Failed to initialize Firestore:', error);
  console.warn('Firebase Admin SDK not properly configured. Some features will not work.');
}

/**
 * Firestore service for managing user data and travel history
 */
class FirestoreService {
  private db: Firestore;

  constructor() {
    if (!db) {
      console.warn('Firestore is not properly initialized. Some features may not work.');
      db = initializeFirebase();
    }
    this.db = db;
  }

  /**
   * User management
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    try {
      const userRef = this.db.collection('users').doc();
      const user: User = {
        id: userRef.id,
        ...userData,
        createdAt: new Date(),
      };
      
      await userRef.set({
        ...user,
        createdAt: user.createdAt, // Will be converted to Timestamp when Firebase is properly initialized
      });
      
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async getUserProfile(email: string): Promise<User | null> {
    try {
      const usersQuery = this.db.collection('users').where('email', '==', email);
      const snapshot = await usersQuery.get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const userDoc = snapshot.docs[0];
      const data = userDoc.data();
      
      return {
        id: userDoc.id,
        email: data.email,
        name: data.name,
        preferences: data.preferences,
        createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Failed to get user profile');
    }
  }

  async createUserProfile(email: string, userData: Omit<User, 'id'>): Promise<User> {
    try {
      const userRef = this.db.collection('users').doc();
      const user: User = {
        id: userRef.id,
        ...userData,
      };
      
      await userRef.set({
        ...user,
        createdAt: user.createdAt,
        updatedAt: new Date(),
      });
      
      return user;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  async updateUserProfile(email: string, updates: Partial<Omit<User, 'id' | 'email' | 'createdAt'>>): Promise<User> {
    try {
      const usersQuery = this.db.collection('users').where('email', '==', email);
      const snapshot = await usersQuery.get();
      
      if (snapshot.empty) {
        throw new Error('User not found');
      }
      
      const userDoc = snapshot.docs[0];
      await userDoc.ref.update({
        ...updates,
        updatedAt: new Date(),
      });
      
      // Return updated user
      const updatedDoc = await userDoc.ref.get();
      const data = updatedDoc.data()!;
      
      return {
        id: updatedDoc.id,
        email: data.email,
        name: data.name,
        preferences: data.preferences,
        createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return null;
      }
      
      const data = userDoc.data()!;
      return {
        id: userDoc.id,
        email: data.email,
        name: data.name,
        preferences: data.preferences,
        createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
      };
    } catch (error) {
      console.error('Error getting user:', error);
      throw new Error('Failed to get user');
    }
  }

  async updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<void> {
    try {
      await this.db.collection('users').doc(userId).update(updates);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      // Delete user document
      await this.db.collection('users').doc(userId).delete();
      
      // Delete all user's trips
      const tripsQuery = this.db.collection('users').doc(userId).collection('trips');
      const tripsSnapshot = await tripsQuery.get();
      
      const batch = this.db.batch();
      tripsSnapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Trip management
   */
  async saveTrip(userId: string, tripData: Omit<CompletedTrip, 'id' | 'userId'>): Promise<CompletedTrip> {
    try {
      const tripRef = this.db.collection('users').doc(userId).collection('trips').doc();
      const trip: CompletedTrip = {
        id: tripRef.id,
        userId,
        ...tripData,
      };
      
      await tripRef.set({
        ...trip,
        completedAt: trip.completedAt, // Will be converted to Timestamp when Firebase is properly initialized
      });
      
      return trip;
    } catch (error) {
      console.error('Error saving trip:', error);
      throw new Error('Failed to save trip');
    }
  }

  async getUserTrips(
    userId: string,
    options?: {
      limit?: number;
      startAfter?: Date;
      endBefore?: Date;
    }
  ): Promise<CompletedTrip[]> {
    try {
      let query = this.db
        .collection('users')
        .doc(userId)
        .collection('trips')
        .orderBy('completedAt', 'desc');

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.startAfter) {
        query = query.where('completedAt', '>', options.startAfter);
      }

      if (options?.endBefore) {
        query = query.where('completedAt', '<', options.endBefore);
      }

      const snapshot = await query.get();
      
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          route: data.route,
          completedAt: data.completedAt instanceof Date ? data.completedAt : new Date(data.completedAt),
          carbonFootprint: data.carbonFootprint,
          carbonSaved: data.carbonSaved,
        };
      });
    } catch (error) {
      console.error('Error getting user trips:', error);
      throw new Error('Failed to get user trips');
    }
  }

  async getTrip(userId: string, tripId: string): Promise<CompletedTrip | null> {
    try {
      const tripDoc = await this.db
        .collection('users')
        .doc(userId)
        .collection('trips')
        .doc(tripId)
        .get();

      if (!tripDoc.exists) {
        return null;
      }

      const data = tripDoc.data()!;
      return {
        id: tripDoc.id,
        userId: data.userId,
        route: data.route,
        completedAt: data.completedAt instanceof Date ? data.completedAt : new Date(data.completedAt),
        carbonFootprint: data.carbonFootprint,
        carbonSaved: data.carbonSaved,
      };
    } catch (error) {
      console.error('Error getting trip:', error);
      throw new Error('Failed to get trip');
    }
  }

  async deleteTrip(userId: string, tripId: string): Promise<void> {
    try {
      await this.db
        .collection('users')
        .doc(userId)
        .collection('trips')
        .doc(tripId)
        .delete();
    } catch (error) {
      console.error('Error deleting trip:', error);
      throw new Error('Failed to delete trip');
    }
  }

  /**
   * Analytics and metrics
   */
  async getUserEnvironmentalMetrics(
    userId: string,
    timeframe?: { start: Date; end: Date }
  ): Promise<EnvironmentalMetrics> {
    try {
      let query = this.db
        .collection('users')
        .doc(userId)
        .collection('trips')
        .orderBy('completedAt', 'desc');

      if (timeframe) {
        query = query
          .where('completedAt', '>=', timeframe.start)
          .where('completedAt', '<=', timeframe.end);
      }

      const snapshot = await query.get();
      const trips = snapshot.docs.map((doc: any) => doc.data());

      const totalCarbonFootprint = trips.reduce((sum: number, trip: any) => sum + trip.carbonFootprint, 0);
      const totalCarbonSaved = trips.reduce((sum: number, trip: any) => sum + trip.carbonSaved, 0);
      const totalTrips = trips.length;
      const averageSustainabilityScore = totalTrips > 0 
        ? trips.reduce((sum: number, trip: any) => sum + trip.route.sustainabilityScore, 0) / totalTrips 
        : 0;

      return {
        totalCarbonFootprint,
        totalCarbonSaved,
        totalTrips,
        averageSustainabilityScore,
      };
    } catch (error) {
      console.error('Error getting environmental metrics:', error);
      throw new Error('Failed to get environmental metrics');
    }
  }

  async getUserTrends(
    userId: string,
    period: 'week' | 'month' | 'year' = 'month',
    limit: number = 12
  ): Promise<TrendData[]> {
    try {
      const now = new Date();
      const trends: TrendData[] = [];

      for (let i = 0; i < limit; i++) {
        let start: Date;
        let end: Date;
        let periodLabel: string;

        if (period === 'week') {
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i + 1) * 7);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
          periodLabel = `Week of ${start.toLocaleDateString()}`;
        } else if (period === 'month') {
          start = new Date(now.getFullYear(), now.getMonth() - (i + 1), 1);
          end = new Date(now.getFullYear(), now.getMonth() - i, 0);
          periodLabel = start.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        } else { // year
          start = new Date(now.getFullYear() - (i + 1), 0, 1);
          end = new Date(now.getFullYear() - i, 0, 0);
          periodLabel = start.getFullYear().toString();
        }

        const metrics = await this.getUserEnvironmentalMetrics(userId, { start, end });
        
        trends.unshift({
          period: periodLabel,
          carbonFootprint: metrics.totalCarbonFootprint,
          carbonSaved: metrics.totalCarbonSaved,
          sustainabilityScore: metrics.averageSustainabilityScore,
        });
      }

      return trends;
    } catch (error) {
      console.error('Error getting user trends:', error);
      throw new Error('Failed to get user trends');
    }
  }

  /**
   * Route caching
   */
  async cacheRoute(routeHash: string, routeData: RouteOption[], ttlHours: number = 1): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
      
      await this.db.collection('cache').doc('routes').collection('data').doc(routeHash).set({
        routes: routeData,
        createdAt: new Date(),
        expiresAt: expiresAt,
      });
    } catch (error) {
      console.error('Error caching route:', error);
      // Don't throw error for caching failures
    }
  }

  async getCachedRoute(routeHash: string): Promise<RouteOption[] | null> {
    try {
      const cacheDoc = await this.db
        .collection('cache')
        .doc('routes')
        .collection('data')
        .doc(routeHash)
        .get();

      if (!cacheDoc.exists) {
        return null;
      }

      const data = cacheDoc.data()!;
      const now = new Date();

      // Check if cache has expired
      const expiresAt = data.expiresAt instanceof Date ? data.expiresAt : new Date(data.expiresAt);
      if (expiresAt.getTime() < now.getTime()) {
        // Delete expired cache entry
        await cacheDoc.ref.delete();
        return null;
      }

      return data.routes;
    } catch (error) {
      console.error('Error getting cached route:', error);
      return null;
    }
  }

  /**
   * User preferences management
   */
  async getUserPreferences(email: string): Promise<any | null> {
    try {
      const usersQuery = this.db.collection('users').where('email', '==', email);
      const snapshot = await usersQuery.get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const userDoc = snapshot.docs[0];
      const data = userDoc.data();
      
      return data.preferences || null;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw new Error('Failed to get user preferences');
    }
  }

  async saveUserPreferences(email: string, preferences: any): Promise<void> {
    try {
      const usersQuery = this.db.collection('users').where('email', '==', email);
      const snapshot = await usersQuery.get();
      
      if (snapshot.empty) {
        // Create new user with preferences
        const userRef = this.db.collection('users').doc();
        await userRef.set({
          email,
          preferences,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Update existing user preferences
        const userDoc = snapshot.docs[0];
        await userDoc.ref.update({
          preferences,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error saving user preferences:', error);
      throw new Error('Failed to save user preferences');
    }
  }

  async deleteUserPreferences(email: string): Promise<void> {
    try {
      const usersQuery = this.db.collection('users').where('email', '==', email);
      const snapshot = await usersQuery.get();
      
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        await userDoc.ref.update({
          preferences: null,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error deleting user preferences:', error);
      throw new Error('Failed to delete user preferences');
    }
  }

  /**
   * Utility methods
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to read from a test collection
      await this.db.collection('_health').limit(1).get();
      return true;
    } catch (error) {
      console.error('Firestore health check failed:', error);
      return false;
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      const now = new Date();
      const expiredQuery = this.db
        .collection('cache')
        .doc('routes')
        .collection('data')
        .where('expiresAt', '<', now);

      const snapshot = await expiredQuery.get();
      
      if (snapshot.empty) {
        return;
      }

      const batch = this.db.batch();
      snapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Cleaned up ${snapshot.size} expired cache entries`);
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
    }
  }

  /**
   * Sustainability Targets management
   */
  async getUserTargets(userId: string): Promise<{
    monthly: {
      carbonReduction: number;
      sustainabilityScore: number;
      carbonSaved: number;
      tripCount: number;
      description: string;
    };
    yearly: {
      carbonReduction: number;
      sustainabilityScore: number;
      carbonSaved: number;
      tripCount: number;
      description: string;
    };
    generatedAt: Date;
    currentMonth: string;
    currentYear: string;
  } | null> {
    try {
      const targetDoc = await this.db.collection('userTargets').doc(userId).get();

      if (!targetDoc.exists) {
        return null;
      }

      const data = targetDoc.data()!;
      return {
        monthly: data.monthly,
        yearly: data.yearly,
        generatedAt: data.generatedAt?.toDate() || new Date(),
        currentMonth: data.currentMonth,
        currentYear: data.currentYear,
      };
    } catch (error) {
      console.error('Error getting user targets:', error);
      return null;
    }
  }

  async saveUserTargets(
    userId: string,
    targets: {
      monthly: {
        carbonReduction: number;
        sustainabilityScore: number;
        carbonSaved: number;
        tripCount: number;
        description: string;
      };
      yearly: {
        carbonReduction: number;
        sustainabilityScore: number;
        carbonSaved: number;
        tripCount: number;
        description: string;
      };
    }
  ): Promise<void> {
    try {
      const now = new Date();
      const currentMonth = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      const currentYear = now.getFullYear().toString();

      await this.db.collection('userTargets').doc(userId).set({
        monthly: targets.monthly,
        yearly: targets.yearly,
        generatedAt: now,
        currentMonth,
        currentYear,
        updatedAt: now,
      });
    } catch (error) {
      console.error('Error saving user targets:', error);
      throw new Error('Failed to save user targets');
    }
  }
}

// Export singleton instance
export const firestoreService = new FirestoreService();