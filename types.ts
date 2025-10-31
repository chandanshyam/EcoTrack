
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
}

export interface RouteOption {
  id: string;
  name: string;
  transportModes: TransportSegment[];
  totalDuration: number; // minutes
  totalDistance: number; // kilometers
  totalCost: number;
  totalCarbonFootprint: number; // kg CO2e
  sustainabilityScore: number; // 0-100
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
