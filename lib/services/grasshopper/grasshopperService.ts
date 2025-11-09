/**
 * GraphHopper API Service
 * Handles routing via GraphHopper Routing API
 * API Documentation: https://docs.graphhopper.com/
 */

import dotenv from 'dotenv';
import path from 'path';
import { GrasshopperSearchParams, GrasshopperRoute, GraphHopperAPIResponse } from './grasshopperTypes';

// Explicitly load .env.local with override to replace cached values
dotenv.config({
  path: path.resolve(process.cwd(), '.env.local'),
  override: true
});

export class GrasshopperService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    // Remove trailing slash if present
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Fetch routes from GraphHopper API
   * @param params Search parameters including origin, destination, and routing options
   * @returns Array of routes with distance, duration, and optional instructions
   */
  async getRoutes(params: GrasshopperSearchParams): Promise<GrasshopperRoute[]> {
    try {
      // GraphHopper uses the "point" parameter for each waypoint
      // Format: point=lat,lng
      const queryParams = new URLSearchParams();

      // Add origin and destination as points
      queryParams.append('point', `${params.origin.lat},${params.origin.lng}`);
      queryParams.append('point', `${params.destination.lat},${params.destination.lng}`);

      // Add profile (car, bike, foot, etc.)
      queryParams.append('profile', params.profile || 'car');

      // Add locale if specified
      if (params.locale) {
        queryParams.append('locale', params.locale);
      }

      // Add calc_points (default true to get polyline)
      queryParams.append('calc_points', String(params.calcPoints !== false));

      // Add point hints if specified
      if (params.pointHints && params.pointHints.length > 0) {
        params.pointHints.forEach(hint => queryParams.append('point_hint', hint));
      }

      // Add snap preventions if specified
      if (params.snapPreventions && params.snapPreventions.length > 0) {
        params.snapPreventions.forEach(prevention =>
          queryParams.append('snap_prevention', prevention)
        );
      }

      // Add details if specified
      if (params.details && params.details.length > 0) {
        params.details.forEach(detail => queryParams.append('details', detail));
      }

      // Add API key
      queryParams.append('key', this.apiKey);

      const url = `${this.baseUrl}?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GraphHopper API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: GraphHopperAPIResponse = await response.json();
      return this.parseRoutes(data, params.profile || 'car');
    } catch (err: any) {
      console.error('GraphHopper API error:', err.message);
      throw new Error(`Failed to fetch routes from Grasshopper API: ${err.message}`);
    }
  }

  /**
   * Parse GraphHopper API response into standardized route format
   */
  private parseRoutes(data: GraphHopperAPIResponse, profile: string): GrasshopperRoute[] {
    if (!data.paths || data.paths.length === 0) {
      return [];
    }

    return data.paths.map((path, index) => ({
      id: `route_${Date.now()}_${index}`,
      profile: profile,
      distanceMeters: path.distance,
      durationMs: path.time,
      distanceKm: path.distance / 1000,
      durationMinutes: path.time / 1000 / 60,
      polyline: path.points,
      instructions: path.instructions,
      bbox: path.bbox,
    }));
  }

  /**
   * Get multiple route profiles in parallel (car, bike, foot)
   */
  async getMultipleProfiles(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    profiles: string[] = ['car', 'bike', 'foot']
  ): Promise<Record<string, GrasshopperRoute[]>> {
    const results: Record<string, GrasshopperRoute[]> = {};

    await Promise.all(
      profiles.map(async (profile) => {
        try {
          const routes = await this.getRoutes({
            origin,
            destination,
            profile,
            calcPoints: true,
          });
          results[profile] = routes;
        } catch (error) {
          console.error(`Failed to fetch routes for profile ${profile}:`, error);
          results[profile] = [];
        }
      })
    );

    return results;
  }
}

// Export singleton instance getter
let grasshopperService: GrasshopperService | null = null;

export function getGrasshopperService(): GrasshopperService {
  if (!grasshopperService) {
    const apiKey = process.env.GRASSHOPPER_API_KEY || '';
    const baseUrl = process.env.GRASSHOPPER_BASE_URL || '';

    if (!apiKey || !baseUrl) {
      throw new Error('GRASSHOPPER_API_KEY and GRASSHOPPER_BASE_URL must be configured in environment variables');
    }

    grasshopperService = new GrasshopperService(apiKey, baseUrl);
  }

  return grasshopperService;
}
