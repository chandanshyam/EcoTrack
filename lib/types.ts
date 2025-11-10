export enum TransportMode {
  CAR = 'car',
  TRAIN = 'train',
  BUS = 'bus',
  PLANE = 'plane',
}

export type TransitStop = {
  name: string;
  arrivalTime?: string;
  departureTime?: string;
}

export type TransitDetails = {
  line: string; // Transit line name (e.g., "Blue Line", "Route 12")
  vehicleType: string; // e.g., "BUS", "SUBWAY", "RAIL", "TRAIN"
  departureStop: TransitStop;
  arrivalStop: TransitStop;
  numStops: number; // Number of stops between departure and arrival
  agencyName?: string; // Transit agency name
  fare?: {
    value: number; // Fare amount
    currency: string; // Currency code (e.g., "USD")
    text: string; // Formatted fare text (e.g., "$2.75")
  };
}

export type TransportSegment = {
  mode: TransportMode;
  duration: number; // minutes
  distance: number; // miles
  carbonEmission: number; // kg CO2e
  cost: number;
  provider?: string;
  transitDetails?: TransitDetails; // Only populated for transit modes (train, bus)
}

export type RouteOption = {
  id: string;
  name: string;
  origin: Location;
  destination: Location;
  transportModes: TransportSegment[];
  totalDuration: number; // minutes
  totalDistance: number; // miles
  totalCost: number;
  totalCarbonFootprint: number; // kg CO2e
  sustainabilityScore: number; // 0-100
  polyline?: string; // Encoded polyline from Google Maps API
}

export type Location = {
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export type SustainabilityAnalysis = {
  summary: string;
  comparison: {
    conventionalMethod: string;
    conventionalFootprint: number;
    savings: string;
  };
}

export type User = {
  id: string;
  email: string;
  name?: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt?: Date;
}

export type UserPreferences = {
  prioritizeSustainability: boolean;
  maxTravelTime?: number;
  budgetLimit?: number;
  preferredTransportModes: TransportMode[];
}

export type CompletedTrip = {
  id: string;
  userId: string;
  route: RouteOption;
  completedAt: Date;
  carbonFootprint: number;
  carbonSaved: number;
}

export type GeolocationCoords = {
  latitude: number;
  longitude: number;
}

// API Request/Response types
export type RoutePlanRequest = {
  origin: string;
  destination: string;
  travelDate?: string;
  preferences?: {
    prioritizeSustainability: boolean;
    maxTravelTime?: number;
    budgetLimit?: number;
  };
}

export type RoutePlanResponse = {
  routes: RouteOption[];
  sustainabilityInsights: string;
  conventionalComparison: ComparisonData;
}

export type SustainabilityAnalysisRequest = {
  routes: GoogleMapsRoute[];
  travelDate: string;
}

export type SustainabilityAnalysisResponse = {
  analysis: RouteAnalysis[];
  aiInsights: string;
  recommendations: string[];
}

export type TravelHistoryRequest = {
  userId: string;
  dateRange?: { start: Date; end: Date };
}

export type TravelHistoryResponse = {
  trips: CompletedTrip[];
  cumulativeImpact: EnvironmentalMetrics;
  trends: TrendData[];
}

// Supporting types
export type ComparisonData = {
  conventionalMethod: string;
  conventionalFootprint: number;
  savings: string;
  savingsPercentage: number;
}

export type RouteAnalysis = {
  routeId: string;
  sustainabilityScore: number;
  carbonFootprint: number;
  insights: string[];
  recommendations: string[];
}

export type EnvironmentalMetrics = {
  totalCarbonFootprint: number;
  totalCarbonSaved: number;
  totalTrips: number;
  averageSustainabilityScore: number;
}

export type TrendData = {
  period: string;
  carbonFootprint: number;
  carbonSaved: number;
  sustainabilityScore: number;
}

// Google Maps API types (simplified)
export type GoogleMapsRoute = {
  legs: GoogleMapsLeg[];
  overview_polyline: {
    points: string;
  };
  summary: string;
  warnings: string[];
}

export type GoogleMapsLeg = {
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