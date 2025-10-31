import { NextRequest, NextResponse } from 'next/server';
import { generateRouteRecommendations, analyzeSustainability } from '@/lib/services/geminiService';
import { CarbonCalculationService } from '@/lib/services/carbonCalculationService';
import { 
  SustainabilityAnalysisRequest, 
  SustainabilityAnalysisResponse, 
  RouteOption,
  TransportMode,
  TransportSegment,
  Location
} from '@/lib/types';

/**
 * Convert Google Maps route data to RouteOption format
 */
function convertGoogleMapsRouteToRouteOption(
  googleRoute: any,
  index: number,
  origin: Location,
  destination: Location
): RouteOption {
  // Extract basic route information
  const totalDistance = googleRoute.legs?.reduce((sum: number, leg: any) => 
    sum + (leg.distance?.value || 0), 0) / 1000; // Convert to km
  const totalDuration = googleRoute.legs?.reduce((sum: number, leg: any) => 
    sum + (leg.duration?.value || 0), 0) / 60; // Convert to minutes

  // Create a basic transport segment (simplified for analysis)
  const transportSegment: TransportSegment = {
    mode: TransportMode.CAR, // Default mode, can be enhanced
    duration: totalDuration,
    distance: totalDistance,
    carbonEmission: 0, // Will be calculated
    cost: 0, // Will be calculated
  };

  // Calculate carbon emissions and cost
  transportSegment.carbonEmission = CarbonCalculationService.calculateSegmentEmissions(transportSegment);
  transportSegment.cost = totalDistance * 0.56; // Default car cost per km

  const routeOption: RouteOption = {
    id: `route-${index}`,
    name: `Route ${index + 1}`,
    origin,
    destination,
    transportModes: [transportSegment],
    totalDuration,
    totalDistance,
    totalCost: transportSegment.cost,
    totalCarbonFootprint: transportSegment.carbonEmission,
    sustainabilityScore: 0 // Will be calculated
  };

  // Calculate sustainability score
  routeOption.sustainabilityScore = CarbonCalculationService.calculateSustainabilityScore(
    routeOption.totalCarbonFootprint,
    routeOption.totalDistance,
    routeOption.transportModes
  );

  return routeOption;
}

/**
 * Validate sustainability analysis request
 */
function validateAnalysisRequest(body: any): { isValid: boolean; error?: string; data?: SustainabilityAnalysisRequest } {
  if (!body) {
    return { isValid: false, error: 'Request body is required' };
  }

  const { routes, travelDate } = body;

  if (!routes || !Array.isArray(routes) || routes.length === 0) {
    return { isValid: false, error: 'Routes array is required and must contain at least one route' };
  }

  if (!travelDate || typeof travelDate !== 'string') {
    return { isValid: false, error: 'Travel date is required and must be a string' };
  }

  // Validate each route has required structure
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    if (!route || typeof route !== 'object') {
      return { isValid: false, error: `Route ${i} must be an object` };
    }

    if (!route.legs || !Array.isArray(route.legs)) {
      return { isValid: false, error: `Route ${i} must have a legs array` };
    }
  }

  return {
    isValid: true,
    data: { routes, travelDate }
  };
}

/**
 * POST /api/sustainability/analyze
 * Analyze sustainability of route options and provide AI-powered insights
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const validation = validateAnalysisRequest(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { routes: googleRoutes } = validation.data!;

    // Convert Google Maps routes to RouteOption format
    // For this analysis, we'll use placeholder origin/destination
    const placeholderOrigin: Location = {
      address: 'Origin',
      coordinates: { lat: 0, lng: 0 }
    };
    const placeholderDestination: Location = {
      address: 'Destination', 
      coordinates: { lat: 0, lng: 0 }
    };

    const routeOptions: RouteOption[] = googleRoutes.map((googleRoute, index) =>
      convertGoogleMapsRouteToRouteOption(googleRoute, index, placeholderOrigin, placeholderDestination)
    );

    // Generate detailed route analysis using AI
    const routeAnalyses = await generateRouteRecommendations(routeOptions);

    // Generate overall sustainability analysis
    const sustainabilityAnalysis = await analyzeSustainability(
      routeOptions,
      'Origin',
      'Destination'
    );

    // Calculate environmental impact metrics
    const totalCarbonFootprint = routeOptions.reduce((sum, route) => sum + route.totalCarbonFootprint, 0);
    const averageSustainabilityScore = routeOptions.reduce((sum, route) => sum + route.sustainabilityScore, 0) / routeOptions.length;

    // Generate comprehensive recommendations
    const recommendations: string[] = [
      ...sustainabilityAnalysis.tips,
      `Average sustainability score: ${averageSustainabilityScore.toFixed(1)}/100`,
      `Total estimated carbon footprint: ${totalCarbonFootprint.toFixed(2)} kg CO2e`
    ];

    // Find the most sustainable route
    const mostSustainableRoute = routeOptions.reduce((best, current) =>
      current.sustainabilityScore > best.sustainabilityScore ? current : best
    );

    // Add route-specific insights
    const sustainabilityInsights = CarbonCalculationService.getSustainabilityInsights(mostSustainableRoute);
    recommendations.push(...sustainabilityInsights);

    const response: SustainabilityAnalysisResponse = {
      analysis: routeAnalyses,
      aiInsights: sustainabilityAnalysis.summary,
      recommendations: recommendations.slice(0, 8) // Limit to 8 recommendations
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error analyzing sustainability:', error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'AI analysis service temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error during sustainability analysis.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sustainability/analyze
 * Get sustainability analysis information (for testing purposes)
 */
export async function GET() {
  return NextResponse.json({
    message: 'Sustainability analysis endpoint',
    usage: 'POST to this endpoint with Google Maps route data to get detailed sustainability analysis',
    example: {
      routes: [
        {
          legs: [
            {
              distance: { value: 50000 }, // 50km in meters
              duration: { value: 3600 }   // 1 hour in seconds
            }
          ]
        }
      ],
      travelDate: '2024-01-15'
    },
    features: [
      'AI-powered sustainability insights',
      'Route-specific recommendations',
      'Carbon footprint analysis',
      'Environmental impact comparisons'
    ]
  });
}