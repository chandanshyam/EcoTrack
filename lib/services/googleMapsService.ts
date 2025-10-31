import { env } from '@/lib/env';
import { Location, RouteOption, TransportMode, TransportSegment } from '@/lib/types';

// Google Maps API response types
interface GoogleMapsDirectionsResponse {
  routes: GoogleMapsRoute[];
  status: string;
  error_message?: string;
}

interface GoogleMapsRoute {
  legs: GoogleMapsLeg[];
  overview_polyline: {
    points: string;
  };
  summary: string;
  warnings: string[];
  duration: {
    text: string;
    value: number;
  };
  distance: {
    text: string;
    value: number;
  };
}

interface GoogleMapsLeg {
  distance: {
    text: string;
    value: number; // meters
  };
  duration: {
    text: string;
    value: number; // seconds
  };
  start_address: string;
  end_address: string;
  start_location: {
    lat: number;
    lng: number;
  };
  end_location: {
    lat: number;
    lng: number;
  };
  steps: GoogleMapsStep[];
}

interface GoogleMapsStep {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  travel_mode: string;
  instructions: string;
}

interface GoogleMapsGeocodingResponse {
  results: GoogleMapsGeocodingResult[];
  status: string;
  error_message?: string;
}

interface GoogleMapsGeocodingResult {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
}

// Import carbon calculation service for consistent calculations
import { CarbonCalculationService } from './carbonCalculationService';

// Cost estimates (USD per km)
const COST_FACTORS = {
  [TransportMode.CAR]: 0.56, // Including fuel, maintenance, depreciation
  [TransportMode.TRAIN]: 0.15, // Average train fare
  [TransportMode.BUS]: 0.10, // Average bus fare
  [TransportMode.PLANE]: 0.25, // Average domestic flight
  [TransportMode.BIKE]: 0.02, // Maintenance and depreciation
  [TransportMode.WALK]: 0, // Free
  [TransportMode.METRO]: 0.12, // Average metro fare
};

class GoogleMapsService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor() {
    this.apiKey = env.GOOGLE_MAPS_API_KEY;
    if (!this.apiKey) {
      throw new Error('Google Maps API key is required');
    }
  }

  /**
   * Geocode an address to get coordinates and formatted address
   */
  async geocodeAddress(address: string): Promise<Location> {
    const url = `${this.baseUrl}/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      const data: GoogleMapsGeocodingResponse = await response.json();
      
      if (data.status !== 'OK' || !data.results.length) {
        throw new Error(`Geocoding failed: ${data.error_message || data.status}`);
      }
      
      const result = data.results[0];
      return {
        address: result.formatted_address,
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      throw new Error(`Failed to geocode address: ${address}`);
    }
  }

  /**
   * Calculate routes between two locations with multiple transport modes
   */
  async calculateRoutes(
    origin: string,
    destination: string,
    transportModes: TransportMode[] = [TransportMode.CAR, TransportMode.TRAIN, TransportMode.BUS]
  ): Promise<RouteOption[]> {
    const routes: RouteOption[] = [];
    
    // Geocode origin and destination
    const [originLocation, destinationLocation] = await Promise.all([
      this.geocodeAddress(origin),
      this.geocodeAddress(destination),
    ]);

    // Calculate routes for each transport mode
    for (const mode of transportModes) {
      try {
        const route = await this.calculateSingleRoute(
          originLocation,
          destinationLocation,
          mode
        );
        if (route) {
          routes.push(route);
        }
      } catch (error) {
        console.warn(`Failed to calculate route for ${mode}:`, error);
        // Continue with other transport modes
      }
    }

    // Sort routes by sustainability score (highest first)
    return routes.sort((a, b) => b.sustainabilityScore - a.sustainabilityScore);
  }

  /**
   * Calculate a single route for a specific transport mode
   */
  private async calculateSingleRoute(
    origin: Location,
    destination: Location,
    mode: TransportMode
  ): Promise<RouteOption | null> {
    const travelMode = this.mapTransportModeToGoogleMaps(mode);
    const url = `${this.baseUrl}/directions/json?` +
      `origin=${origin.coordinates.lat},${origin.coordinates.lng}&` +
      `destination=${destination.coordinates.lat},${destination.coordinates.lng}&` +
      `mode=${travelMode}&` +
      `key=${this.apiKey}`;

    try {
      const response = await fetch(url);
      const data: GoogleMapsDirectionsResponse = await response.json();
      
      if (data.status !== 'OK' || !data.routes.length) {
        console.warn(`No route found for ${mode}: ${data.error_message || data.status}`);
        return null;
      }
      
      const googleRoute = data.routes[0];
      const distanceKm = googleRoute.distance.value / 1000; // Convert meters to km
      const durationMinutes = googleRoute.duration.value / 60; // Convert seconds to minutes
      
      // Calculate carbon footprint using our enhanced service
      const carbonEmission = distanceKm * CarbonCalculationService.getEmissionFactor(mode);
      const cost = distanceKm * COST_FACTORS[mode];
      
      // Create transport segment
      const transportSegment: TransportSegment = {
        mode,
        duration: durationMinutes,
        distance: distanceKm,
        carbonEmission,
        cost,
        provider: this.getProviderName(mode),
      };
      
      // Calculate sustainability score using our enhanced service
      const sustainabilityScore = CarbonCalculationService.calculateSustainabilityScore(
        carbonEmission,
        distanceKm,
        [{ mode, duration: durationMinutes, distance: distanceKm, carbonEmission, cost }]
      );
      
      return {
        id: `route-${mode}-${Date.now()}`,
        name: this.getRouteName(mode),
        origin,
        destination,
        transportModes: [transportSegment],
        totalDuration: durationMinutes,
        totalDistance: distanceKm,
        totalCost: cost,
        totalCarbonFootprint: carbonEmission,
        sustainabilityScore,
      };
    } catch (error) {
      console.error(`Error calculating route for ${mode}:`, error);
      return null;
    }
  }

  /**
   * Map our transport modes to Google Maps travel modes
   */
  private mapTransportModeToGoogleMaps(mode: TransportMode): string {
    switch (mode) {
      case TransportMode.CAR:
        return 'driving';
      case TransportMode.TRAIN:
      case TransportMode.BUS:
      case TransportMode.METRO:
        return 'transit';
      case TransportMode.BIKE:
        return 'bicycling';
      case TransportMode.WALK:
        return 'walking';
      case TransportMode.PLANE:
        return 'driving'; // Fallback, planes not supported by Directions API
      default:
        return 'driving';
    }
  }

  /**
   * Get a human-readable route name
   */
  private getRouteName(mode: TransportMode): string {
    switch (mode) {
      case TransportMode.CAR:
        return 'Drive';
      case TransportMode.TRAIN:
        return 'Train';
      case TransportMode.BUS:
        return 'Bus';
      case TransportMode.PLANE:
        return 'Flight';
      case TransportMode.BIKE:
        return 'Bike';
      case TransportMode.WALK:
        return 'Walk';
      case TransportMode.METRO:
        return 'Metro';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get provider name for transport mode
   */
  private getProviderName(mode: TransportMode): string | undefined {
    switch (mode) {
      case TransportMode.TRAIN:
        return 'Local Rail';
      case TransportMode.BUS:
        return 'Public Bus';
      case TransportMode.METRO:
        return 'Metro System';
      case TransportMode.PLANE:
        return 'Airline';
      default:
        return undefined;
    }
  }



  /**
   * Get place suggestions for autocomplete
   */
  async getPlaceSuggestions(input: string, location?: { lat: number; lng: number }): Promise<string[]> {
    const url = `${this.baseUrl}/place/autocomplete/json?` +
      `input=${encodeURIComponent(input)}&` +
      `types=geocode&` +
      (location ? `location=${location.lat},${location.lng}&radius=50000&` : '') +
      `key=${this.apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        console.warn('Place autocomplete failed:', data.error_message || data.status);
        return [];
      }
      
      return data.predictions.map((prediction: any) => prediction.description);
    } catch (error) {
      console.error('Place autocomplete error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const googleMapsService = new GoogleMapsService();

/**
 * Get routes between two locations (wrapper for calculateRoutes)
 * This function is used by the AI planning service
 */
export const getRoutes = async (
  origin: string,
  destination: string,
  transportModes?: TransportMode[]
): Promise<RouteOption[]> => {
  return googleMapsService.calculateRoutes(
    origin,
    destination,
    transportModes || [TransportMode.CAR, TransportMode.TRAIN, TransportMode.BUS, TransportMode.BIKE, TransportMode.WALK]
  );
};