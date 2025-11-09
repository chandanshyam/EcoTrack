/**
 * Grasshopper Routes API Endpoint
 * Provides real-time public transit routing via Grasshopper Directions API
 */

import 'dotenv/config';
import { NextRequest, NextResponse } from 'next/server';
import { getGrasshopperService } from '@/lib/services/grasshopper/grasshopperService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const departureTime = searchParams.get('departureTime');
    const modes = searchParams.get('modes');

    // Validate required parameters
    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Missing required parameters: origin and destination' },
        { status: 400 }
      );
    }

    // Parse coordinates
    const [originLat, originLng] = origin.split(',').map(Number);
    const [destLat, destLng] = destination.split(',').map(Number);

    if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
      return NextResponse.json(
        { error: 'Invalid coordinate format. Use format: lat,lng' },
        { status: 400 }
      );
    }

    // Check if Grasshopper is configured
    if (!process.env.GRASSHOPPER_API_KEY || !process.env.GRASSHOPPER_BASE_URL) {
      return NextResponse.json(
        {
          error: 'Grasshopper API not configured',
          message: 'Please set GRASSHOPPER_API_KEY and GRASSHOPPER_BASE_URL in environment variables',
        },
        { status: 503 }
      );
    }

    try {
      const service = getGrasshopperService();

      const routes = await service.getRoutes({
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destLat, lng: destLng },
        departureTime: departureTime ? new Date(departureTime) : undefined,
        transportModes: modes ? modes.split(',') : undefined,
      });

      return NextResponse.json({
        success: true,
        data: {
          routes,
          metadata: {
            origin: { lat: originLat, lng: originLng },
            destination: { lat: destLat, lng: destLng },
            fetchedAt: new Date().toISOString(),
          },
        },
      });
    } catch (serviceError) {
      console.error('Grasshopper service error:', serviceError);
      return NextResponse.json(
        {
          error: serviceError instanceof Error ? serviceError.message : 'Failed to fetch routes from Grasshopper',
          retryable: true,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Grasshopper API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        retryable: true,
      },
      { status: 500 }
    );
  }
}

/**
 * Check Grasshopper API configuration status
 */
export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      configured: !!(process.env.GRASSHOPPER_API_KEY && process.env.GRASSHOPPER_BASE_URL),
      message: process.env.GRASSHOPPER_API_KEY && process.env.GRASSHOPPER_BASE_URL
        ? 'Grasshopper API is configured'
        : 'Grasshopper API is not configured. Please set GRASSHOPPER_API_KEY and GRASSHOPPER_BASE_URL',
    });
  } catch (error) {
    console.error('Grasshopper status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check Grasshopper status',
      },
      { status: 500 }
    );
  }
}
