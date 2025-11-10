/**
 * Test endpoint to verify enhanced transit integration
 * Test with: curl http://localhost:3000/api/test-transit
 */

import { NextResponse } from 'next/server';
import { googleMapsService } from '@/lib/services/googleMapsService';
import { TransportMode } from '@/lib/types';

export async function GET() {
  try {
    // Test route: Union Station to Hollywood in Los Angeles (good transit coverage)
    const origin = 'Union Station, Los Angeles, CA';
    const destination = '6801 Hollywood Blvd, Los Angeles, CA';

    console.log('Testing transit route from', origin, 'to', destination);

    const routes = await googleMapsService.calculateRoutes(
      origin,
      destination,
      [TransportMode.TRAIN, TransportMode.BUS],
      new Date().toISOString()
    );

    // Log detailed transit info
    routes.forEach((route, index) => {
      console.log(`\n=== Route ${index + 1}: ${route.name} ===`);
      console.log(`Duration: ${route.totalDuration.toFixed(0)} min`);
      console.log(`Distance: ${route.totalDistance.toFixed(1)} km`);
      console.log(`Carbon: ${route.totalCarbonFootprint.toFixed(2)} kg CO2e`);
      console.log(`Segments: ${route.transportModes.length}`);

      route.transportModes.forEach((segment, i) => {
        console.log(`\n  Segment ${i + 1}:`);
        console.log(`  Mode: ${segment.mode}`);
        console.log(`  Distance: ${segment.distance.toFixed(2)} km`);

        if (segment.transitDetails) {
          const td = segment.transitDetails;
          console.log(`  Line: ${td.line}`);
          console.log(`  Vehicle Type: ${td.vehicleType}`);
          console.log(`  Agency: ${td.agencyName || 'N/A'}`);
          console.log(`  From: ${td.departureStop.name}`);
          console.log(`  To: ${td.arrivalStop.name}`);
          console.log(`  Depart: ${td.departureStop.departureTime || 'N/A'}`);
          console.log(`  Arrive: ${td.arrivalStop.arrivalTime || 'N/A'}`);
          console.log(`  Stops: ${td.numStops}`);
          if (td.fare) {
            console.log(`  Fare: ${td.fare.text}`);
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Transit test completed - check server logs for details',
      routeCount: routes.length,
      routes: routes.map(route => ({
        id: route.id,
        name: route.name,
        duration: route.totalDuration,
        distance: route.totalDistance,
        carbon: route.totalCarbonFootprint,
        segments: route.transportModes.map(seg => ({
          mode: seg.mode,
          distance: seg.distance,
          hasTransitDetails: !!seg.transitDetails,
          line: seg.transitDetails?.line,
          vehicleType: seg.transitDetails?.vehicleType,
          departureStop: seg.transitDetails?.departureStop.name,
          arrivalStop: seg.transitDetails?.arrivalStop.name,
          departureTime: seg.transitDetails?.departureStop.departureTime,
          arrivalTime: seg.transitDetails?.arrivalStop.arrivalTime,
          fare: seg.transitDetails?.fare?.text,
        })),
      })),
    });
  } catch (error) {
    console.error('Transit test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
