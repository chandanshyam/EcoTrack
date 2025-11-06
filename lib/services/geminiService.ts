import { GoogleGenerativeAI } from "@google/generative-ai";
import { RouteOption, SustainabilityAnalysis, RouteAnalysis, TransportMode, GeolocationCoords } from '@/lib/types';
import { TravelPreferencesData } from '@/components/TravelPreferences';
import { env } from '@/lib/env';
import { CarbonCalculationService } from './carbonCalculationService';

const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;

const defaultAnalysis: SustainabilityAnalysis = {
  summary: "Analysis could not be generated due to an API error.",
  tips: ["Consider off-peak travel to reduce congestion.", "Combine trips to be more efficient."],
  comparison: {
    conventionalMethod: "a standard gasoline car",
    conventionalFootprint: 10.0,
    savings: "By choosing a greener option, you could save a significant amount of CO2.",
  }
};

/**
 * Analyze sustainability of route options using Gemini AI
 */
export const analyzeSustainability = async (
  routes: RouteOption[],
  origin: string,
  destination: string
): Promise<SustainabilityAnalysis> => {
  if (!genAI || !env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Using default analysis.");
    return defaultAnalysis;
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const routeData = routes.map(route => ({
    name: route.name,
    transportModes: route.transportModes.map(segment => segment.mode),
    duration: route.totalDuration,
    distance: route.totalDistance,
    cost: route.totalCost,
    carbonFootprint: route.totalCarbonFootprint,
    sustainabilityScore: route.sustainabilityScore,
  }));

  const prompt = `
You are EcoTrack, an expert AI sustainability analyst for travel planning.

Analyze these route options for travel from "${origin}" to "${destination}":

${JSON.stringify(routeData, null, 2)}

Provide a sustainability analysis with:

1. **Summary**: A brief, encouraging explanation of why the most sustainable route is the best environmental choice (2-3 sentences).

2. **Tips**: Exactly 3 actionable sustainability tips specific to this journey and transport modes used.

3. **Comparison**: Compare the most sustainable route against driving a standard gasoline car for the same distance. Calculate the conventional car's CO2 emissions (use 0.21 kg CO2e per km) and describe the environmental savings.

Respond with a JSON object in this exact format:
{
  "summary": "string",
  "tips": ["tip1", "tip2", "tip3"],
  "comparison": {
    "conventionalMethod": "standard gasoline car",
    "conventionalFootprint": number,
    "savings": "descriptive string about CO2 savings"
  }
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();

    // Clean up the response to extract JSON
    if (text.includes('```json')) {
      text = text.substring(text.indexOf('```json') + 7);
      text = text.substring(0, text.indexOf('```'));
    } else if (text.includes('```')) {
      text = text.substring(text.indexOf('```') + 3);
      text = text.substring(0, text.indexOf('```'));
    }

    const analysis = JSON.parse(text.trim());
    return analysis;

  } catch (error) {
    console.error("Error analyzing sustainability with Gemini:", error);
    return defaultAnalysis;
  }
};

/**
 * Generate detailed route analysis and recommendations
 */
export const generateRouteRecommendations = async (
  routes: RouteOption[],
  userPreferences?: {
    prioritizeSustainability?: boolean;
    maxTravelTime?: number;
    budgetLimit?: number;
  }
): Promise<RouteAnalysis[]> => {
  if (!genAI || !env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Using default recommendations.");
    return routes.map(route => ({
      routeId: route.id,
      sustainabilityScore: route.sustainabilityScore,
      carbonFootprint: route.totalCarbonFootprint,
      insights: ["Analysis unavailable - API key not configured"],
      recommendations: ["Consider sustainable transport options"],
    }));
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const routeData = routes.map(route => ({
    id: route.id,
    name: route.name,
    transportModes: route.transportModes.map(segment => ({
      mode: segment.mode,
      duration: segment.duration,
      distance: segment.distance,
      carbonEmission: segment.carbonEmission,
      cost: segment.cost,
    })),
    totalDuration: route.totalDuration,
    totalDistance: route.totalDistance,
    totalCost: route.totalCost,
    totalCarbonFootprint: route.totalCarbonFootprint,
    sustainabilityScore: route.sustainabilityScore,
  }));

  const preferencesText = userPreferences ? `
User preferences:
- Prioritize sustainability: ${userPreferences.prioritizeSustainability ? 'Yes' : 'No'}
- Max travel time: ${userPreferences.maxTravelTime ? `${userPreferences.maxTravelTime} minutes` : 'No limit'}
- Budget limit: ${userPreferences.budgetLimit ? `$${userPreferences.budgetLimit}` : 'No limit'}
` : '';

  const prompt = `
You are EcoTrack's route analysis expert. Analyze each route option and provide insights and recommendations.

Routes to analyze:
${JSON.stringify(routeData, null, 2)}

${preferencesText}

For each route, provide:
1. **Insights**: 2-3 specific observations about this route's sustainability, practicality, or unique aspects
2. **Recommendations**: 2-3 actionable suggestions to improve the sustainability or experience of this route

Respond with a JSON array where each object has this format:
{
  "routeId": "route-id",
  "sustainabilityScore": number,
  "carbonFootprint": number,
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["rec1", "rec2", "rec3"]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();

    // Clean up the response to extract JSON
    if (text.includes('```json')) {
      text = text.substring(text.indexOf('```json') + 7);
      text = text.substring(0, text.indexOf('```'));
    } else if (text.includes('```')) {
      text = text.substring(text.indexOf('```') + 3);
      text = text.substring(0, text.indexOf('```'));
    }

    const analyses = JSON.parse(text.trim());
    return analyses;

  } catch (error) {
    console.error("Error generating route recommendations with Gemini:", error);
    return routes.map(route => ({
      routeId: route.id,
      sustainabilityScore: route.sustainabilityScore,
      carbonFootprint: route.totalCarbonFootprint,
      insights: ["Analysis temporarily unavailable"],
      recommendations: ["Consider the most sustainable transport options available"],
    }));
  }
};

/**
 * Generate personalized sustainability insights based on travel history
 */
export const generatePersonalizedInsights = async (
  travelHistory: RouteOption[],
  timeframe: 'week' | 'month' | 'year' = 'month'
): Promise<{
  insights: string[];
  recommendations: string[];
  achievements: string[];
}> => {
  if (!genAI || !env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Using default insights.");
    return {
      insights: ["Travel analysis unavailable - API key not configured"],
      recommendations: ["Configure Gemini API to get personalized insights"],
      achievements: [],
    };
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Calculate summary statistics
  const totalTrips = travelHistory.length;
  const totalCarbonFootprint = travelHistory.reduce((sum, trip) => sum + trip.totalCarbonFootprint, 0);
  const averageSustainabilityScore = travelHistory.reduce((sum, trip) => sum + trip.sustainabilityScore, 0) / totalTrips;
  const transportModeUsage = travelHistory.reduce((acc, trip) => {
    trip.transportModes.forEach(segment => {
      acc[segment.mode] = (acc[segment.mode] || 0) + 1;
    });
    return acc;
  }, {} as Record<TransportMode, number>);

  const prompt = `
You are EcoTrack's personal sustainability coach. Analyze this user's travel patterns over the past ${timeframe}.

Travel Statistics:
- Total trips: ${totalTrips}
- Total carbon footprint: ${totalCarbonFootprint.toFixed(2)} kg CO2e
- Average sustainability score: ${averageSustainabilityScore.toFixed(1)}/100
- Transport mode usage: ${JSON.stringify(transportModeUsage)}

Recent trips:
${JSON.stringify(travelHistory.slice(-5).map(trip => ({
  name: trip.name,
  transportModes: trip.transportModes.map(s => s.mode),
  carbonFootprint: trip.totalCarbonFootprint,
  sustainabilityScore: trip.sustainabilityScore,
})), null, 2)}

Provide personalized feedback with:

1. **Insights**: 3-4 observations about their travel patterns, sustainability trends, or notable behaviors
2. **Recommendations**: 3-4 specific, actionable suggestions to improve their travel sustainability
3. **Achievements**: 2-3 positive accomplishments or milestones they've reached (if any)

Respond with a JSON object:
{
  "insights": ["insight1", "insight2", "insight3", "insight4"],
  "recommendations": ["rec1", "rec2", "rec3", "rec4"],
  "achievements": ["achievement1", "achievement2", "achievement3"]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();

    // Clean up the response to extract JSON
    if (text.includes('```json')) {
      text = text.substring(text.indexOf('```json') + 7);
      text = text.substring(0, text.indexOf('```'));
    } else if (text.includes('```')) {
      text = text.substring(text.indexOf('```') + 3);
      text = text.substring(0, text.indexOf('```'));
    }

    const personalizedData = JSON.parse(text.trim());
    return personalizedData;

  } catch (error) {
    console.error("Error generating personalized insights with Gemini:", error);
    return {
      insights: ["Unable to analyze travel patterns at this time"],
      recommendations: ["Continue choosing sustainable transport options when possible"],
      achievements: [],
    };
  }
};

/**
 * Plan a trip with AI-powered sustainability analysis
 * This is the main function that combines route planning with carbon calculations
 */
export const planTripWithAI = async (
  origin: string,
  destination: string,
  userLocation?: GeolocationCoords,
  travelDate?: string,
  preferences?: TravelPreferencesData
): Promise<{
  routes: RouteOption[];
  analysis: SustainabilityAnalysis;
}> => {
  try {
    // Call our server-side API to get routes (avoids CORS issues)
    const response = await fetch('/api/routes/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        origin, 
        destination, 
        travelDate,
        preferences 
      }),
    });

    if (!response.ok) {
      throw new Error(`Route planning failed: ${response.statusText}`);
    }

    const { routes: googleRoutes } = await response.json();
    
    if (!googleRoutes || googleRoutes.length === 0) {
      throw new Error('No routes found');
    }

    // Enhance routes with advanced carbon calculations and sustainability scoring
    const enhancedRoutes = CarbonCalculationService.processRouteOptions(googleRoutes);

    // Routes are already sorted by the API based on user preferences
    // Only re-sort if user prioritizes sustainability (default behavior)
    let finalRoutes = enhancedRoutes;
    if (preferences?.prioritizeSustainability !== false) {
      // Re-sort by sustainability score for consistency
      finalRoutes = enhancedRoutes.sort((a, b) => b.sustainabilityScore - a.sustainabilityScore);
    }
    // Otherwise keep the API's sorting (by cost/time if prioritizeSustainability is false)

    // Generate AI-powered sustainability analysis with preference context
    const analysis = await analyzeSustainability(finalRoutes, origin, destination);

    return {
      routes: finalRoutes,
      analysis
    };

  } catch (error) {
    console.error('Error planning trip with AI:', error);
    
    // Return fallback data
    return {
      routes: [],
      analysis: defaultAnalysis
    };
  }
};