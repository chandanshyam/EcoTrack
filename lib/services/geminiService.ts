import { GoogleGenAI } from "@google/genai";
import { RouteOption, SustainabilityAnalysis } from '@/lib/types';
import { env } from '@/lib/env';

const ai = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;

const defaultPlan: { routes: RouteOption[], analysis: SustainabilityAnalysis } = {
  routes: [],
  analysis: {
    summary: "Analysis could not be generated due to an API error.",
    tips: ["Consider off-peak travel to reduce congestion.", "Combine trips to be more efficient."],
    comparison: {
      conventionalMethod: "a standard gasoline car",
      conventionalFootprint: 10.0,
      savings: "By choosing a greener option, you could save a significant amount of CO2.",
    }
  }
};

export const planTripWithAI = async (
  origin: string,
  destination: string,
  userLocation?: { latitude: number; longitude: number }
): Promise<{ routes: RouteOption[], analysis: SustainabilityAnalysis }> => {
  if (!ai || !env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Using default plan.");
    return Promise.resolve(defaultPlan);
  }

  const prompt = `
    You are an expert, AI-powered sustainable travel assistant named EcoTrack.
    Your goal is to help users plan trips that minimize their carbon footprint.

    A user wants to travel from "${origin}" to "${destination}".

    Please generate a comprehensive travel plan that includes:
    1.  **Routes**: Create 3-4 diverse, eco-friendly route options.
        - Each route must have a descriptive name (e.g., "Eco Commuter", "Speedy Hybrid").
        - Combine different modes of transport (walk, bike, metro, train, bus) where it makes sense.
        - Include one faster, but less sustainable option involving a car for comparison if relevant.
        - For each route, calculate the total duration (minutes), total distance (kilometers), total cost (in USD), total carbon footprint (in kg CO2e), and a sustainability score (0-100, where 100 is best).
        - Provide a breakdown of each segment in the 'transportModes' array.
    2.  **Analysis**:
        - **Summary**: Write a brief, encouraging summary explaining why the top-ranked route (lowest carbon footprint) is the most eco-friendly choice.
        - **Tips**: Provide 3 actionable and relevant sustainability tips for this specific trip.
        - **Comparison**: Compare the most sustainable route's carbon footprint with a conventional travel method (a standard gasoline car driving the entire distance). Calculate the conventional footprint and describe the potential savings compellingly.

    Your response MUST be a single JSON object. Enclose the JSON object in a \`\`\`json ... \`\`\` markdown code block. Do not include any other explanatory text before or after the code block.
  `;
  
  const modelConfig = {
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleMaps: {} }],
      ...(userLocation && { 
          toolConfig: { 
              retrievalConfig: { 
                  latLng: userLocation 
              } 
          }
      })
    },
  };

  try {
    const response = await ai.models.generateContent(modelConfig);
    let jsonString = response.text?.trim() || '';

    // The model might wrap the JSON in a markdown code block.
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.substring(7, jsonString.length - 3).trim();
    } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.substring(3, jsonString.length - 3).trim();
    }

    const result = JSON.parse(jsonString);

    // Sort routes by lowest carbon footprint before returning
    result.routes.sort((a: RouteOption, b: RouteOption) => a.totalCarbonFootprint - b.totalCarbonFootprint);

    return result;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return defaultPlan;
  }
};