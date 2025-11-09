/**
 * Common types for transit providers
 * This allows different transit APIs to be used interchangeably
 */

import { TransportMode, TransitDetails, Location } from '@/lib/types';

export type TransitRouteRequest = {
  origin: Location;
  destination: Location;
  departureTime?: Date;
  arrivalTime?: Date;
  modes?: TransportMode[];
  maxWalkDistance?: number; // meters
  maxTransfers?: number;
  wheelchair?: boolean;
};

export type TransitLeg = {
  mode: TransportMode;
  duration: number; // minutes
  distance: number; // kilometers
  carbonEmission: number;
  cost: number;
  transitDetails?: TransitDetails;
  instructions?: string;
  startTime?: Date;
  endTime?: Date;
};

export type TransitRoute = {
  id: string;
  provider: string;
  legs: TransitLeg[];
  totalDuration: number; // minutes
  totalDistance: number; // kilometers
  totalCost: number;
  totalCarbonFootprint: number;
  numberOfTransfers: number;
  walkingDistance: number; // kilometers
  sustainabilityScore?: number;
};

export interface ITransitProvider {
  /**
   * Provider name (e.g., "Google Maps", "GraphHopper", "OpenTripPlanner")
   */
  name: string;

  /**
   * Check if the provider is available/configured
   */
  isAvailable(): boolean;

  /**
   * Get transit routes from origin to destination
   */
  getRoutes(request: TransitRouteRequest): Promise<TransitRoute[]>;

  /**
   * Get provider-specific metadata
   */
  getMetadata?(): {
    coverage?: string[];
    features?: string[];
    realTimeSupport?: boolean;
  };
}

export type TransitProviderConfig = {
  enabled: boolean;
  priority: number; // Lower number = higher priority
  apiKey?: string;
  baseUrl?: string;
  options?: Record<string, any>;
};

export type TransitProvidersConfig = {
  googleMaps?: TransitProviderConfig;
  graphHopper?: TransitProviderConfig;
  openTripPlanner?: TransitProviderConfig;
  transitAPI?: TransitProviderConfig;
};
