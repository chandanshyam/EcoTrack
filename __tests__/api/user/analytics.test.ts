import { NextRequest } from 'next/server';
import { GET } from '../../../app/api/user/analytics/route';
import { getServerSession } from 'next-auth/next';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('../../../lib/services/firestoreService');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockFirestoreService = require('../../../lib/services/firestoreService').firestoreService;

describe('/api/user/analytics', () => {
  const mockSession = {
    user: {
      email: 'test@example.com',
      name: 'Test User'
    }
  };

  const mockUserProfile = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    preferences: {
      prioritizeSustainability: true,
      preferredTransportModes: []
    },
    createdAt: new Date('2024-01-01')
  };

  const mockMetrics = {
    totalCarbonFootprint: 25.6,
    totalCarbonSaved: 42.4, // Recalculated from segments: (100*0.338-5.2) + (50*0.338-3.1) = 28.6 + 13.8 = 42.4
    totalTrips: 5,
    averageSustainabilityScore: 82
  };

  const mockMonthlyTrends = [
    {
      period: 'December 2023',
      carbonFootprint: 12.3,
      carbonSaved: 35.7,
      sustainabilityScore: 78
    },
    {
      period: 'January 2024',
      carbonFootprint: 13.3,
      carbonSaved: 42.7,
      sustainabilityScore: 85
    }
  ];

  const mockYearlyTrends = [
    {
      period: '2023',
      carbonFootprint: 120.5,
      carbonSaved: 380.2,
      sustainabilityScore: 79
    },
    {
      period: '2024',
      carbonFootprint: 25.6,
      carbonSaved: 42.4, // Match recalculated value
      sustainabilityScore: 82
    }
  ];

  const mockTrips = [
    {
      id: 'trip1',
      userId: 'user123',
      route: {
        id: 'route1',
        transportModes: [
          { mode: 'train', duration: 120, distance: 100, carbonEmission: 5.2, cost: 25 }
        ],
        sustainabilityScore: 85
      },
      completedAt: new Date('2024-01-15'),
      carbonFootprint: 5.2,
      carbonSaved: 15.8
    },
    {
      id: 'trip2',
      userId: 'user123',
      route: {
        id: 'route2',
        transportModes: [
          { mode: 'bus', duration: 90, distance: 50, carbonEmission: 3.1, cost: 15 }
        ],
        sustainabilityScore: 78
      },
      completedAt: new Date('2024-01-20'),
      carbonFootprint: 3.1,
      carbonSaved: 8.9
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFirestoreService.getUserProfile.mockResolvedValue(mockUserProfile);
    mockFirestoreService.getUserEnvironmentalMetrics.mockResolvedValue(mockMetrics);
    mockFirestoreService.getUserTrends.mockImplementation((userId, period) => {
      return period === 'year' ? Promise.resolve(mockYearlyTrends) : Promise.resolve(mockMonthlyTrends);
    });
    mockFirestoreService.getUserTrips.mockResolvedValue(mockTrips);
  });

  describe('GET', () => {
    it('should return comprehensive analytics for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/analytics');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics.totalCarbonFootprint).toBe(mockMetrics.totalCarbonFootprint);
      expect(data.metrics.totalCarbonSaved).toBeCloseTo(mockMetrics.totalCarbonSaved, 1);
      expect(data.metrics.totalTrips).toBe(mockMetrics.totalTrips);
      expect(data.metrics.averageSustainabilityScore).toBe(mockMetrics.averageSustainabilityScore);
      expect(data.trends).toEqual(mockMonthlyTrends);
      expect(data.insights).toBeDefined();
      expect(data.monthlyMetrics).toBeDefined();
      expect(data.yearlyMetrics).toBeDefined();
    });

    it('should return yearly trends when period=year', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/analytics?period=year');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.trends).toEqual(mockYearlyTrends);
      expect(mockFirestoreService.getUserTrends).toHaveBeenCalledWith('user123', 'year', 5);
    });

    it('should handle limit parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/analytics?limit=50');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFirestoreService.getUserTrips).toHaveBeenCalledWith('user123', { limit: 50 });
    });

    it('should calculate insights correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/analytics');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.insights).toHaveProperty('mostSustainableMonth');
      expect(data.insights).toHaveProperty('averageTripsPerMonth');
      expect(data.insights).toHaveProperty('topTransportModes');
      expect(data.insights).toHaveProperty('sustainabilityImprovement');
      expect(data.insights).toHaveProperty('goalProgress');
      
      // Check that top transport modes are calculated
      expect(Array.isArray(data.insights.topTransportModes)).toBe(true);
      expect(data.insights.topTransportModes.length).toBeGreaterThan(0);
    });

    it('should calculate monthly metrics correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/analytics');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.monthlyMetrics)).toBe(true);
      if (data.monthlyMetrics.length > 0) {
        expect(data.monthlyMetrics[0]).toHaveProperty('month');
        expect(data.monthlyMetrics[0]).toHaveProperty('carbonFootprint');
        expect(data.monthlyMetrics[0]).toHaveProperty('carbonSaved');
        expect(data.monthlyMetrics[0]).toHaveProperty('tripCount');
        expect(data.monthlyMetrics[0]).toHaveProperty('sustainabilityScore');
      }
    });

    it('should calculate yearly metrics correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/analytics');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.yearlyMetrics)).toBe(true);
      if (data.yearlyMetrics.length > 0) {
        expect(data.yearlyMetrics[0]).toHaveProperty('year');
        expect(data.yearlyMetrics[0]).toHaveProperty('carbonFootprint');
        expect(data.yearlyMetrics[0]).toHaveProperty('carbonSaved');
        expect(data.yearlyMetrics[0]).toHaveProperty('tripCount');
        expect(data.yearlyMetrics[0]).toHaveProperty('sustainabilityScore');
      }
    });

    it('should calculate goal progress correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/analytics');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.insights.goalProgress).toHaveProperty('target');
      expect(data.insights.goalProgress).toHaveProperty('current');
      expect(data.insights.goalProgress).toHaveProperty('percentage');
      expect(data.insights.goalProgress.target).toBe(50); // 50% reduction goal
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when user profile not found', async () => {
      mockFirestoreService.getUserProfile.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User profile not found');
    });

    it('should handle service errors', async () => {
      mockFirestoreService.getUserEnvironmentalMetrics.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/user/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle empty trips gracefully', async () => {
      mockFirestoreService.getUserTrips.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/user/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.insights.topTransportModes).toEqual([]);
      expect(data.insights.averageTripsPerMonth).toBe(0);
    });
  });
});