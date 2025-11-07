/**
 * Transit Routes API Endpoint
 * Provides real-time public transit routing via OpenTripPlanner
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTransitService } from '@/lib/services/transitService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let requestData;
    try {
      requestData = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { from, to, dateTime } = requestData;

    if (!from || !to) {
      return NextResponse.json(
        { error: 'From and to locations required' },
        { status: 400 }
      );
    }

    // Check if OTP is configured
    if (!process.env.OTP_BASE_URL) {
      return NextResponse.json(
        {
          error: 'OpenTripPlanner not configured',
          message: 'Please set OTP_BASE_URL in environment variables',
          hint: 'Set OTP_BASE_URL=https://your-otp-instance/otp/routers/default',
        },
        { status: 503 }
      );
    }

    try {
      const transitService = getTransitService();

      // Get transit routes
      const transitData = await transitService.getTransitRoute(from, to, dateTime);

      if (transitData.error) {
        return NextResponse.json(
          {
            success: false,
            error: transitData.error,
            plan: transitData.plan,
          },
          { status: 200 }
        );
      }

      // Calculate emissions and fares for each itinerary
      const itinerariesWithData = transitData.plan.itineraries.map((itin) => {
        const faresAndEmissions = transitService.getFaresAndEmissions(itin);
        return {
          ...itin,
          fare: {
            amount: faresAndEmissions.totalFare,
            currency: faresAndEmissions.currency,
          },
          emissions: faresAndEmissions.totalEmissions,
          emissionsBreakdown: faresAndEmissions.breakdown,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          ...transitData.plan,
          itineraries: itinerariesWithData,
        },
      });
    } catch (serviceError) {
      console.error('Transit service error:', serviceError);
      return NextResponse.json(
        {
          error:
            serviceError instanceof Error
              ? serviceError.message
              : 'Failed to fetch transit routes',
          retryable: true,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Transit API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        retryable: true,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if OTP is configured
    if (!process.env.OTP_BASE_URL) {
      return NextResponse.json({
        success: false,
        configured: false,
        message: 'OpenTripPlanner not configured',
      });
    }

    const transitService = getTransitService();
    const availableModes = await transitService.getAvailableModes();

    return NextResponse.json({
      success: true,
      configured: true,
      otpBaseUrl: process.env.OTP_BASE_URL,
      availableModes,
    });
  } catch (error) {
    console.error('Transit status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transit status',
      },
      { status: 500 }
    );
  }
}
