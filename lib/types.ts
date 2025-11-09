export enum TransportMode {
  CAR = 'car',
  TRAIN = 'train',
  BUS = 'bus',
  PLANE = 'plane',
}

export type TransitDetails = {
  // Line information
  lineName: string;
  lineShortName?: string;
  lineColor?: string;
  lineTextColor?: string;

  // Agency information
  agencyName?: string;
  agencyUrl?: string;
  agencyPhone?: string;

  // Stop information
  departureStop: {
    name: string;
    location?: { lat: number; lng: number };
  };
  arrivalStop: {
    name: string;
    location?: { lat: number; lng: number };
  };

  // Timing information
  departureTime?: Date;
  arrivalTime?: Date;
  departureTimeText?: string;
  arrivalTimeText?: string;

  // Trip information
  headsign?: string;  // e.g., "Downtown via Broadway"
  numStops: number;
  vehicleType: string;  // BUS, SUBWAY, TRAIN, TRAM, etc.
  vehicleIcon?: string;

  // Real-time information (if available)
  headway?: number;  // Time between departures in seconds
}

export type TransportSegment = {
  mode: TransportMode;
  duration: number; // minutes
  distance: number; // kilometers
  carbonEmission: number; // kg CO2e
  cost: number;
  provider?: string;

  // Enhanced transit data (only present for transit modes)
  transitDetails?: TransitDetails;

  // For walking/biking segments in multi-modal trips
  instructions?: string;
}

export type RouteOption = {
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