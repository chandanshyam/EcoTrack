/**
 * Transit Service
 * Integrates with OpenTripPlanner (OTP) for real-time public transit data
 * Supports GTFS-RT feeds for live schedule data
 */

// TypeScript Types for Transit Data
export type TransitMode = 'BUS' | 'TRAIN' | 'SUBWAY' | 'TRAM' | 'FERRY' | 'WALK';

export type TransitLeg = {
  mode: TransitMode;
  routeShortName?: string;
  routeLongName?: string;
  headsign?: string;
  agencyName?: string;
  startTime: number; // Unix timestamp
  endTime: number;
  duration: number; // seconds
  distance: number; // meters
  from: TransitPlace;
  to: TransitPlace;
  realTime: boolean;
  transitLeg: boolean;
};

export type TransitPlace = {
  name: string;
  lat: number;
  lon: number;
  stopId?: string;
  stopCode?: string;
};

export type TransitItinerary = {
  duration: number; // seconds
  startTime: number;
  endTime: number;
  walkTime: number;
  transitTime: number;
  waitingTime: number;
  walkDistance: number;
  transfers: number;
  legs: TransitLeg[];
  fare?: TransitFare;
  emissions?: number; // kg CO2
};

export type TransitFare = {
  currency: string;
  cents: number;
  components?: Array<{
    fareId: string;
    price: number;
    routes: string[];
  }>;
};

export type TransitRouteResponse = {
  plan: {
    date: number;
    from: TransitPlace;
    to: TransitPlace;
    itineraries: TransitItinerary[];
  };
  error?: string;
};

export type RealtimeArrival = {
  stopId: string;
  stopName: string;
  routeShortName: string;
  routeLongName: string;
  headsign: string;
  scheduledArrival: number;
  realtimeArrival: number;
  delay: number; // seconds
  vehicleId?: string;
  tripId?: string;
};

export type FaresAndEmissions = {
  totalFare: number;
  currency: string;
  totalEmissions: number; // kg CO2
  breakdown: Array<{
    mode: TransitMode;
    distance: number;
    emissions: number;
    fare?: number;
  }>;
};

/**
 * Emission factors for different transit modes (kg CO2 per km per passenger)
 */
const EMISSION_FACTORS: Record<TransitMode, number> = {
  BUS: 0.089,
  TRAIN: 0.041,
  SUBWAY: 0.035,
  TRAM: 0.029,
  FERRY: 0.019,
  WALK: 0,
};

export class TransitService {
  private otpBaseUrl: string;

  constructor(otpBaseUrl?: string) {
    this.otpBaseUrl = otpBaseUrl || process.env.OTP_BASE_URL || '';

    if (!this.otpBaseUrl) {
      throw new Error(
        'OTP_BASE_URL is not configured. Please set it in environment variables.'
      );
    }
  }

  /**
   * Get transit route from origin to destination
   */
  async getTransitRoute(
    from: string,
    to: string,
    dateTime?: string
  ): Promise<TransitRouteResponse> {
    try {
      const params = new URLSearchParams({
        fromPlace: from,
        toPlace: to,
        mode: 'TRANSIT,WALK',
        maxWalkDistance: '2000',
        arriveBy: 'false',
        wheelchair: 'false',
        numItineraries: '5',
      });

      if (dateTime) {
        params.append('date', this.formatDate(dateTime));
        params.append('time', this.formatTime(dateTime));
      }

      const response = await fetch(
        `${this.otpBaseUrl}/plan?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`OTP API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        return {
          plan: {
            date: Date.now(),
            from: { name: from, lat: 0, lon: 0 },
            to: { name: to, lat: 0, lon: 0 },
            itineraries: [],
          },
          error: data.error.message || 'Unknown error',
        };
      }

      return this.normalizeOTPResponse(data);
    } catch (error) {
      console.error('Error fetching transit route:', error);
      throw new Error(
        `Failed to fetch transit route: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get real-time arrivals for a specific stop
   */
  async getRealtimeArrivals(stopId: string): Promise<RealtimeArrival[]> {
    try {
      const response = await fetch(
        `${this.otpBaseUrl}/index/stops/${stopId}/stoptimes`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`OTP API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return data.map((arrival: any) => ({
        stopId: stopId,
        stopName: arrival.stopName || 'Unknown Stop',
        routeShortName: arrival.pattern?.route?.shortName || arrival.pattern?.route?.id || 'Unknown',
        routeLongName: arrival.pattern?.route?.longName || '',
        headsign: arrival.headsign || arrival.tripHeadsign || '',
        scheduledArrival: arrival.scheduledArrival * 1000, // Convert to ms
        realtimeArrival: arrival.realtimeArrival * 1000,
        delay: (arrival.realtimeArrival - arrival.scheduledArrival),
        vehicleId: arrival.vehicleId,
        tripId: arrival.tripId,
      }));
    } catch (error) {
      console.error('Error fetching realtime arrivals:', error);
      throw new Error(
        `Failed to fetch realtime arrivals: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate fares and emissions for a transit route
   */
  getFaresAndEmissions(itinerary: TransitItinerary): FaresAndEmissions {
    let totalEmissions = 0;
    const breakdown: FaresAndEmissions['breakdown'] = [];

    for (const leg of itinerary.legs) {
      if (leg.transitLeg && leg.mode !== 'WALK') {
        const distanceKm = leg.distance / 1000;
        const emissionFactor = EMISSION_FACTORS[leg.mode] || 0.05;
        const legEmissions = distanceKm * emissionFactor;

        totalEmissions += legEmissions;

        breakdown.push({
          mode: leg.mode,
          distance: distanceKm,
          emissions: legEmissions,
        });
      }
    }

    return {
      totalFare: itinerary.fare?.cents ? itinerary.fare.cents / 100 : 0,
      currency: itinerary.fare?.currency || 'USD',
      totalEmissions,
      breakdown,
    };
  }

  /**
   * Normalize OTP response to app-friendly format
   */
  private normalizeOTPResponse(otpData: any): TransitRouteResponse {
    if (!otpData.plan) {
      return {
        plan: {
          date: Date.now(),
          from: { name: '', lat: 0, lon: 0 },
          to: { name: '', lat: 0, lon: 0 },
          itineraries: [],
        },
        error: 'No plan found',
      };
    }

    const plan = otpData.plan;

    return {
      plan: {
        date: plan.date,
        from: {
          name: plan.from.name,
          lat: plan.from.lat,
          lon: plan.from.lon,
        },
        to: {
          name: plan.to.name,
          lat: plan.to.lat,
          lon: plan.to.lon,
        },
        itineraries: plan.itineraries.map((itin: any) => this.normalizeItinerary(itin)),
      },
    };
  }

  /**
   * Normalize a single itinerary
   */
  private normalizeItinerary(itin: any): TransitItinerary {
    const legs: TransitLeg[] = itin.legs.map((leg: any) => ({
      mode: leg.mode as TransitMode,
      routeShortName: leg.routeShortName,
      routeLongName: leg.routeLongName,
      headsign: leg.headsign,
      agencyName: leg.agencyName,
      startTime: leg.startTime,
      endTime: leg.endTime,
      duration: leg.duration,
      distance: leg.distance,
      from: {
        name: leg.from.name,
        lat: leg.from.lat,
        lon: leg.from.lon,
        stopId: leg.from.stopId,
        stopCode: leg.from.stopCode,
      },
      to: {
        name: leg.to.name,
        lat: leg.to.lat,
        lon: leg.to.lon,
        stopId: leg.to.stopId,
        stopCode: leg.to.stopCode,
      },
      realTime: leg.realTime || false,
      transitLeg: leg.transitLeg || false,
    }));

    return {
      duration: itin.duration,
      startTime: itin.startTime,
      endTime: itin.endTime,
      walkTime: itin.walkTime,
      transitTime: itin.transitTime,
      waitingTime: itin.waitingTime,
      walkDistance: itin.walkDistance,
      transfers: itin.transfers || 0,
      legs,
      fare: itin.fare ? {
        currency: itin.fare.currency,
        cents: itin.fare.cents,
        components: itin.fare.details?.regular,
      } : undefined,
    };
  }

  /**
   * Format date for OTP API (MM-DD-YYYY)
   */
  private formatDate(dateTime: string): string {
    const date = new Date(dateTime);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  }

  /**
   * Format time for OTP API (HH:MM am/pm)
   */
  private formatTime(dateTime: string): string {
    const date = new Date(dateTime);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    return `${hours}:${minutes}${ampm}`;
  }

  /**
   * Get all available transit modes from OTP
   */
  async getAvailableModes(): Promise<string[]> {
    try {
      const response = await fetch(`${this.otpBaseUrl}/metadata`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return ['BUS', 'TRAIN', 'SUBWAY', 'WALK'];
      }

      const data = await response.json();
      return data.modes || ['BUS', 'TRAIN', 'SUBWAY', 'WALK'];
    } catch (error) {
      console.error('Error fetching available modes:', error);
      return ['BUS', 'TRAIN', 'SUBWAY', 'WALK'];
    }
  }
}

// Export singleton instance
let transitService: TransitService | null = null;

export function getTransitService(): TransitService {
  if (!transitService) {
    transitService = new TransitService();
  }
  return transitService;
}
