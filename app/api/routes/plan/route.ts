import { NextRequest, NextResponse } from 'next/server';
import { planTripWithAI } from '@/lib/services/geminiService';
import { CarbonCalculationService } from '@/lib/services/carbonCalculationService';
import { RoutePlanRequest, RoutePlanResponse } from '@/lib/types';

// Simple in-memory cache for route calculations
const routeCache = new Map<string, { data: RoutePlanResponse; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Generate cache key for route request
 */
function generateCacheKey(request: RoutePlanRequest): string {
  const { origin, destination, travelDate, preferences } = request;
  return `${origin}-${destination}-${travelDate || 'now'}-${JSON.stringify(preferences || {})}`;
}

/**
 * Validate route planning request
 */
function validateRequest(body: any): { isValid: boolean; error?: string; data?: RoutePlanRequest } {
  if (!body) {
    return { isValid: false, error: 'Request body is required' };
  }

  const { origin, destination, travelDate, preferences } = body;

  if (!origin || typeof origin !== 'string' || origin.trim().length === 0) {
    return { isValid: false, error: 'Origin is required and must be a non-empty string' };
  }

  if (!destination || typeof destination !== 'string' || destination.trim().length === 0) {
    return { isValid: false, error: 'Destination is required and must be a non-empty string' };
  }

  if (travelDate && typeof travelDate !== 'string') {
    return { isValid: false, error: 'Travel date must be a string' };
  }

  if (preferences) {
    if (typeof preferences !== 'object') {
      return { isValid: false, error: 'Preferences must be an object' };
    }

    const { prioritizeSustainability, maxTravelTime, budgetLimit } = preferences;

    if (prioritizeSustainability !== undefined && typeof prioritizeSustainability !== 'boolean') {
      return { isValid: false, error: 'prioritizeSustainability must be a boolean' };
    }

    if (maxTravelTime !== undefined && (typeof maxTravelTime !== 'number' || maxTravelTime <= 0)) {
      return { isValid: false, error: 'maxTravelTime must be a positive number' };
    }

    if (budgetLimit !== undefined && (typeof budgetLimit !== 'number' || budgetLimit <= 0)) {
      return { isValid: false, error: 'budgetLimit must be a positive number' };
    }
  }

  return {
    isValid: true,
    data: {
      origin: origin.trim(),
      destination: destination.trim(),
      travelDate,
      preferences
    }
  };
}

/**
 * Filter routes based on user preferences
 */
function filterRoutesByPreferences(
  routes: any[],
  preferences?: RoutePlanRequest['preferences']
): any[] {
  if (!preferences) return routes;

  let filteredRoutes = [...routes];

  // Filter by max travel time
  if (preferences.maxTravelTime) {
    filteredRoutes = filteredRoutes.filter(
      route => route.totalDuration <= preferences.maxTravelTime!
    );
  }

  // Filter by budget limit
  if (preferences.budgetLimit) {
    filteredRoutes = filteredRoutes.filter(
      route => route.totalCost <= preferences.budgetLimit!
    );
  }

  // Sort by sustainability if prioritized
  if (preferences.prioritizeSustainability) {
    filteredRoutes.sort((a, b) => b.sustainabilityScore - a.sustainabilityScore);
  } else {
    // Default sort by duration (fastest first)
    filteredRoutes.sort((a, b) => a.totalDuration - b.totalDuration);
  }

  return filteredRoutes;
}

/**
 * POST /api/routes/plan
 * Plan routes between origin and destination with sustainability analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const validation = validateRequest(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const routeRequest = validation.data!;
    const cacheKey = generateCacheKey(routeRequest);

    // Check cache first
    const cachedResult = routeCache.get(cacheKey);
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
      console.log('Returning cached route result');
      return NextResponse.json(cachedResult.data);
    }

    // Plan trip with AI-powered analysis
    const { routes, analysis } = await planTripWithAI(
      routeRequest.origin,
      routeRequest.destination
    );

    if (!routes || routes.length === 0) {
      return NextResponse.json(
        { error: 'No routes found between the specified locations' },
        { status: 404 }
      );
    }

    // Filter routes based on user preferences
    const filteredRoutes = filterRoutesByPreferences(routes, routeRequest.preferences);

    if (filteredRoutes.length === 0) {
      return NextResponse.json(
        { error: 'No routes match your preferences. Try adjusting your filters.' },
        { status: 404 }
      );
    }

    // Get the most sustainable route for comparison
    const mostSustainableRoute = filteredRoutes.reduce((best, current) => 
      current.sustainabilityScore > best.sustainabilityScore ? current : best
    );

    // Generate conventional comparison
    const conventionalComparison = CarbonCalculationService.compareWithConventionalTravel(
      mostSustainableRoute
    );

    const response: RoutePlanResponse = {
      routes: filteredRoutes,
      sustainabilityInsights: analysis.summary,
      conventionalComparison
    };

    // Cache the result
    routeCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error planning routes:', error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'External service temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
      
      if (error.message.includes('geocode') || error.message.includes('location')) {
        return NextResponse.json(
          { error: 'Unable to find the specified locations. Please check your addresses.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/routes/plan
 * Get route planning information (for testing purposes)
 */
export async function GET() {
  return NextResponse.json({
    message: 'Route planning endpoint',
    usage: 'POST to this endpoint with origin and destination to get route options',
    example: {
      origin: 'New York, NY',
      destination: 'Boston, MA',
      travelDate: '2024-01-15',
      preferences: {
        prioritizeSustainability: true,
        maxTravelTime: 300,
        budgetLimit: 100
      }
    }
  });
}