# Transit Integration Documentation

## Overview

EcoTrack integrates with OpenTripPlanner (OTP) to provide real-time public transit routing, live schedules, arrival times, actual fares, and emissions calculations.

## Features

✅ **Real-Time Transit Routing**
- Live bus/train schedules via GTFS-RT
- Multi-modal journey planning (bus, train, subway, tram, ferry)
- Real-time delay information
- Stop-by-stop itineraries

✅ **Accurate Emissions**
- Mode-specific emission factors
- Per-leg emissions breakdown
- Total carbon footprint calculation

✅ **Fare Information**
- Real ticket prices when available
- Fare breakdown by transit agency
- Cost comparison with driving

## Setup

### 1. OpenTripPlanner Instance

You need an OTP instance. Options:

**Option A: Use Public OTP Instance**
```bash
# Example: Trimet (Portland)
OTP_BASE_URL=https://maps.trimet.org/otp_mod

# Example: Regional instances
OTP_BASE_URL=https://otp.example.com/otp/routers/default
```

**Option B: Run Your Own OTP**
```bash
# Docker
docker run -p 8080:8080 \
  -v $(pwd)/graphs:/var/otp/graphs \
  opentripplanner/opentripplanner:latest \
  --load --serve

OTP_BASE_URL=http://localhost:8080/otp/routers/default
```

### 2. Configure Environment

Add to `.env.local`:
```bash
OTP_BASE_URL=https://your-otp-instance/otp/routers/default
```

### 3. Verify Configuration

```bash
curl http://localhost:3001/api/routes/transit
```

Should return:
```json
{
  "success": true,
  "configured": true,
  "availableModes": ["BUS", "TRAIN", "SUBWAY", "WALK"]
}
```

## API Endpoints

### POST `/api/routes/transit`

Get transit routes between two locations.

**Request:**
```json
{
  "from": "40.7128,-74.0060",
  "to": "40.7580,-73.9855",
  "dateTime": "2024-11-08T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": 1699444800000,
    "from": { "name": "Origin", "lat": 40.7128, "lon": -74.0060 },
    "to": { "name": "Destination", "lat": 40.7580, "lon": -73.9855 },
    "itineraries": [
      {
        "duration": 1800,
        "startTime": 1699444800000,
        "endTime": 1699446600000,
        "walkTime": 300,
        "transitTime": 1200,
        "waitingTime": 300,
        "transfers": 1,
        "legs": [
          {
            "mode": "BUS",
            "routeShortName": "M15",
            "headsign": "South Ferry",
            "agencyName": "MTA",
            "startTime": 1699444800000,
            "endTime": 1699445400000,
            "duration": 600,
            "distance": 2500,
            "from": {
              "name": "5th Ave & 42nd St",
              "lat": 40.7536,
              "lon": -73.9810,
              "stopId": "305416"
            },
            "to": {
              "name": "5th Ave & 14th St",
              "lat": 40.7362,
              "lon": -73.9923,
              "stopId": "305420"
            },
            "realTime": true,
            "transitLeg": true
          }
        ],
        "fare": {
          "amount": 2.75,
          "currency": "USD"
        },
        "emissions": 0.2225,
        "emissionsBreakdown": [
          {
            "mode": "BUS",
            "distance": 2.5,
            "emissions": 0.2225
          }
        ]
      }
    ]
  }
}
```

### GET `/api/transit/arrivals?stopId=305416`

Get real-time arrivals for a stop.

**Response:**
```json
{
  "success": true,
  "data": {
    "stopId": "305416",
    "arrivals": [
      {
        "stopId": "305416",
        "stopName": "5th Ave & 42nd St",
        "routeShortName": "M15",
        "routeLongName": "East Side",
        "headsign": "South Ferry",
        "scheduledArrival": 1699444800000,
        "realtimeArrival": 1699444920000,
        "delay": 120,
        "vehicleId": "5423",
        "tripId": "trip-123"
      }
    ],
    "fetchedAt": "2024-11-08T10:00:00Z"
  }
}
```

## Emission Factors

| Mode   | kg CO₂/km/passenger |
|--------|---------------------|
| Bus    | 0.089              |
| Train  | 0.041              |
| Subway | 0.035              |
| Tram   | 0.029              |
| Ferry  | 0.019              |
| Walk   | 0.000              |

## TypeScript Types

```typescript
import type {
  TransitMode,
  TransitLeg,
  TransitItinerary,
  RealtimeArrival,
  FaresAndEmissions
} from '@/lib/services/transitService';
```

## Testing

### Test Transit Route

```bash
curl -X POST http://localhost:3001/api/routes/transit \
  -H "Content-Type: application/json" \
  -d '{
    "from": "40.7128,-74.0060",
    "to": "40.7580,-73.9855"
  }'
```

### Test Real-time Arrivals

```bash
curl "http://localhost:3001/api/transit/arrivals?stopId=305416"
```

## Troubleshooting

### OTP Not Configured
```
Error: OpenTripPlanner not configured
```
**Solution:** Set `OTP_BASE_URL` in `.env.local`

### No Routes Found
**Causes:**
- Locations too far apart
- No transit service available
- OTP instance doesn't cover area

**Solution:** Verify OTP instance covers your region

### Real-time Data Unavailable
**Cause:** GTFS-RT feed not configured in OTP

**Solution:** Configure GTFS-RT feeds in OTP

## Public OTP Instances

- **Portland (Trimet)**: https://maps.trimet.org/otp_mod
- **Finland**: https://api.digitransit.fi/routing/v1/routers/finland
- **Netherlands**: https://v0.ovapi.nl

## Next Steps

1. Configure your OTP instance
2. Test with the API endpoints
3. Integrate with frontend components
4. Add transit mode to route planner UI

For more information, see:
- [OpenTripPlanner Documentation](http://docs.opentripplanner.org/)
- [GTFS Specification](https://gtfs.org/)
