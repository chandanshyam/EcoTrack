import { Location, RouteOption, TransportMode, TransportSegment, TransitDetails } from '@/lib/types';

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
  polyline?: {
    points: string;
  };
  transit_details?: {
    arrival_stop: {
      name: string;
    };
    departure_stop: {
      name: string;
    };
    arrival_time?: {
      text: string;
      value: number;
    };
    departure_time?: {
      text: string;
      value: number;
    };
    line: {
      name: string;
      short_name?: string;
      agencies?: Array<{
        name: string;
        url?: string;
      }>;
      vehicle: {
        type: string;
        name?: string;
      };
    };
    num_stops: number;
    fare?: {
      value: number;
      currency: string;
      text: string;
    };
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
import { findNearestAirport, findAirportByAddress } from '@/lib/utils/airportCodes';

// Accurate cost estimates per mile
const COST_FACTORS: Record<TransportMode, number> = {
  [TransportMode.CAR]: 0.23, // $0.23 per mile (average total cost including gas, maintenance, depreciation)
  [TransportMode.BUS]: 0.09, // $0.09 per mile (median of $0.06-$0.12)
  [TransportMode.TRAIN]: 0.055, // $0.055 per mile (median of $0.03-$0.08)
  [TransportMode.PLANE]: 0.25, // $0.25 per mile (average, varies by distance)
};

// Calculate accurate flight costs based on distance brackets
const getFlightCostPerMile = (distanceMiles: number): number => {
  if (distanceMiles < 250) {
    return 0.82; // $0.82 per mile for short flights
  } else if (distanceMiles <= 2000) {
    return 0.25; // $0.25 per mile for medium flights
  } else {
    return 0.15; // $0.15 per mile for long flights
  }
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

    // Calculate direct routes for each mode
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

  // Detect actual transit vehicle types in route
  private detectActualTransitModes(route: GoogleMapsRoute): Set<string> {
    const modes = new Set<string>();

    for (const leg of route.legs) {
      for (const step of leg.steps) {
        if (step.travel_mode === 'TRANSIT' && step.transit_details?.line?.vehicle?.type) {
          modes.add(step.transit_details.line.vehicle.type.toUpperCase());
        }
      }
    }

    return modes;
  }

  // Extract transit details from route (combines all transit steps)
  private extractTransitDetails(route: GoogleMapsRoute): TransitDetails | undefined {
    const transitSteps = [];

    for (const leg of route.legs) {
      for (const step of leg.steps) {
        if (step.travel_mode === 'TRANSIT' && step.transit_details) {
          transitSteps.push(step);
        }
      }
    }

    if (transitSteps.length === 0) {
      return undefined;
    }

    // Get the primary (longest) transit segment
    const primaryTransit = transitSteps.reduce((longest, current) => {
      return current.duration.value > longest.duration.value ? current : longest;
    }, transitSteps[0]);

    const details = primaryTransit.transit_details;
    if (!details) return undefined;

    // Extract fare if available
    let fare = undefined;
    if (details.fare) {
      fare = {
        value: details.fare.value,
        currency: details.fare.currency,
        text: details.fare.text,
      };
    }

    // Extract departure and arrival times
    const departureTime = details.departure_time?.text;
    const arrivalTime = details.arrival_time?.text;

    return {
      line: details.line.name || 'Transit Line',
      vehicleType: details.line.vehicle.type || 'TRANSIT',
      departureStop: {
        name: details.departure_stop.name,
        departureTime: departureTime,
      },
      arrivalStop: {
        name: details.arrival_stop.name,
        arrivalTime: arrivalTime,
      },
      numStops: details.num_stops || 0,
      agencyName: details.line.agencies?.[0]?.name,
      fare,
    };
  }

  private async calculateSingleRoute(
    origin: Location,
    destination: Location,
    mode: TransportMode,
    travelDate?: string
  ): Promise<RouteOption | null> {
    // Special handling for flights - calculate direct route with CO2 optimization
    if (mode === TransportMode.PLANE) {
      return this.calculateFlightRoute(origin, destination);
    }

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

      // Validate that the route contains the requested transit mode
      if (travelMode === 'transit') {
        const actualModes = this.detectActualTransitModes(googleRoute);
        const requestedVehicleType = mode === TransportMode.TRAIN ? 'RAIL' :
                                     mode === TransportMode.BUS ? 'BUS' : '';

        // Check if the route contains the requested mode
        const hasRequestedMode = Array.from(actualModes).some(vehicleType =>
          vehicleType.includes(requestedVehicleType) ||
          (requestedVehicleType === 'RAIL' && (vehicleType.includes('TRAIN') || vehicleType.includes('SUBWAY') || vehicleType.includes('HEAVY_RAIL') || vehicleType.includes('COMMUTER_TRAIN')))
        );

        if (!hasRequestedMode && requestedVehicleType) {
          console.log(`❌ Requested ${mode} but got ${Array.from(actualModes).join(', ')} - rejecting direct route`);
          return null; // Let multi-modal routes handle this
        }

        // Validate that the route actually reaches the destination
        const routeEndLat = googleRoute.legs[googleRoute.legs.length - 1].end_location.lat;
        const routeEndLng = googleRoute.legs[googleRoute.legs.length - 1].end_location.lng;
        const distanceToDestination = this.calculateDistance(
          { lat: routeEndLat, lng: routeEndLng },
          destination.coordinates
        );

        // If route endpoint is more than 5 miles from destination, reject it
        if (distanceToDestination > 5) {
          console.log(`❌ Transit route endpoint is ${distanceToDestination.toFixed(2)} miles from destination - rejecting`);
          return null; // Let multi-modal routes handle this
        }
      }

      const distanceMeters = googleRoute.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);
      const distanceMiles = distanceMeters / 1609.34; // Convert meters to miles

      let durationMinutes: number;
      const totalDurationSeconds = googleRoute.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0);

      if (travelMode === 'transit') {
        // only count in-vehicle time for transit
        durationMinutes = this.calculateTransitOnlyDuration(googleRoute);
      } else {
        durationMinutes = totalDurationSeconds / 60;
      }

      const carbonEmission = distanceMiles * CarbonCalculationService.getEmissionFactor(mode, undefined, distanceMiles);
      const cost = distanceMiles * COST_FACTORS[mode];

      // Extract transit details for train/bus routes
      const transitDetails = (travelMode === 'transit') ? this.extractTransitDetails(googleRoute) : undefined;

      const transportSegment: TransportSegment = {
        mode,
        duration: durationMinutes,
        distance: distanceMiles,
        carbonEmission,
        cost,
        provider: this.getProviderName(mode),
        transitDetails,
      };

      const sustainabilityScore = CarbonCalculationService.calculateSustainabilityScore(
        carbonEmission,
        distanceMiles,
        [{ mode, duration: durationMinutes, distance: distanceMiles, carbonEmission, cost }]
      );

      // Extract polyline based on transport mode
      const polyline = this.getPolylineForMode(googleRoute, mode);
      console.log(`🗺️ Generated polyline for ${mode}: ${polyline.length} chars`);

      return {
        id: `route-${mode}-${Date.now()}`,
        name: this.getRouteName(primaryMode),
        origin,
        destination,
        transportModes: segments,
        totalDuration: durationMinutes,
        totalDistance: distanceMiles,
        totalCost: cost,
        totalCarbonFootprint: carbonEmission,
        sustainabilityScore,
        polyline, // Include polyline for detailed map routing
      };
    } catch (error) {
      console.error(`Error calculating route for ${mode}:`, error);
      return null;
    }
  }

  // Estimate flight emissions based on distance
  private estimateFlightEmissions(distanceMiles: number): number {
    let emissionFactor: number;

    if (distanceMiles < 311) {
      emissionFactor = CarbonCalculationService.getEmissionFactor(TransportMode.PLANE, 'domestic', distanceMiles);
    } else if (distanceMiles < 932) {
      emissionFactor = CarbonCalculationService.getEmissionFactor(TransportMode.PLANE, 'shortHaul', distanceMiles);
    } else {
      emissionFactor = CarbonCalculationService.getEmissionFactor(TransportMode.PLANE, 'longHaul', distanceMiles);
    }

    return distanceMiles * emissionFactor;
  }

  // Get flight type based on distance
  private getFlightType(distanceMiles: number): string {
    if (distanceMiles < 311) {
      return 'Domestic';
    } else if (distanceMiles < 932) {
      return 'Short-haul';
    } else {
      return 'Long-haul';
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
        return 'flight'; // Special handling for flights
      default:
        return 'driving';
    }
  }

  // Calculate direct flight distance and create optimized flight route
  private async calculateFlightRoute(
    origin: Location,
    destination: Location
  ): Promise<RouteOption | null> {
    try {
      // Calculate great circle distance for direct flight
      const R = 3958.8; // Earth's radius in miles
      const lat1 = origin.coordinates.lat * Math.PI / 180;
      const lat2 = destination.coordinates.lat * Math.PI / 180;
      const dLat = (destination.coordinates.lat - origin.coordinates.lat) * Math.PI / 180;
      const dLon = (destination.coordinates.lng - origin.coordinates.lng) * Math.PI / 180;

      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distanceMiles = R * c;

      // Estimate flight duration based on average commercial aircraft speed (500-550 mph)
      const averageSpeed = 525; // mph
      const durationMinutes = Math.round((distanceMiles / averageSpeed) * 60) + 60; // +60 min for takeoff/landing/taxi

      // Calculate CO2 emissions using industry-standard estimates
      const carbonEmission = this.estimateFlightEmissions(distanceMiles);
      const flightType = this.getFlightType(distanceMiles);

      // Find nearest airports for display
      const originAirport = findAirportByAddress(origin.address) || findNearestAirport(origin.coordinates.lat, origin.coordinates.lng);
      const destAirport = findAirportByAddress(destination.address) || findNearestAirport(destination.coordinates.lat, destination.coordinates.lng);
      const airlineInfo = (originAirport && destAirport) ? ` (${originAirport.code}-${destAirport.code})` : '';

      const costPerMile = getFlightCostPerMile(distanceMiles);
      const cost = distanceMiles * costPerMile;

      const transportSegment: TransportSegment = {
        mode: TransportMode.PLANE,
        duration: durationMinutes,
        distance: distanceMiles,
        carbonEmission,
        cost,
        provider: `${flightType} Flight (Economy)`,
      };

      const sustainabilityScore = CarbonCalculationService.calculateSustainabilityScore(
        carbonEmission,
        distanceMiles,
        [transportSegment]
      );

      // Create polyline for straight line (great circle route approximation)
      const polyline = this.encodePolylineFromPoints([
        origin.coordinates,
        destination.coordinates
      ]);

      return {
        id: `route-plane-${Date.now()}`,
        name: `Flight (${flightType}${airlineInfo})`,
        origin,
        destination,
        transportModes: [transportSegment],
        totalDuration: durationMinutes,
        totalDistance: distanceMiles,
        totalCost: cost,
        totalCarbonFootprint: carbonEmission,
        sustainabilityScore,
        polyline,
      };
    } catch (error) {
      console.error('Error calculating flight route:', error);
      return null;
    }
  }

  // Get polyline optimized for the specific transport mode
  private getPolylineForMode(route: GoogleMapsRoute, mode: TransportMode): string {
    // 🚗 For cars, use overview polyline from Google
    if (mode === TransportMode.CAR) {
      // Use overview polyline — already road-accurate and compressed
      return route.overview_polyline?.points || '';
    }

    // 🚆🚌 For trains and buses, combine all transit and walking steps for complete route
    if (mode === TransportMode.TRAIN || mode === TransportMode.BUS) {
      const points: Array<{ lat: number; lng: number }> = [];
      for (const leg of route.legs) {
        for (const step of leg.steps) {
          // Include both TRANSIT steps (train/bus segments) and WALKING steps (to/from stations)
          if (step.polyline?.points) {
            const decoded = this.decodePolyline(step.polyline.points);
            points.push(...decoded);
          }
        }
      }

      if (points.length > 0) {
        return this.encodePolylineFromPoints(points);
      }

      // fallback to overview
      return route.overview_polyline?.points || '';
    }

    // ✈️ For flights, keep the straight great-circle approximation
    console.warn(`No polyline available for ${mode}, returning empty`);
    return '';
  }

  // Decode Google Maps encoded polyline into lat/lng points
  private decodePolyline(encoded: string): Array<{lat: number, lng: number}> {
    const points: Array<{lat: number, lng: number}> = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b: number;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }

    return points;
  }

  // Encode array of points into Google Maps polyline format
  private encodePolylineFromPoints(points: Array<{lat: number, lng: number}>): string {
    if (points.length === 0) return '';

    let encodedString = '';
    let prevLat = 0;
    let prevLng = 0;

    for (const point of points) {
      const lat = Math.round(point.lat * 1e5);
      const lng = Math.round(point.lng * 1e5);

      encodedString += this.encodeNumber(lat - prevLat);
      encodedString += this.encodeNumber(lng - prevLng);

      prevLat = lat;
      prevLng = lng;
    }

    return encodedString;
  }

  // Encode a single number for polyline format
  private encodeNumber(num: number): string {
    let encoded = '';
    const sgn = num < 0 ? 1 : 0;
    num = Math.abs(num) << 1;
    num |= sgn;

    while (num >= 0x20) {
      encoded += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
      num >>= 5;
    }

    encoded += String.fromCharCode(num + 63);
    return encoded;
  }

  // Calculate distance between two coordinates using Haversine formula (returns miles)
  private calculateDistance(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
  ): number {
    const R = 3958.8; // Earth's radius in miles
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
        return 'Transit';
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
