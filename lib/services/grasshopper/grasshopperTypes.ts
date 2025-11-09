/**
 * GraphHopper API Type Definitions
 * These types define the structure of data from the GraphHopper Routing API
 * API Documentation: https://docs.graphhopper.com/
 */

export type GeoLocation = {
  lat: number;
  lng: number;
};

// GraphHopper API Response Types
export type GraphHopperInstruction = {
  distance: number;
  heading?: number;
  sign: number;
  interval: number[];
  text: string;
  time: number;
  street_name?: string;
};

export type GraphHopperPoint = {
  type: string;
  coordinates: number[]; // [lng, lat]
};

export type GraphHopperPath = {
  distance: number; // in meters
  weight: number;
  time: number; // in milliseconds
  transfers?: number;
  points_encoded?: boolean;
  bbox?: number[];
  points: GraphHopperPoint | string; // Can be encoded polyline or GeoJSON
  instructions?: GraphHopperInstruction[];
  legs?: any[];
  details?: Record<string, any[]>;
  ascend?: number;
  descend?: number;
  snapped_waypoints?: GraphHopperPoint;
};

export type GraphHopperAPIResponse = {
  hints?: Record<string, any>;
  info?: {
    copyrights: string[];
    took: number;
  };
  paths: GraphHopperPath[];
};

// Our internal route representation
export type GrasshopperRoute = {
  id: string;
  profile: string; // car, bike, foot, etc.
  distanceMeters: number;
  durationMs: number;
  distanceKm: number;
  durationMinutes: number;
  polyline: string | GraphHopperPoint;
  instructions?: GraphHopperInstruction[];
  bbox?: number[];
};

export type GrasshopperSearchParams = {
  origin: GeoLocation;
  destination: GeoLocation;
  profile?: string; // car, bike, foot, etc. Default: car
  locale?: string; // en, de, etc.
  calcPoints?: boolean;
  pointHints?: string[];
  snapPreventions?: string[];
  details?: string[];
};

export type GrasshopperPrice = {
  amount: number;
  currency: string;
};

export type GrasshopperEmission = {
  co2_per_passenger?: number;
  calculation_method?: string;
};
