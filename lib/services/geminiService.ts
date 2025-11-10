import { GoogleGenerativeAI } from "@google/generative-ai";
import { RouteOption, SustainabilityAnalysis, RouteAnalysis, TransportMode, GeolocationCoords } from '@/lib/types';
import { TravelPreferencesData } from '@/components/TravelPreferences';
import { CarbonCalculationService } from './carbonCalculationService';
import * as dotenv from 'dotenv';
import * as path from 'path';

// load env vars
if (typeof window === 'undefined') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
}

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// analyze sustainability with Gemini AI
export const analyzeSustainability = async (
  routes: RouteOption[],
  origin: string,
  destination: string
): Promise<SustainabilityAnalysis> => {
  if (!genAI || !process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

2. **Comparison**: Compare the most sustainable route against driving a standard gasoline car for the same distance. Calculate the conventional car's CO2 emissions (use 0.21 kg CO2e per km) and describe the environmental savings.

Respond with a JSON object in this exact format:
{
  "summary": "string",
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

    // strip json markers if present
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
    console.error("Gemini analysis failed:", error);

    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('permission') || msg.includes('403') || msg.includes('quota')) {
        console.error("API access issue - check your Gemini API key and billing");
      }
    }

    throw new Error(`Gemini API Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
};

// generate route recommendations
export const generateRouteRecommendations = async (
  routes: RouteOption[],
  userPreferences?: {
    prioritizeSustainability?: boolean;
    maxTravelTime?: number;
    budgetLimit?: number;
  }
): Promise<RouteAnalysis[]> => {
  if (!genAI || !process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

    // clean up json response
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
    console.error("Route recommendations failed:", error);

    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('permission') || msg.includes('403') || msg.includes('quota')) {
        console.error("API issue detected");
      }
    }

    throw new Error(`Gemini API Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
};

// generate personalized insights
export const generatePersonalizedInsights = async (
  travelHistory: RouteOption[],
  timeframe: 'week' | 'month' | 'year' = 'month'
): Promise<{
  insights: string[];
  recommendations: string[];
  achievements: string[];
}> => {
  if (!genAI || !process.env.GEMINI_API_KEY) {
    console.warn("API key not set");
    return {
      insights: ["Travel analysis unavailable"],
      recommendations: ["Configure API key for insights"],
      achievements: [],
    };
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const totalTrips = travelHistory.length;
  const totalCarbon = travelHistory.reduce((sum, trip) => sum + trip.totalCarbonFootprint, 0);
  const avgScore = travelHistory.reduce((sum, trip) => sum + trip.sustainabilityScore, 0) / totalTrips;
  const modeUsage = travelHistory.reduce((acc, trip) => {
    trip.transportModes.forEach(segment => {
      acc[segment.mode] = (acc[segment.mode] || 0) + 1;
    });
    return acc;
  }, {} as Record<TransportMode, number>);

  const prompt = `
You are EcoTrack's personal sustainability coach. Analyze this user's travel patterns over the past ${timeframe}.

Travel Statistics:
- Total trips: ${totalTrips}
- Total carbon footprint: ${totalCarbon.toFixed(2)} kg CO2e
- Average sustainability score: ${avgScore.toFixed(1)}/100
- Transport mode usage: ${JSON.stringify(modeUsage)}

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
    let text = result.response.text();

    // extract json
    if (text.includes('```json')) {
      text = text.substring(text.indexOf('```json') + 7);
      text = text.substring(0, text.indexOf('```'));
    } else if (text.includes('```')) {
      text = text.substring(text.indexOf('```') + 3);
      text = text.substring(0, text.indexOf('```'));
    }

    return JSON.parse(text.trim());

  } catch (error) {
    console.error("Insights generation failed:", error);
    return {
      insights: ["Unable to analyze patterns"],
      recommendations: ["Keep choosing sustainable options"],
      achievements: [],
    };
  }
};

// US average travel carbon emissions (based on EPA data)
const US_AVERAGE_MONTHLY_EMISSIONS = 400; // kg CO2 per person per month
const US_AVERAGE_YEARLY_EMISSIONS = 4800; // kg CO2 per person per year

// generate sustainability targets based on user's travel history
export const generateSustainabilityTargets = async (
  travelHistory: {
    totalTrips: number;
    totalCarbonFootprint: number;
    totalCarbonSaved: number;
    averageSustainabilityScore: number;
    monthlyMetrics: Array<{
      month: string;
      carbonFootprint: number;
      carbonSaved: number;
      tripCount: number;
      sustainabilityScore: number;
    }>;
    yearlyMetrics: Array<{
      year: string;
      carbonFootprint: number;
      carbonSaved: number;
      tripCount: number;
      sustainabilityScore: number;
    }>;
  }
): Promise<{
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
}> => {
  if (!genAI || !process.env.GEMINI_API_KEY) {
    console.warn("Gemini API key not configured, returning default targets");
    return {
      monthly: {
        carbonReduction: 20,
        sustainabilityScore: 75,
        carbonSaved: US_AVERAGE_MONTHLY_EMISSIONS,
        tripCount: 10,
        description: "Reduce carbon emissions by 20% compared to conventional travel methods"
      },
      yearly: {
        carbonReduction: 30,
        sustainabilityScore: 80,
        carbonSaved: US_AVERAGE_YEARLY_EMISSIONS,
        tripCount: 100,
        description: "Achieve 30% carbon reduction and 80+ sustainability score annually"
      }
    };
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Calculate recent trends
  const recentMonths = travelHistory.monthlyMetrics.slice(-3);
  const avgMonthlyCarbon = recentMonths.reduce((sum, m) => sum + m.carbonFootprint, 0) / Math.max(recentMonths.length, 1);
  const avgMonthlySaved = recentMonths.reduce((sum, m) => sum + m.carbonSaved, 0) / Math.max(recentMonths.length, 1);
  const avgMonthlyTrips = recentMonths.reduce((sum, m) => sum + m.tripCount, 0) / Math.max(recentMonths.length, 1);
  const avgMonthlyScore = recentMonths.reduce((sum, m) => sum + m.sustainabilityScore, 0) / Math.max(recentMonths.length, 1);

  const prompt = `
You are EcoTrack's sustainability goal advisor. Based on the user's travel history, generate realistic and motivating monthly and yearly sustainability targets.

User's Current Travel Statistics:
- Total trips completed: ${travelHistory.totalTrips}
- Total carbon footprint: ${travelHistory.totalCarbonFootprint.toFixed(2)} kg CO2e
- Total carbon saved: ${travelHistory.totalCarbonSaved.toFixed(2)} kg CO2e
- Average sustainability score: ${travelHistory.averageSustainabilityScore.toFixed(1)}/100

Recent 3-Month Averages:
- Monthly carbon footprint: ${avgMonthlyCarbon.toFixed(2)} kg CO2e
- Monthly carbon saved: ${avgMonthlySaved.toFixed(2)} kg CO2e
- Monthly trips: ${avgMonthlyTrips.toFixed(1)}
- Monthly sustainability score: ${avgMonthlyScore.toFixed(1)}/100

Recent Monthly Data:
${JSON.stringify(recentMonths, null, 2)}

Yearly Data:
${JSON.stringify(travelHistory.yearlyMetrics, null, 2)}

Generate personalized sustainability targets that are:
1. **Realistic**: Based on the user's current patterns and achievable with effort
2. **Motivating**: Challenging enough to drive improvement but not discouraging
3. **Progressive**: Show improvement over their current performance

For MONTHLY targets, consider:
- If user has few trips (< 5), set modest improvement targets (10-15% better)
- If user already has good scores (>70), aim for 5-10% improvement
- If user has lower scores (<70), aim for 15-25% improvement
- Target should be based on next month's expected performance

For YEARLY targets, consider:
- More ambitious than monthly (20-40% improvement)
- Account for seasonal variations and growth
- Build on monthly target achievements

Calculate ONLY these values (other values are pre-set):
- **carbonReduction**: Target percentage reduction in carbon emissions compared to conventional travel (10-50%)
- **sustainabilityScore**: Target average sustainability score (60-100, MUST be between 0-100)
- **tripCount**: Expected number of trips to complete

NOTE:
- Do NOT generate carbonSaved values - they are set to US averages (${US_AVERAGE_MONTHLY_EMISSIONS} kg/month, ${US_AVERAGE_YEARLY_EMISSIONS} kg/year)
- Sustainability score MUST be a number between 0 and 100 (NOT percentage, just the score)
- Focus on achievable improvement based on user's current scores

Respond with a JSON object in this exact format:
{
  "monthly": {
    "carbonReduction": number (percentage, e.g., 25 for 25%),
    "sustainabilityScore": number (0-100, current avg: ${avgMonthlyScore.toFixed(1)}),
    "tripCount": number,
    "description": "string"
  },
  "yearly": {
    "carbonReduction": number (percentage),
    "sustainabilityScore": number (0-100, current avg: ${travelHistory.averageSustainabilityScore.toFixed(1)}),
    "tripCount": number,
    "description": "string"
  }
}
`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // Extract JSON from response
    if (text.includes('```json')) {
      text = text.substring(text.indexOf('```json') + 7);
      text = text.substring(0, text.indexOf('```'));
    } else if (text.includes('```')) {
      text = text.substring(text.indexOf('```') + 3);
      text = text.substring(0, text.indexOf('```'));
    }

    const targets = JSON.parse(text.trim());

    // Add constant carbon saved targets based on US averages
    targets.monthly.carbonSaved = US_AVERAGE_MONTHLY_EMISSIONS;
    targets.yearly.carbonSaved = US_AVERAGE_YEARLY_EMISSIONS;

    // Ensure sustainability scores are capped at 100
    targets.monthly.sustainabilityScore = Math.min(100, Math.max(0, targets.monthly.sustainabilityScore));
    targets.yearly.sustainabilityScore = Math.min(100, Math.max(0, targets.yearly.sustainabilityScore));

    return targets;

  } catch (error) {
    console.error("Target generation failed:", error);

    // Return smart defaults based on user's actual data
    const monthlyTarget = avgMonthlyScore > 0 ? avgMonthlyScore + 10 : 75;
    const yearlyTarget = travelHistory.averageSustainabilityScore > 0
      ? travelHistory.averageSustainabilityScore + 15
      : 80;

    return {
      monthly: {
        carbonReduction: avgMonthlySaved > 0 ? 20 : 15,
        sustainabilityScore: Math.min(100, Math.max(60, monthlyTarget)),
        carbonSaved: US_AVERAGE_MONTHLY_EMISSIONS,
        tripCount: avgMonthlyTrips > 0 ? Math.ceil(avgMonthlyTrips) : 10,
        description: "Improve your monthly sustainability by choosing greener transport options"
      },
      yearly: {
        carbonReduction: travelHistory.totalCarbonSaved > 0 ? 30 : 25,
        sustainabilityScore: Math.min(100, Math.max(70, yearlyTarget)),
        carbonSaved: US_AVERAGE_YEARLY_EMISSIONS,
        tripCount: travelHistory.totalTrips > 0 ? Math.ceil(travelHistory.totalTrips * 1.2) : 100,
        description: "Make sustainable travel your default choice and reduce your annual carbon footprint"
      }
    };
  }
};

// main trip planning function
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
    const { googleMapsService } = await import('./googleMapsService');

    const transportModes = preferences?.preferredTransportModes && preferences.preferredTransportModes.length > 0
      ? preferences.preferredTransportModes
      : [TransportMode.CAR, TransportMode.TRAIN, TransportMode.BUS, TransportMode.PLANE];

    let originAddr = origin;
    if (origin === 'My Current Location' && userLocation) {
      originAddr = `${userLocation.latitude},${userLocation.longitude}`;
    }

    const googleRoutes = await googleMapsService.calculateRoutes(
      originAddr,
      destination,
      transportModes,
      travelDate
    );

    if (!googleRoutes || googleRoutes.length === 0) {
      throw new Error('No routes found');
    }

    const enhanced = CarbonCalculationService.processRouteOptions(googleRoutes);

    // sort by preference
    let finalRoutes = enhanced;
    if (preferences?.prioritizeSustainability !== false) {
      finalRoutes = enhanced.sort((a, b) => b.sustainabilityScore - a.sustainabilityScore);
    } else {
      finalRoutes = enhanced.sort((a, b) => {
        const diff = a.totalCost - b.totalCost;
        if (Math.abs(diff) > 1) return diff;
        return a.totalDuration - b.totalDuration;
      });
    }

    // apply filters
    if (preferences?.maxTravelTime) {
      finalRoutes = finalRoutes.filter(r => r.totalDuration <= preferences.maxTravelTime!);
    }

    if (preferences?.budgetLimit) {
      finalRoutes = finalRoutes.filter(r => r.totalCost <= preferences.budgetLimit!);
    }

    const analysis = await analyzeSustainability(finalRoutes, origin, destination);

    return { routes: finalRoutes, analysis };

  } catch (error) {
    console.error('Trip planning failed:', error);
    throw error;
  }
};
