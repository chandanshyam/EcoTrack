import { TransportMode, TransportSegment, RouteOption, ComparisonData } from '../types';

// Enhanced carbon emission factors database (kg CO2e per km)
export const CARBON_EMISSION_FACTORS = {
  [TransportMode.CAR]: {
    base: 0.21, // Average car
    variants: {
      petrol: 0.24,
      diesel: 0.27,
      hybrid: 0.12,
      electric: 0.05,
    }
  },
  [TransportMode.TRAIN]: {
    base: 0.041,
    variants: {
      highSpeed: 0.028,
      regional: 0.048,
      intercity: 0.035,
    }
  },
  [TransportMode.BUS]: {
    base: 0.089,
    variants: {
      city: 0.105,
      intercity: 0.078,
      electric: 0.032,
    }
  },
  [TransportMode.PLANE]: {
    base: 0.255,
    variants: {
      domestic: 0.285,
      shortHaul: 0.255,
      longHaul: 0.195,
    }
  },
  [TransportMode.BIKE]: {
    base: 0,
    variants: {
      manual: 0,
      electric: 0.022,
    }
  },
  [TransportMode.WALK]: {
    base: 0,
    variants: {}
  },
  [TransportMode.METRO]: {
    base: 0.028,
    variants: {
      electric: 0.028,
      diesel: 0.045,
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
   */
  static calculateSegmentEmissions(segment: TransportSegment): number {
    const emissionFactor = CARBON_EMISSION_FACTORS[segment.mode];
    if (!emissionFactor) {
      throw new Error(`Unknown transport mode: ${segment.mode}`);
    }
    
    // Use base emission factor for now, can be enhanced with variants later
    return segment.distance * emissionFactor.base;
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
      [TransportMode.WALK]: 100,
      [TransportMode.BIKE]: 95,
      [TransportMode.TRAIN]: 85,
      [TransportMode.METRO]: 80,
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
      [TransportMode.WALK]: 100,
      [TransportMode.BIKE]: 100,
      [TransportMode.TRAIN]: 70,  // Many trains use renewable energy
      [TransportMode.METRO]: 70,  // Many metro systems use renewable energy
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
      [TransportMode.WALK]: 100,
      [TransportMode.BIKE]: 95,
      [TransportMode.TRAIN]: 90,
      [TransportMode.METRO]: 90,
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
   */
  static getEmissionFactor(mode: TransportMode, variant?: string): number {
    const modeFactors = CARBON_EMISSION_FACTORS[mode];
    if (!modeFactors) {
      throw new Error(`Unknown transport mode: ${mode}`);
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
    const hasActiveTransport = route.transportModes.some(
      segment => segment.mode === TransportMode.WALK || segment.mode === TransportMode.BIKE
    );
    if (hasActiveTransport) {
      insights.push('Great for your health and the environment with active transport included!');
    }

    const hasPublicTransport = route.transportModes.some(
      segment => [TransportMode.TRAIN, TransportMode.BUS, TransportMode.METRO].includes(segment.mode)
    );
    if (hasPublicTransport) {
      insights.push('Using public transport helps reduce traffic congestion and air pollution.');
    }

    return insights;
  }
}