# EcoTrack Setup Guide

## Dependencies Installation

After implementing the external API integrations, you need to install the required dependencies:

```bash
npm install @google/generative-ai firebase-admin
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your API keys:

```bash
cp .env.local.example .env.local
```

Required environment variables:
- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key
- `GOOGLE_PLACES_API_KEY`: Your Google Places API key (can be the same as Maps API key)
- `GEMINI_API_KEY`: Your Google Gemini AI API key
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `FIREBASE_PRIVATE_KEY`: Your Firebase service account private key
- `FIREBASE_CLIENT_EMAIL`: Your Firebase service account client email

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Firestore Database
3. Create a service account and download the JSON key file
4. Extract the required fields for your environment variables
5. Deploy the Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

## Google APIs Setup

1. Go to Google Cloud Console
2. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Routes API
   - Geocoding API
   - Generative AI API
3. Create API keys and add them to your environment variables

## Development

After setting up the environment variables and installing dependencies:

```bash
npm run dev
```

The application will be available at http://localhost:3000

## Services Overview

The following services have been implemented:

### Google Maps Service (`lib/services/googleMapsService.ts`)
- Geocoding addresses to coordinates
- Calculating routes with multiple transport modes
- Place suggestions for autocomplete
- Carbon footprint and cost calculations

### Gemini AI Service (`lib/services/geminiService.ts`)
- Sustainability analysis of route options
- Route recommendations based on user preferences
- Personalized insights based on travel history

### Firestore Service (`lib/services/firestoreService.ts`)
- User profile management
- Travel history storage and retrieval
- Environmental metrics calculation
- Route caching for performance
- Analytics and trend data

## Next Steps

After completing this setup, you can proceed with implementing:
- Carbon footprint calculation engine (Task 4)
- API routes for route planning (Task 5)
- User authentication (Task 6)
- Frontend components (Task 8)