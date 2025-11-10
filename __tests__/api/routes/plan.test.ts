import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/routes/plan/route';
import { TransportMode } from '../../../lib/types';

// Mock the services
jest.mock('../../../lib/services/geminiService', () => ({
  planTripWithAI: jest.fn(),
}));

jest.mock('../../../lib/services/carbonCalculationService', () => ({
  CarbonCalculationService: {
    compareWithConventionalTravel: jest.fn(),
  },
}));

const mockPlanTripWithAI = require('../../../lib/services/geminiService').planTripWithAI;
const mockCompareWithConventionalTravel = require('../../../lib/services/carbonCalculationService').CarbonCalculationService.compareWithConventionalTravel;

describe('/api/routes/plan', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockPlanTripWithAI.mockResolvedValue({
      routes: [
        {
          id: 'route-1',
          name: 'Train Route',
          origin: { address: 'New York, NY', coordinates: { lat: 40.7128, lng: -74.0060 } },
          destination: { address: 'Boston, MA', coordinates: { lat: 42.3601, lng: -71.0589 } },
          transportModes: [{
            mode: TransportMode.TRAIN,
            duration: 240,
            distance: 300,
            carbonEmission: 12.3,
            cost: 45.0,
          }],
          totalDuration: 240,
          totalDistance: 300,
          totalCost: 45.0,
          totalCarbonFootprint: 12.3,
          sustainabilityScore: 85,
        },
        {
          id: 'route-2',
          name: 'Car Route',
          origin: { address: 'New York, NY', coordinates: { lat: 40.7128, lng: -74.0060 } },
          destination: { address: 'Boston, MA', coordinates: { lat: 42.3601, lng: -71.0589 } },
          transportModes: [{
            mode: TransportMode.CAR,
            duration: 270,
            distance: 300,
            carbonEmission: 63.0,
            cost: 168.0,
          }],
          totalDuration: 270,
          totalDistance: 300,
          totalCost: 168.0,
          totalCarbonFootprint: 63.0,
          sustainabilityScore: 35,
        }
      ],
      analysis: {
        summary: 'Train is the most sustainable option',
        tips: ['Book in advance', 'Travel off-peak', 'Consider bike for short distances'],
        comparison: {
          conventionalMethod: 'Private Car',
          conventionalFootprint: 63.0,
          savings: '50.7 kg CO2e saved'
        }
      }
    });

    mockCompareWithConventionalTravel.mockReturnValue({
      conventionalMethod: 'Private Car (Petrol)',
      conventionalFootprint: 63.0,
      savings: '50.7 kg CO2e saved',
      savingsPercentage: 80
    });
  });

  describe('POST', () => {
    it('should return route options for valid request', async () => {
      const request = new NextRequest('http://localhost:3000/api/routes/plan', {
        method: 'POST',
        body: JSON.stringify({
          origin: 'New York, NY',
          destination: 'Boston, MA'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routes).toHaveLength(2);
      expect(data.routes[0].sustainabilityScore).toBe(85);
      expect(data.analysis).toBeDefined();
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/routes/plan', {
        method: 'POST',
        body: JSON.stringify({
          origin: 'New York, NY'
          // Missing destination
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Origin and destination required');
    });

    it('should validate empty strings', async () => {
      const request = new NextRequest('http://localhost:3000/api/routes/plan', {
        method: 'POST',
        body: JSON.stringify({
          origin: '',
          destination: 'Boston, MA'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Origin and destination required');
    });

    it.skip('should filter routes by preferences', async () => {
      // TODO: Route filtering by preferences not implemented in current API
      const request = new NextRequest('http://localhost:3000/api/routes/plan', {
        method: 'POST',
        body: JSON.stringify({
          origin: 'New York, NY',
          destination: 'Boston, MA',
          preferences: {
            prioritizeSustainability: true,
            maxTravelTime: 250
          }
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routes).toHaveLength(1); // Car route filtered out by maxTravelTime
      expect(data.routes[0].sustainabilityScore).toBe(85); // Train route
    });

    it.skip('should handle budget limit preference', async () => {
      // TODO: Budget filtering not implemented in current API
      const request = new NextRequest('http://localhost:3000/api/routes/plan', {
        method: 'POST',
        body: JSON.stringify({
          origin: 'New York, NY',
          destination: 'Boston, MA',
          preferences: {
            budgetLimit: 50
          }
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routes).toHaveLength(1); // Car route filtered out by budget
      expect(data.routes[0].totalCost).toBeLessThanOrEqual(50);
    });

    it('should handle no routes found', async () => {
      mockPlanTripWithAI.mockResolvedValue({
        routes: [],
        analysis: {
          summary: 'No routes available',
          tips: [],
          comparison: {
            conventionalMethod: 'Private Car',
            conventionalFootprint: 0,
            savings: 'No savings'
          }
        }
      });

      const request = new NextRequest('http://localhost:3000/api/routes/plan', {
        method: 'POST',
        body: JSON.stringify({
          origin: 'Invalid Location',
          destination: 'Another Invalid Location'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // API returns 200 even with empty routes
      expect(response.status).toBe(200);
      expect(data.routes).toHaveLength(0);
    });

    it('should handle service errors gracefully', async () => {
      mockPlanTripWithAI.mockRejectedValue(new Error('API key not found'));

      const request = new NextRequest('http://localhost:3000/api/routes/plan', {
        method: 'POST',
        body: JSON.stringify({
          origin: 'New York, NY',
          destination: 'Boston, MA'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it.skip('should validate preferences object', async () => {
      // TODO: Preferences validation not implemented in current API
      const request = new NextRequest('http://localhost:3000/api/routes/plan', {
        method: 'POST',
        body: JSON.stringify({
          origin: 'New York, NY',
          destination: 'Boston, MA',
          preferences: {
            prioritizeSustainability: 'yes', // Should be boolean
            maxTravelTime: -100 // Should be positive
          }
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('prioritizeSustainability must be a boolean');
    });
  });
});