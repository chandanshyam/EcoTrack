import { Location, RouteOption, TransportMode, TransportSegment } from '@/lib/types';

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
  duration_in_traffic?: {
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
    value: number;
  };
  duration: {
    text: string;
    value: number;
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
  transit_details?: {
    arrival_stop: {
      name: string;
    };
    departure_stop: {
      name: string;
    };
    line: {
      name: string;
      vehicle: {
        type: string;
      };
    };
    num_stops: number;
  };
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

import { CarbonCalculationService } from './carbonCalculationService';
import { routeCache, locationCache, generateRouteKey, withCache } from '@/lib/utils/cache';

// cost estimates per km
const COST_FACTORS = {
  [TransportMode.CAR]: 0.56,
  [TransportMode.TRAIN]: 0.15,
  [TransportMode.BUS]: 0.10,
  [TransportMode.PLANE]: 0.25,
};

class GoogleMapsService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor() {
    // Only use server-side env var - this service should never be instantiated in the browser
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  }

  private checkApiKey(): void {
    if (!this.apiKey) {
      throw new Error('Google Maps API key required. This service must only be used server-side.');
    }
  }

  async geocodeAddress(address: string): Promise<Location> {
    const cacheKey = `geocode:${address.toLowerCase().trim()}`;
    const cached = locationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    this.checkApiKey();
    const url = `${this.baseUrl}/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;

    try {
      const response = await fetch(url);
      const data: GoogleMapsGeocodingResponse = await response.json();

      if (data.status !== 'OK' || !data.results.length) {
        throw new Error(`Geocoding failed: ${data.error_message || data.status}`);
      }

      const result = data.results[0];
      const location = {
        address: result.formatted_address,
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
      };

      locationCache.set(cacheKey, location);
      return location;
    } catch (error) {
      console.error('Geocoding error:', error);
      throw new Error(`Failed to geocode address: ${address}`);
    }
  }

  async calculateRoutes(
    origin: string,
    destination: string,
    transportModes: TransportMode[] = [TransportMode.CAR, TransportMode.TRAIN, TransportMode.BUS],
    travelDate?: string
  ): Promise<RouteOption[]> {
    const cacheKey = generateRouteKey(origin, destination, transportModes.map(m => m.toString()));
    const cached = routeCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    this.checkApiKey();
    const routes: RouteOption[] = [];

    const [originLoc, destLoc] = await Promise.all([
      this.geocodeAddress(origin),
      this.geocodeAddress(destination),
    ]);

    for (const mode of transportModes) {
      try {
        const route = await this.calculateSingleRoute(
          originLoc,
          destLoc,
          mode,
          travelDate
        );
        if (route) {
          routes.push(route);
        }
      } catch (error) {
        console.warn(`Failed to calculate route for ${mode}:`, error);
      }
    }

    const sorted = routes.sort((a, b) => b.sustainabilityScore - a.sustainabilityScore);
    routeCache.set(cacheKey, sorted);
    return sorted;
  }

  // get actual transit time (in-vehicle only)
  private calculateTransitOnlyDuration(route: GoogleMapsRoute): number {
    let transitTime = 0;

    for (const leg of route.legs) {
      for (const step of leg.steps) {
        if (step.travel_mode === 'TRANSIT' && step.transit_details) {
          transitTime += step.duration.value;
        }
      }
    }

    return transitTime / 60; // convert to minutes
  }

  private async calculateSingleRoute(
    origin: Location,
    destination: Location,
    mode: TransportMode,
    travelDate?: string
  ): Promise<RouteOption | null> {
    const travelMode = this.mapTransportModeToGoogleMaps(mode);

    let url = `${this.baseUrl}/directions/json?` +
      `origin=${origin.coordinates.lat},${origin.coordinates.lng}&` +
      `destination=${destination.coordinates.lat},${destination.coordinates.lng}&` +
      `mode=${travelMode}&`;

    if (travelMode === 'transit') {
      const departureTime = travelDate
        ? Math.floor(new Date(travelDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      url += `departure_time=${departureTime}&`;

      const transitMode = this.getTransitModePreference(mode);
      if (transitMode) {
        url += `transit_mode=${transitMode}&`;
      }

      url += `transit_routing_preference=fewer_transfers&`;
      url += `alternatives=true&`;
    }

    url += `key=${this.apiKey}`;

    try {
      const response = await fetch(url);
      const data: GoogleMapsDirectionsResponse = await response.json();

      if (data.status !== 'OK' || !data.routes.length) {
        console.warn(`No route found for ${mode}: ${data.error_message || data.status}`);
        return null;
      }

      // pick fastest route for transit
      let googleRoute = data.routes[0];
      if (travelMode === 'transit' && data.routes.length > 1) {
        googleRoute = data.routes.reduce((fastest, current) => {
          const getDuration = (route: any) => {
            if (route.duration_in_traffic?.value) return route.duration_in_traffic.value;
            if (route.duration?.value) return route.duration.value;
            return route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0);
          };
          return getDuration(current) < getDuration(fastest) ? current : fastest;
        }, data.routes[0]);
      }

      const distanceMeters = googleRoute.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);
      const distanceKm = distanceMeters / 1000;

      let durationMinutes: number;
      const totalDurationSeconds = googleRoute.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0);

      if (travelMode === 'transit') {
        // only count in-vehicle time for transit
        durationMinutes = this.calculateTransitOnlyDuration(googleRoute);
      } else {
        durationMinutes = totalDurationSeconds / 60;
      }

      const carbonEmission = distanceKm * CarbonCalculationService.getEmissionFactor(mode, undefined, distanceKm);
      const cost = distanceKm * COST_FACTORS[mode];

      const transportSegment: TransportSegment = {
        mode,
        duration: durationMinutes,
        distance: distanceKm,
        carbonEmission,
        cost,
        provider: this.getProviderName(mode),
      };

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

  private mapTransportModeToGoogleMaps(mode: TransportMode): string {
    switch (mode) {
      case TransportMode.CAR:
        return 'driving';
      case TransportMode.TRAIN:
      case TransportMode.BUS:
        return 'transit';
      case TransportMode.PLANE:
        return 'driving'; // fallback, planes not supported
      default:
        return 'driving';
    }
  }

  private getTransitModePreference(mode: TransportMode): string | null {
    switch (mode) {
      case TransportMode.TRAIN:
        return 'rail';
      case TransportMode.BUS:
        return 'bus';
      default:
        return null;
    }
  }

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
      default:
        return 'Unknown';
    }
  }

  private getProviderName(mode: TransportMode): string | undefined {
    switch (mode) {
      case TransportMode.TRAIN:
        return 'Local Rail';
      case TransportMode.BUS:
        return 'Public Bus';
      case TransportMode.PLANE:
        return 'Airline';
      default:
        return undefined;
    }
  }

  // autocomplete places
  async getPlaceSuggestions(input: string, location?: { lat: number; lng: number }): Promise<string[]> {
    const isServer = typeof window === 'undefined';

    if (!isServer) {
      // use API route to avoid CORS
      try {
        const params = new URLSearchParams({ input });
        if (location) {
          params.append('lat', location.lat.toString());
          params.append('lng', location.lng.toString());
        }

        const response = await fetch(`/api/places/autocomplete?${params}`);
        const data = await response.json();
        return data.suggestions || [];
      } catch (error) {
        console.error('Place autocomplete error:', error);
        return [];
      }
    }

    // server-side: direct API call
    this.checkApiKey();
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

export const googleMapsService = new GoogleMapsService();

// wrapper for AI planning service
export const getRoutes = async (
  origin: string,
  destination: string,
  transportModes?: TransportMode[],
  travelDate?: string
): Promise<RouteOption[]> => {
  return googleMapsService.calculateRoutes(
    origin,
    destination,
    transportModes || [TransportMode.CAR, TransportMode.TRAIN, TransportMode.BUS],
    travelDate
  );
};
