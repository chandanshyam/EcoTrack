import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { TransportMode, RouteOption, TransportSegment } from '@/lib/types'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

interface GoogleMapsDirectionsResponse {
  routes: GoogleMapsRoute[]
  status: string
  error_message?: string
}

interface GoogleMapsRoute {
  legs: GoogleMapsLeg[]
  overview_polyline: {
    points: string
  }
  summary: string
  warnings: string[]
  duration: {
    text: string
    value: number
  }
  distance: {
    text: string
    value: number
  }
}

interface GoogleMapsLeg {
  distance: {
    text: string
    value: number
  }
  duration: {
    text: string
    value: number
  }
  start_address: string
  end_address: string
  start_location: {
    lat: number
    lng: number
  }
  end_location: {
    lat: number
    lng: number
  }
}

interface GoogleMapsGeocodingResponse {
  results: GoogleMapsGeocodingResult[]
  status: string
  error_message?: string
}

interface GoogleMapsGeocodingResult {
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  place_id: string
}

// Carbon emission factors (kg CO2e per km)
const EMISSION_FACTORS = {
  [TransportMode.CAR]: 0.21,
  [TransportMode.TRAIN]: 0.041,
  [TransportMode.BUS]: 0.089,
  [TransportMode.PLANE]: 0.255,
  [TransportMode.BIKE]: 0,
  [TransportMode.WALK]: 0,
  [TransportMode.METRO]: 0.028,
}

// Cost estimates (USD per km)
const COST_FACTORS = {
  [TransportMode.CAR]: 0.56,
  [TransportMode.TRAIN]: 0.15,
  [TransportMode.BUS]: 0.10,
  [TransportMode.PLANE]: 0.25,
  [TransportMode.BIKE]: 0.02,
  [TransportMode.WALK]: 0,
  [TransportMode.METRO]: 0.12,
}

export async function POST(request: NextRequest) {
  try {
    const { origin, destination } = await request.json()

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required' },
        { status: 400 }
      )
    }

    const apiKey = env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      )
    }

    // Geocode origin and destination
    const [originLocation, destinationLocation] = await Promise.all([
      geocodeAddress(origin, apiKey),
      geocodeAddress(destination, apiKey)
    ])

    // Calculate routes for different transport modes
    const transportModes = [TransportMode.CAR, TransportMode.TRAIN, TransportMode.BUS]
    const routes: RouteOption[] = []

    for (const mode of transportModes) {
      try {
        const route = await calculateRoute(originLocation, destinationLocation, mode, apiKey)
        if (route) {
          routes.push(route)
        }
      } catch (error) {
        console.warn(`Failed to calculate route for ${mode}:`, error)
        // Continue with other modes
      }
    }

    // Sort by sustainability score (highest first)
    routes.sort((a, b) => b.sustainabilityScore - a.sustainabilityScore)

    return NextResponse.json({ routes })
  } catch (error) {
    console.error('Error planning routes:', error)
    return NextResponse.json(
      {
        error: 'Failed to plan routes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function geocodeAddress(address: string, apiKey: string) {
  // Try real API first, fall back to mock data if it fails
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`

    const response = await fetch(url)
    const data: GoogleMapsGeocodingResponse = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0]
      return {
        address: result.formatted_address,
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
      }
    }
  } catch (error) {
    console.warn('Geocoding API failed, using mock data:', error)
  }

  // Mock data for common locations (for development)
  const mockLocations: Record<string, any> = {
    'new york': { address: 'New York, NY, USA', coordinates: { lat: 40.7127753, lng: -74.0059728 } },
    'boston': { address: 'Boston, MA, USA', coordinates: { lat: 42.3600825, lng: -71.0588801 } },
    'san francisco': { address: 'San Francisco, CA, USA', coordinates: { lat: 37.7749295, lng: -122.4194155 } },
    'los angeles': { address: 'Los Angeles, CA, USA', coordinates: { lat: 34.0522265, lng: -118.2436596 } },
    'chicago': { address: 'Chicago, IL, USA', coordinates: { lat: 41.8781136, lng: -87.6297982 } },
  }

  const normalizedAddress = address.toLowerCase()
  for (const [key, location] of Object.entries(mockLocations)) {
    if (normalizedAddress.includes(key)) {
      console.log(`Using mock data for ${address}`)
      return location
    }
  }

  throw new Error(`Geocoding failed for "${address}" and no mock data available`)
}

async function calculateRoute(
  origin: any,
  destination: any,
  mode: TransportMode,
  apiKey: string
): Promise<RouteOption | null> {
  let distanceKm: number
  let durationMinutes: number

  // Try real API first, fall back to mock data
  try {
    const travelMode = mapTransportModeToGoogleMaps(mode)
    const url = `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${origin.coordinates.lat},${origin.coordinates.lng}&` +
      `destination=${destination.coordinates.lat},${destination.coordinates.lng}&` +
      `mode=${travelMode}&` +
      `key=${apiKey}`

    const response = await fetch(url)
    const data: GoogleMapsDirectionsResponse = await response.json()

    if (data.status === 'OK' && data.routes.length > 0) {
      const googleRoute = data.routes[0]
      distanceKm = googleRoute.distance.value / 1000
      durationMinutes = googleRoute.duration.value / 60
    } else {
      throw new Error(`Directions API failed: ${data.error_message || data.status}`)
    }
  } catch (error) {
    console.warn(`Directions API failed for ${mode}, using mock data:`, error)

    // Calculate approximate distance using coordinates (Haversine formula)
    const R = 6371 // Earth's radius in km
    const dLat = (destination.coordinates.lat - origin.coordinates.lat) * Math.PI / 180
    const dLon = (destination.coordinates.lng - origin.coordinates.lng) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(origin.coordinates.lat * Math.PI / 180) * Math.cos(destination.coordinates.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    distanceKm = R * c

    // Mock duration based on transport mode
    const speedKmh = {
      [TransportMode.CAR]: 60,
      [TransportMode.TRAIN]: 80,
      [TransportMode.BUS]: 40,
      [TransportMode.BIKE]: 20,
      [TransportMode.WALK]: 5,
      [TransportMode.METRO]: 35,
      [TransportMode.PLANE]: 500,
    }

    durationMinutes = (distanceKm / speedKmh[mode]) * 60
  }

  // Calculate emissions and cost
  const carbonEmission = distanceKm * EMISSION_FACTORS[mode]
  const cost = distanceKm * COST_FACTORS[mode]

  // Calculate sustainability score (0-100)
  const sustainabilityScore = calculateSustainabilityScore(mode, carbonEmission, distanceKm)

  const transportSegment: TransportSegment = {
    mode,
    duration: durationMinutes,
    distance: distanceKm,
    carbonEmission,
    cost,
    provider: getProviderName(mode),
  }

  return {
    id: `route-${mode}-${Date.now()}`,
    name: getRouteName(mode),
    origin,
    destination,
    transportModes: [transportSegment],
    totalDuration: durationMinutes,
    totalDistance: distanceKm,
    totalCost: cost,
    totalCarbonFootprint: carbonEmission,
    sustainabilityScore,
  }
}

function mapTransportModeToGoogleMaps(mode: TransportMode): string {
  switch (mode) {
    case TransportMode.CAR:
      return 'driving'
    case TransportMode.TRAIN:
    case TransportMode.BUS:
    case TransportMode.METRO:
      return 'transit'
    case TransportMode.BIKE:
      return 'bicycling'
    case TransportMode.WALK:
      return 'walking'
    case TransportMode.PLANE:
      return 'driving' // Fallback
    default:
      return 'driving'
  }
}

function calculateSustainabilityScore(mode: TransportMode, emissions: number, distance: number): number {
  // Base scores by transport mode
  const baseScores = {
    [TransportMode.WALK]: 100,
    [TransportMode.BIKE]: 95,
    [TransportMode.TRAIN]: 85,
    [TransportMode.METRO]: 80,
    [TransportMode.BUS]: 70,
    [TransportMode.CAR]: 30,
    [TransportMode.PLANE]: 15,
  }

  let score = baseScores[mode] || 50

  // Adjust based on emissions per km
  const emissionsPerKm = distance > 0 ? emissions / distance : 0
  if (emissionsPerKm < 0.05) score += 10
  else if (emissionsPerKm > 0.2) score -= 15

  return Math.max(0, Math.min(100, Math.round(score)))
}

function getRouteName(mode: TransportMode): string {
  switch (mode) {
    case TransportMode.CAR:
      return 'Drive'
    case TransportMode.TRAIN:
      return 'Train'
    case TransportMode.BUS:
      return 'Bus'
    case TransportMode.PLANE:
      return 'Flight'
    case TransportMode.BIKE:
      return 'Bike'
    case TransportMode.WALK:
      return 'Walk'
    case TransportMode.METRO:
      return 'Metro'
    default:
      return 'Unknown'
  }
}

function getProviderName(mode: TransportMode): string | undefined {
  switch (mode) {
    case TransportMode.TRAIN:
      return 'Local Rail'
    case TransportMode.BUS:
      return 'Public Bus'
    case TransportMode.METRO:
      return 'Metro System'
    case TransportMode.PLANE:
      return 'Airline'
    default:
      return undefined
  }
}