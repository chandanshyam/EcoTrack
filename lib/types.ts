export enum TransportMode {
  CAR = 'car',
  TRAIN = 'train',
  BUS = 'bus',
  PLANE = 'plane',
  BIKE = 'bike',
  WALK = 'walk',
  METRO = 'metro',
}

export interface TransportSegment {
  mode: TransportMode;
  duration: number; // minutes
  distance: number; // kilometers
  carbonEmission: number; // kg CO2e
  cost: number;
  provider?: string;
}

export interface RouteOption {
  id: string;
  name: string;
  origin: Location;
  destination: Location;
  transportModes: TransportSegment[];
  totalDuration: number; // minutes
  totalDistance: number; // kilometers
  totalCost: number;
  totalCarbonFootprint: number; // kg CO2e
  sustainabilityScore: number; // 0-100
}

export interface Location {
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface SustainabilityAnalysis {
  summary: string;
  tips: string[];
  comparison: {
    conventionalMethod: string;
    conventionalFootprint: number;
    savings: string;
  };
}

export interface User {
  id: string;
  email: string;
  name?: string;
  preferences: UserPreferences;
  createdAt: Date;
}

export interface UserPreferences {
  prioritizeSustainability: boolean;
  maxTravelTime?: number;
  budgetLimit?: number;
  preferredTransportModes: TransportMode[];
}

export interface CompletedTrip {
  id: string;
  userId: string;
  route: RouteOption;
  completedAt: Date;
  carbonFootprint: number;
  carbonSaved: number;
}

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
}

// API Request/Response types
export interface RoutePlanRequest {
  origin: string;
  destination: string;
  travelDate?: string;
  preferences?: {
    prioritizeSustainability: boolean;
    maxTravelTime?: number;
    budgetLimit?: number;
  };
}

export interface RoutePlanResponse {
  routes: RouteOption[];
  sustainabilityInsights: string;
  conventionalComparison: ComparisonData;
}

export interface SustainabilityAnalysisRequest {
  routes: GoogleMapsRoute[];
  travelDate: string;
}

export interface SustainabilityAnalysisResponse {
  analysis: RouteAnalysis[];
  aiInsights: string;
  recommendations: string[];
}

export interface TravelHistoryRequest {
  userId: string;
  dateRange?: { start: Date; end: Date };
}

export interface TravelHistoryResponse {
  trips: CompletedTrip[];
  cumulativeImpact: EnvironmentalMetrics;
  trends: TrendData[];
}

// Supporting types
export interface ComparisonData {
  conventionalMethod: string;
  conventionalFootprint: number;
  savings: string;
  savingsPercentage: number;
}

export interface RouteAnalysis {
  routeId: string;
  sustainabilityScore: number;
  carbonFootprint: number;
  insights: string[];
  recommendations: string[];
}

export interface EnvironmentalMetrics {
  totalCarbonFootprint: number;
  totalCarbonSaved: number;
  totalTrips: number;
  averageSustainabilityScore: number;
}

export interface TrendData {
  period: string;
  carbonFootprint: number;
  carbonSaved: number;
  sustainabilityScore: number;
}

// Google Maps API types (simplified)
export interface GoogleMapsRoute {
  legs: GoogleMapsLeg[];
  overview_polyline: {
    points: string;
  };
  summary: string;
  warnings: string[];
}

export interface GoogleMapsLeg {
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
}