/**
 * Transit Arrivals API Endpoint
 * Provides real-time arrival information for transit stops
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTransitService } from '@/lib/services/transitService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const stopId = searchParams.get('stopId');

    if (!stopId) {
      return NextResponse.json({ error: 'stopId parameter required' }, { status: 400 });
    }

    // Check if OTP is configured
    if (!process.env.OTP_BASE_URL) {
      return NextResponse.json(
        {
          error: 'OpenTripPlanner not configured',
          message: 'Please set OTP_BASE_URL in environment variables',
        },
        { status: 503 }
      );
    }

    try {
      const transitService = getTransitService();
      const arrivals = await transitService.getRealtimeArrivals(stopId);

      return NextResponse.json({
        success: true,
        data: {
          stopId,
          arrivals,
          fetchedAt: new Date().toISOString(),
        },
      });
    } catch (serviceError) {
      console.error('Realtime arrivals error:', serviceError);
      return NextResponse.json(
        {
          error:
            serviceError instanceof Error
              ? serviceError.message
              : 'Failed to fetch realtime arrivals',
          retryable: true,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Transit arrivals API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
