import { NextRequest } from 'next/server';
import { GET, POST } from '../../../app/api/user/history/route';
import { getServerSession } from 'next-auth/next';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('../../../lib/services/firestoreService');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockFirestoreService = require('../../../lib/services/firestoreService').firestoreService;

describe('/api/user/history', () => {
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

  const mockTrips = [
    {
      id: 'trip1',
      userId: 'user123',
      route: {
        id: 'route1',
        name: 'Test Route',
        origin: { address: 'Origin', coordinates: { lat: 0, lng: 0 } },
        destination: { address: 'Destination', coordinates: { lat: 1, lng: 1 } },
        transportModes: [
          {
            mode: 'train',
            duration: 120,
            distance: 100,
            carbonEmission: 5.2,
            cost: 25
          }
        ],
        totalDuration: 120,
        totalDistance: 100,
        totalCost: 25,
        totalCarbonFootprint: 5.2,
        sustainabilityScore: 85
      },
      completedAt: new Date('2024-01-15'),
      carbonFootprint: 5.2,
      carbonSaved: 15.8
    }
  ];

  const mockMetrics = {
    totalCarbonFootprint: 5.2,
    totalCarbonSaved: 15.8,
    totalTrips: 1,
    averageSustainabilityScore: 85
  };

  const mockTrends = [
    {
      period: 'January 2024',
      carbonFootprint: 5.2,
      carbonSaved: 15.8,
      sustainabilityScore: 85
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFirestoreService.getUserProfile.mockResolvedValue(mockUserProfile);
    mockFirestoreService.getUserTrips.mockResolvedValue(mockTrips);
    mockFirestoreService.getUserEnvironmentalMetrics.mockResolvedValue(mockMetrics);
    mockFirestoreService.getUserTrends.mockResolvedValue(mockTrends);
    mockFirestoreService.saveTrip.mockResolvedValue(mockTrips[0]);
  });

  describe('GET', () => {
    it('should return travel history for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/history');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.trips).toHaveLength(1);
      expect(data.trips[0].id).toBe('trip1');
      expect(data.trips[0].carbonFootprint).toBe(5.2);
      expect(data.cumulativeImpact).toEqual(mockMetrics);
      expect(data.trends).toEqual(mockTrends);
    });

    it('should handle date range filtering', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/history?startDate=2024-01-01&endDate=2024-01-31');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFirestoreService.getUserTrips).toHaveBeenCalledWith('user123', {
        limit: undefined,
        startAfter: new Date('2024-01-01'),
        endBefore: new Date('2024-01-31')
      });
    });

    it('should handle limit parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/history?limit=10');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFirestoreService.getUserTrips).toHaveBeenCalledWith('user123', {
        limit: 10,
        startAfter: undefined,
        endBefore: undefined
      });
    });

    it('should handle period parameter for trends', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/history?period=year');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFirestoreService.getUserTrends).toHaveBeenCalledWith('user123', 'year', 12);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user/history');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when user profile not found', async () => {
      mockFirestoreService.getUserProfile.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user/history');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User profile not found');
    });

    it('should handle service errors', async () => {
      mockFirestoreService.getUserTrips.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/user/history');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST', () => {
    const validTripData = {
      route: {
        id: 'route1',
        name: 'Test Route',
        origin: { address: 'Origin', coordinates: { lat: 0, lng: 0 } },
        destination: { address: 'Destination', coordinates: { lat: 1, lng: 1 } },
        transportModes: [
          {
            mode: 'train',
            duration: 120,
            distance: 100,
            carbonEmission: 5.2,
            cost: 25
          }
        ],
        totalDuration: 120,
        totalDistance: 100,
        totalCost: 25,
        totalCarbonFootprint: 5.2,
        sustainabilityScore: 85
      },
      carbonFootprint: 5.2,
      carbonSaved: 15.8,
      completedAt: '2024-01-15T10:00:00Z'
    };

    it('should save trip for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/history', {
        method: 'POST',
        body: JSON.stringify(validTripData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('trip1');
      expect(data.carbonFootprint).toBe(5.2);
      expect(mockFirestoreService.saveTrip).toHaveBeenCalledWith('user123', {
        route: validTripData.route,
        carbonFootprint: 5.2,
        carbonSaved: 15.8,
        completedAt: new Date('2024-01-15T10:00:00Z')
      });
    });

    it('should use current date when completedAt not provided', async () => {
      const tripDataWithoutDate = { ...validTripData };
      delete tripDataWithoutDate.completedAt;

      const request = new NextRequest('http://localhost:3000/api/user/history', {
        method: 'POST',
        body: JSON.stringify(tripDataWithoutDate)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(mockFirestoreService.saveTrip).toHaveBeenCalledWith('user123', expect.objectContaining({
        route: validTripData.route,
        carbonFootprint: 5.2,
        carbonSaved: 15.8,
        completedAt: expect.any(Date)
      }));
    });

    it('should validate required fields', async () => {
      const invalidTripData = {
        route: validTripData.route,
        // Missing carbonFootprint and carbonSaved
      };

      const request = new NextRequest('http://localhost:3000/api/user/history', {
        method: 'POST',
        body: JSON.stringify(invalidTripData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields: route, carbonFootprint, carbonSaved');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user/history', {
        method: 'POST',
        body: JSON.stringify(validTripData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when user profile not found', async () => {
      mockFirestoreService.getUserProfile.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user/history', {
        method: 'POST',
        body: JSON.stringify(validTripData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User profile not found');
    });

    it('should handle service errors', async () => {
      mockFirestoreService.saveTrip.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/user/history', {
        method: 'POST',
        body: JSON.stringify(validTripData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});