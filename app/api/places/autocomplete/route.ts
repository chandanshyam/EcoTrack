import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const input = searchParams.get('input');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!input) {
      return NextResponse.json(
        { error: 'Input parameter is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    // Build URL for Google Places API
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
      `input=${encodeURIComponent(input)}&` +
      `types=geocode&` +
      `key=${apiKey}`;

    if (lat && lng) {
      url += `&location=${lat},${lng}&radius=50000`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn('Place autocomplete failed:', data.error_message || data.status);
      return NextResponse.json(
        { suggestions: [], status: data.status },
        { status: 200 }
      );
    }

    const suggestions = data.predictions?.map((prediction: any) => prediction.description) || [];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Place autocomplete API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch place suggestions' },
      { status: 500 }
    );
  }
}
