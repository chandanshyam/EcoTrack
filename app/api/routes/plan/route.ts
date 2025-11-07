import { NextRequest, NextResponse } from 'next/server'
import { planTripWithAI } from '@/lib/services/geminiService'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    let requestData;
    try {
      requestData = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { origin, destination, userLocation, travelDate, preferences } = requestData;

    if (!origin || !destination) {
      return NextResponse.json({ error: 'Origin and destination required' }, { status: 400 });
    }

    if (!process.env.GOOGLE_MAPS_API_KEY && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: 'Google Maps API not configured' }, { status: 500 });
    }

    if (!process.env.GEMINI_API_KEY && !process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
    }

    const geolocationCoords = userLocation ? {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude
    } : undefined;

    const result = await planTripWithAI(
      origin,
      destination,
      geolocationCoords,
      travelDate,
      preferences
    );

    return NextResponse.json({
      routes: result.routes,
      analysis: result.analysis
    });

  } catch (error) {
    console.error('Trip planning error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to plan trip',
        retryable: true
      },
      { status: 500 }
    );
  }
}
