/**
 * Airport Code Lookup Utility
 *
 * Maps major cities and coordinates to their IATA airport codes
 * for use with Google Travel Impact Model API
 */

interface AirportInfo {
  code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
}

// Major US airports
const MAJOR_AIRPORTS: AirportInfo[] = [
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', lat: 40.6413, lng: -73.7781 },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', lat: 33.9416, lng: -118.4085 },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago', lat: 41.9742, lng: -87.9073 },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', lat: 32.8998, lng: -97.0403 },
  { code: 'DEN', name: 'Denver International', city: 'Denver', lat: 39.8561, lng: -104.6737 },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', lat: 37.6213, lng: -122.3790 },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', lat: 47.4502, lng: -122.3088 },
  { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', lat: 36.0840, lng: -115.1537 },
  { code: 'MCO', name: 'Orlando International', city: 'Orlando', lat: 28.4312, lng: -81.3081 },
  { code: 'MIA', name: 'Miami International', city: 'Miami', lat: 25.7959, lng: -80.2870 },
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', lat: 33.6407, lng: -84.4277 },
  { code: 'BOS', name: 'Boston Logan International', city: 'Boston', lat: 42.3656, lng: -71.0096 },
  { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', lat: 29.9902, lng: -95.3368 },
  { code: 'PHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', lat: 33.4484, lng: -112.0740 },
  { code: 'PHL', name: 'Philadelphia International', city: 'Philadelphia', lat: 39.8744, lng: -75.2424 },
  { code: 'SAN', name: 'San Diego International', city: 'San Diego', lat: 32.7336, lng: -117.1897 },
  { code: 'PDX', name: 'Portland International', city: 'Portland', lat: 45.5898, lng: -122.5951 },
  { code: 'DTW', name: 'Detroit Metropolitan Wayne County', city: 'Detroit', lat: 42.2162, lng: -83.3554 },
  { code: 'MSP', name: 'Minneapolis-St. Paul International', city: 'Minneapolis', lat: 44.8848, lng: -93.2223 },
  { code: 'EWR', name: 'Newark Liberty International', city: 'Newark', lat: 40.6895, lng: -74.1745 },
  { code: 'LGA', name: 'LaGuardia Airport', city: 'New York', lat: 40.7769, lng: -73.8740 },
];

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Find nearest airport to given coordinates
 */
export function findNearestAirport(lat: number, lng: number): AirportInfo | null {
  let nearest: AirportInfo | null = null;
  let minDistance = Infinity;

  for (const airport of MAJOR_AIRPORTS) {
    const distance = calculateDistance(lat, lng, airport.lat, airport.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = airport;
    }
  }

  // Only return if within 100 miles
  return minDistance < 100 ? nearest : null;
}

/**
 * Find airport by city name
 */
export function findAirportByCity(cityName: string): AirportInfo | null {
  const normalized = cityName.toLowerCase().trim();

  for (const airport of MAJOR_AIRPORTS) {
    if (airport.city.toLowerCase() === normalized ||
        normalized.includes(airport.city.toLowerCase())) {
      return airport;
    }
  }

  return null;
}

/**
 * Find airport by address string
 */
export function findAirportByAddress(address: string): AirportInfo | null {
  const normalized = address.toLowerCase();

  for (const airport of MAJOR_AIRPORTS) {
    if (normalized.includes(airport.city.toLowerCase())) {
      return airport;
    }
  }

  return null;
}
