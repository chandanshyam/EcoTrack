import { TransportMode, TransportSegment, RouteOption, ComparisonData } from '../types';

/**
 * CARBON FOOTPRINT CALCULATION METHODOLOGY
 *
 * Per-Passenger Emissions:
 * All emission factors are calculated on a PER-PASSENGER basis unless explicitly noted.
 * This means the total vehicle/aircraft emissions are divided by the average number of passengers.
 *
 * Flight Emissions Calculation:
 * - Aircraft total emissions = fuel burn × emission factor
 * - Per-passenger emissions = (aircraft emissions) / (seats × load factor)
 * - Average commercial aircraft load factor: 82% (2023 global average)
 * - Business/First class: 2-3x economy footprint due to space usage (fewer passengers per aircraft)
 *
 * Example: A 1000km flight
 * - Aircraft burns ~3,000 kg of fuel
 * - Total emissions: ~9,450 kg CO2e
 * - Aircraft capacity: 180 seats
 * - Load factor: 82% = 148 passengers
 * - Per-passenger (economy): 9,450 / 148 = 63.9 kg CO2e = 0.064 kg CO2e/km ≈ base factor
 *
 * Distance-Based Flight Factors:
 * - Short flights (<500km): Higher per-km emissions due to fuel-intensive takeoff/landing
 * - Medium flights (500-1500km): Standard emissions
 * - Long flights (>1500km): Lower per-km emissions (more efficient cruising time)
 *
 * Public Transport Emissions:
 * - Train/Bus/Metro: Total vehicle emissions divided by average passenger count
 * - Accounts for typical occupancy rates during operation
 * - Electric trains: Includes upstream electricity generation emissions
 *
 * Car Emissions:
 * - Per-vehicle emissions (not per-passenger)
 * - For carpooling, divide by actual passenger count
 */

// Enhanced carbon emission factors database (kg CO2e per km)
// All factors are PER PASSENGER unless otherwise noted
export const CARBON_EMISSION_FACTORS = {
  [TransportMode.CAR]: {
    // Per vehicle (divide by passenger count for per-passenger)
    base: 0.21, // Average car
    variants: {
      petrol: 0.24,
      diesel: 0.27,
      hybrid: 0.12,
      electric: 0.05,
    }
  },
  [TransportMode.TRAIN]: {
    // Per passenger (calculated from total train emissions / average passengers)
    base: 0.041,
    variants: {
      highSpeed: 0.028,
      regional: 0.048,
      intercity: 0.035,
    }
  },
  [TransportMode.BUS]: {
    // Per passenger (calculated from total bus emissions / average passengers)
    base: 0.089,
    variants: {
      city: 0.105,
      intercity: 0.078,
      electric: 0.032,
    }
  },
  [TransportMode.PLANE]: {
    // Per-passenger emissions accounting for average aircraft load factor (82%)
    // These factors include takeoff, landing, and cruising emissions divided by passenger count
    // Note: Business/First class passengers have 2-3x higher footprint due to space usage
    base: 0.255, // Average per passenger (economy class)
    variants: {
      domestic: 0.285,      // Short flights: Higher per-km emissions due to takeoff/landing
      shortHaul: 0.255,     // <1500km: Standard per-passenger economy
      longHaul: 0.195,      // >1500km: More efficient per-km, economy class
      businessClass: 0.510, // 2x economy due to space (fewer seats per aircraft)
      firstClass: 0.765,    // 3x economy due to space
    }
  }
} as const;

// Sustainability scoring weights
const SUSTAINABILITY_WEIGHTS = {
  carbonFootprint: 0.6,    // 60% weight for carbon emissions
  efficiency: 0.2,         // 20% weight for energy efficiency
  renewableEnergy: 0.1,    // 10% weight for renewable energy use
  congestionReduction: 0.1 // 10% weight for reducing traffic congestion
} as const;

// Reference values for conventional travel (car-based)
const CONVENTIONAL_TRAVEL_REFERENCE = {
  carbonPerKm: CARBON_EMISSION_FACTORS[TransportMode.CAR].base,
  method: 'Private Car (Petrol)'
} as const;

/**
 * Carbon Footprint Calculation Service
 * Handles all carbon emission calculations and sustainability scoring
 */
export class CarbonCalculationService {
  
  /**
   * Calculate carbon emissions for a single transport segment
   * Automatically selects appropriate emission factors based on transport mode and distance
   */
  static calculateSegmentEmissions(segment: TransportSegment): number {
    const emissionFactor = CARBON_EMISSION_FACTORS[segment.mode];
    if (!emissionFactor) {
      throw new Error(`Unknown transport mode: ${segment.mode}`);
    }

    // Use intelligent factor selection (auto-selects flight type based on distance)
    const factor = this.getEmissionFactor(segment.mode, undefined, segment.distance);
    return segment.distance * factor;
  }

  /**
   * Calculate total carbon footprint for a complete route
   */
  static calculateRouteCarbonFootprint(segments: TransportSegment[]): number {
    return segments.reduce((total, segment) => {
      return total + this.calculateSegmentEmissions(segment);
    }, 0);
  }

  /**
   * Calculate sustainability score (0-100 scale)
   * Higher score = more sustainable
   */
  static calculateSustainabilityScore(
    carbonFootprint: number,
    totalDistance: number,
    segments: TransportSegment[]
  ): number {
    // Calculate carbon efficiency (lower is better)
    const carbonPerKm = totalDistance > 0 ? carbonFootprint / totalDistance : 0;
    const conventionalCarbon = totalDistance * CONVENTIONAL_TRAVEL_REFERENCE.carbonPerKm;
    
    // Carbon score: 100 for zero emissions, decreasing as emissions increase
    const carbonScore = Math.max(0, 100 - (carbonPerKm / CONVENTIONAL_TRAVEL_REFERENCE.carbonPerKm) * 100);
    
    // Efficiency bonus for public transport and active modes
    const efficiencyScore = this.calculateEfficiencyScore(segments);
    
    // Renewable energy bonus for electric modes
    const renewableScore = this.calculateRenewableEnergyScore(segments);
    
    // Congestion reduction bonus for shared/public transport
    const congestionScore = this.calculateCongestionReductionScore(segments);
    
    // Weighted final score
    const finalScore = 
      carbonScore * SUSTAINABILITY_WEIGHTS.carbonFootprint +
      efficiencyScore * SUSTAINABILITY_WEIGHTS.efficiency +
      renewableScore * SUSTAINABILITY_WEIGHTS.renewableEnergy +
      congestionScore * SUSTAINABILITY_WEIGHTS.congestionReduction;
    
    return Math.round(Math.min(100, Math.max(0, finalScore)));
  }

  /**
   * Calculate efficiency score based on transport modes used
   */
  private static calculateEfficiencyScore(segments: TransportSegment[]): number {
    const modeEfficiencyScores = {
      [TransportMode.TRAIN]: 85,
      [TransportMode.BUS]: 70,
      [TransportMode.CAR]: 40,
      [TransportMode.PLANE]: 20,
    };

    if (segments.length === 0) return 0;

    const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0);
    if (totalDistance === 0) return 0;

    // Weight efficiency scores by distance
    const weightedScore = segments.reduce((sum, segment) => {
      const modeScore = modeEfficiencyScores[segment.mode] || 0;
      return sum + (modeScore * segment.distance);
    }, 0);

    return weightedScore / totalDistance;
  }

  /**
   * Calculate renewable energy score
   */
  private static calculateRenewableEnergyScore(segments: TransportSegment[]): number {
    const renewableScores = {
      [TransportMode.TRAIN]: 70,  // Many trains use renewable energy
      [TransportMode.BUS]: 30,    // Some electric buses
      [TransportMode.CAR]: 20,    // Some electric cars
      [TransportMode.PLANE]: 5,   // Very limited renewable energy use
    };

    if (segments.length === 0) return 0;

    const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0);
    if (totalDistance === 0) return 0;

    const weightedScore = segments.reduce((sum, segment) => {
      const modeScore = renewableScores[segment.mode] || 0;
      return sum + (modeScore * segment.distance);
    }, 0);

    return weightedScore / totalDistance;
  }

  /**
   * Calculate congestion reduction score
   */
  private static calculateCongestionReductionScore(segments: TransportSegment[]): number {
    const congestionScores = {
      [TransportMode.TRAIN]: 90,
      [TransportMode.BUS]: 80,
      [TransportMode.CAR]: 10,   // Private cars contribute to congestion
      [TransportMode.PLANE]: 50, // Neutral for road congestion
    };

    if (segments.length === 0) return 0;

    const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0);
    if (totalDistance === 0) return 0;

    const weightedScore = segments.reduce((sum, segment) => {
      const modeScore = congestionScores[segment.mode] || 0;
      return sum + (modeScore * segment.distance);
    }, 0);

    return weightedScore / totalDistance;
  }

  /**
   * Compare route against conventional travel options
   */
  static compareWithConventionalTravel(
    route: RouteOption
  ): ComparisonData {
    const conventionalFootprint = route.totalDistance * CONVENTIONAL_TRAVEL_REFERENCE.carbonPerKm;
    const actualFootprint = route.totalCarbonFootprint;
    const savings = conventionalFootprint - actualFootprint;
    const savingsPercentage = conventionalFootprint > 0 
      ? Math.round((savings / conventionalFootprint) * 100) 
      : 0;

    let savingsText: string;
    if (savings > 0) {
      savingsText = `${savings.toFixed(2)} kg CO2e saved`;
    } else if (savings < 0) {
      savingsText = `${Math.abs(savings).toFixed(2)} kg CO2e additional emissions`;
    } else {
      savingsText = 'No difference in emissions';
    }

    return {
      conventionalMethod: CONVENTIONAL_TRAVEL_REFERENCE.method,
      conventionalFootprint,
      savings: savingsText,
      savingsPercentage
    };
  }

  /**
   * Process and enhance route options with carbon calculations
   */
  static processRouteOptions(routes: Partial<RouteOption>[]): RouteOption[] {
    return routes.map((route, index) => {
      // Ensure we have transport segments
      const segments = route.transportModes || [];
      
      // Calculate carbon footprint
      const totalCarbonFootprint = this.calculateRouteCarbonFootprint(segments);
      
      // Update segments with individual carbon emissions
      const enhancedSegments = segments.map(segment => ({
        ...segment,
        carbonEmission: this.calculateSegmentEmissions(segment)
      }));

      // Calculate sustainability score
      const sustainabilityScore = this.calculateSustainabilityScore(
        totalCarbonFootprint,
        route.totalDistance || 0,
        enhancedSegments
      );

      return {
        id: route.id || `route-${index}`,
        name: route.name || `Route ${index + 1}`,
        origin: route.origin!,
        destination: route.destination!,
        transportModes: enhancedSegments,
        totalDuration: route.totalDuration || 0,
        totalDistance: route.totalDistance || 0,
        totalCost: route.totalCost || 0,
        totalCarbonFootprint,
        sustainabilityScore
      };
    });
  }

  /**
   * Get emission factor for a specific transport mode
   * For flights, automatically selects variant based on distance if not specified
   */
  static getEmissionFactor(mode: TransportMode, variant?: string, distance?: number): number {
    const modeFactors = CARBON_EMISSION_FACTORS[mode];
    if (!modeFactors) {
      throw new Error(`Unknown transport mode: ${mode}`);
    }

    // Auto-select flight variant based on distance if not specified
    if (mode === TransportMode.PLANE && !variant && distance) {
      if (distance < 500) {
        variant = 'domestic'; // Short domestic flights
      } else if (distance < 1500) {
        variant = 'shortHaul'; // Regional flights
      } else {
        variant = 'longHaul'; // Intercontinental flights
      }
    }

    if (variant && modeFactors.variants && variant in modeFactors.variants) {
      return (modeFactors.variants as any)[variant];
    }

    return modeFactors.base;
  }

  /**
   * Get sustainability insights for a route
   */
  static getSustainabilityInsights(route: RouteOption): string[] {
    const insights: string[] = [];
    const comparison = this.compareWithConventionalTravel(route);

    // Carbon footprint insights
    if (comparison.savingsPercentage > 50) {
      insights.push(`Excellent choice! This route reduces emissions by ${comparison.savingsPercentage}% compared to driving.`);
    } else if (comparison.savingsPercentage > 20) {
      insights.push(`Good environmental choice with ${comparison.savingsPercentage}% lower emissions than driving.`);
    } else if (comparison.savingsPercentage > 0) {
      insights.push(`Slightly better for the environment with ${comparison.savingsPercentage}% lower emissions.`);
    } else if (comparison.savingsPercentage < 0) {
      insights.push(`This route has higher emissions than driving. Consider alternative transport modes.`);
    }

    // Mode-specific insights
    const hasPublicTransport = route.transportModes.some(
      segment => [TransportMode.TRAIN, TransportMode.BUS].includes(segment.mode)
    );
    if (hasPublicTransport) {
      insights.push('Using public transport helps reduce traffic congestion and air pollution.');
    }

    return insights;
  }
}