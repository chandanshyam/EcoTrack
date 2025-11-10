import { NextRequest } from 'next/server';
import { POST, GET } from '../../../app/api/sustainability/analyze/route';

// Mock the services
jest.mock('../../../lib/services/geminiService', () => ({
  generateRouteRecommendations: jest.fn(),
  analyzeSustainability: jest.fn(),
}));

jest.mock('../../../lib/services/carbonCalculationService', () => ({
  CarbonCalculationService: {
    calculateSegmentEmissions: jest.fn(),
    calculateSustainabilityScore: jest.fn(),
    getSustainabilityInsights: jest.fn(),
  },
}));

const mockGenerateRouteRecommendations = require('../../../lib/services/geminiService').generateRouteRecommendations;
const mockAnalyzeSustainability = require('../../../lib/services/geminiService').analyzeSustainability;
const mockCarbonCalculationService = require('../../../lib/services/carbonCalculationService').CarbonCalculationService;

describe('/api/sustainability/analyze', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockCarbonCalculationService.calculateSegmentEmissions.mockReturnValue(12.3);
    mockCarbonCalculationService.calculateSustainabilityScore.mockReturnValue(85);
    mockCarbonCalculationService.getSustainabilityInsights.mockReturnValue([
      'Excellent choice! This route reduces emissions by 80% compared to driving.',
      'Using public transport helps reduce traffic congestion and air pollution.'
    ]);

    mockGenerateRouteRecommendations.mockResolvedValue([
      {
        routeId: 'route-0',
        sustainabilityScore: 85,
        carbonFootprint: 12.3,
        insights: [
          'Train travel is highly efficient for medium distances',
          'This route has excellent sustainability credentials',
          'Consider booking in advance for better prices'
        ],
        recommendations: [
          'Travel during off-peak hours for lower emissions',
          'Combine with walking or cycling for first/last mile',
          'Book tickets in advance to secure lower fares'
        ]
      }
    ]);

    mockAnalyzeSustainability.mockResolvedValue({
      summary: 'This route offers excellent sustainability with low carbon emissions and high efficiency.',
      tips: [
        'Book tickets in advance for better prices',
        'Travel during off-peak hours',
        'Consider combining with active transport'
      ],
      comparison: {
        conventionalMethod: 'standard gasoline car',
        conventionalFootprint: 63.0,
        savings: 'By choosing this route, you save 50.7 kg CO2e compared to driving'
      }
    });
  });

  describe('POST', () => {
    const validRequestBody = {
      routes: [
        {
          legs: [
            {
              distance: { value: 300000 }, // 300km in meters
              duration: { value: 14400 }   // 4 hours in seconds
            }
          ]
        }
      ],
      travelDate: '2024-01-15'
    };

    it('should analyze sustainability for valid routes', async () => {
      const request = new NextRequest('http://localhost:3000/api/sustainability/analyze', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analysis).toHaveLength(1);
      expect(data.analysis[0].routeId).toBe('route-0');
      expect(data.analysis[0].sustainabilityScore).toBe(85);
      expect(data.analysis[0].insights).toHaveLength(3);
      expect(data.analysis[0].recommendations).toHaveLength(3);
      expect(data.aiInsights).toBeDefined();
      expect(Array.isArray(data.recommendations)).toBe(true);
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/sustainability/analyze', {
        method: 'POST',
        body: JSON.stringify({
          routes: [
            {
              legs: [
                {
                  distance: { value: 300000 },
                  duration: { value: 14400 }
                }
              ]
            }
          ],
          // Missing travelDate
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Travel date is required');
    });

    it('should validate routes array', async () => {
      const request = new NextRequest('http://localhost:3000/api/sustainability/analyze', {
        method: 'POST',
        body: JSON.stringify({
          routes: [], // Empty array
          travelDate: '2024-01-15'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Routes array is required and must contain at least one route');
    });

    it('should validate route structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/sustainability/analyze', {
        method: 'POST',
        body: JSON.stringify({
          routes: [
            {
              // Missing legs array
            }
          ],
          travelDate: '2024-01-15'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Route 0 must have a legs array');
    });

    it('should handle multiple routes', async () => {
      const multiRouteRequest = {
        routes: [
          {
            legs: [
              {
                distance: { value: 300000 },
                duration: { value: 14400 }
              }
            ]
          },
          {
            legs: [
              {
                distance: { value: 300000 },
                duration: { value: 16200 }
              }
            ]
          }
        ],
        travelDate: '2024-01-15'
      };

      mockGenerateRouteRecommendations.mockResolvedValue([
        {
          routeId: 'route-0',
          sustainabilityScore: 85,
          carbonFootprint: 12.3,
          insights: ['Train route insights'],
          recommendations: ['Train recommendations']
        },
        {
          routeId: 'route-1',
          sustainabilityScore: 35,
          carbonFootprint: 63.0,
          insights: ['Car route insights'],
          recommendations: ['Car recommendations']
        }
      ]);

      const request = new NextRequest('http://localhost:3000/api/sustainability/analyze', {
        method: 'POST',
        body: JSON.stringify(multiRouteRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analysis).toHaveLength(2);
      expect(data.analysis[0].sustainabilityScore).toBe(85);
      expect(data.analysis[1].sustainabilityScore).toBe(35);
    });

    it('should handle AI service errors gracefully', async () => {
      mockAnalyzeSustainability.mockRejectedValue(new Error('API key not found'));

      const request = new NextRequest('http://localhost:3000/api/sustainability/analyze', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toContain('AI analysis service temporarily unavailable');
    });

    it('should include comprehensive recommendations', async () => {
      const request = new NextRequest('http://localhost:3000/api/sustainability/analyze', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.recommendations)).toBe(true);
      expect(data.recommendations.length).toBeGreaterThan(0);
      expect(data.recommendations.length).toBeLessThanOrEqual(8); // Should be limited to 8
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/sustainability/analyze', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Internal server error');
    });
  });

  describe('GET', () => {
    it('should return endpoint information', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Sustainability analysis endpoint');
      expect(data.usage).toBeDefined();
      expect(data.example).toBeDefined();
      expect(Array.isArray(data.features)).toBe(true);
      expect(data.features).toHaveLength(4);
    });
  });
});