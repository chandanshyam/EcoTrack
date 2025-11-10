/**
 * Google Maps Transit Provider
 * Uses Google Maps Directions API for transit routing
 */

import { ITransitProvider, TransitRouteRequest, TransitRoute, TransitLeg } from '../types';
import { googleMapsService } from '@/lib/services/googleMapsService';
import { TransportMode } from '@/lib/types';

export class GoogleMapsTransitProvider implements ITransitProvider {
  name = 'Google Maps';

  isAvailable(): boolean {
    return !!(process.env.GOOGLE_MAPS_API_KEY);
  }

  async getRoutes(request: TransitRouteRequest): Promise<TransitRoute[]> {
    if (!this.isAvailable()) {
      console.warn('Google Maps API key not configured');
      return [];
    }

    try {
      // Use existing Google Maps service
      const modes = request.modes || [TransportMode.TRAIN, TransportMode.BUS];
      const routes = await googleMapsService.calculateRoutes(
        request.origin.address,
        request.destination.address,
        modes,
        request.departureTime?.toISOString()
      );

      // Convert to TransitRoute format
      return routes.map((route, index) => ({
        id: `gm-${route.id}`,
        provider: this.name,
        legs: route.transportModes.map(segment => ({
          mode: segment.mode,
          duration: segment.duration,
          distance: segment.distance,
          carbonEmission: segment.carbonEmission,
          cost: segment.cost,
          transitDetails: segment.transitDetails,
        })),
        totalDuration: route.totalDuration,
        totalDistance: route.totalDistance,
        totalCost: route.totalCost,
        totalCarbonFootprint: route.totalCarbonFootprint,
        numberOfTransfers: this.countTransfers(route.transportModes),
        walkingDistance: this.calculateWalkingDistance(route.transportModes),
        sustainabilityScore: route.sustainabilityScore,
      }));
    } catch (error) {
      console.error('Google Maps transit error:', error);
      return [];
    }
  }

  getMetadata() {
    return {
      coverage: ['global'],
      features: ['real-time', 'multi-modal', 'walking-directions'],
      realTimeSupport: true,
    };
  }

  private countTransfers(segments: any[]): number {
    let transfers = 0;
    let previousMode: TransportMode | null = null;

    for (const segment of segments) {
      if (segment.transitDetails && previousMode && previousMode !== segment.mode) {
        transfers++;
      }
      if (segment.transitDetails) {
        previousMode = segment.mode;
      }
    }

    return Math.max(0, transfers - 1);
  }

  private calculateWalkingDistance(segments: any[]): number {
    return segments
      .filter(s => !s.transitDetails && s.instructions?.toLowerCase().includes('walk'))
      .reduce((sum, s) => sum + s.distance, 0);
  }
}
