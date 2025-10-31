# EcoTrack - AI-Powered Sustainable Travel Planner

EcoTrack is a Next.js-based web application that helps users plan eco-friendly trips by analyzing and suggesting routes and transport modes with minimal carbon footprint. The system leverages AI models for sustainability impact analysis and integrates with mapping services for route planning.

## Features

- 🌱 **Sustainable Route Planning** - AI-powered analysis of transport options
- 📊 **Carbon Footprint Tracking** - Real-time emissions calculations and comparisons
- 📈 **Travel Analytics** - Comprehensive sustainability metrics and insights
- 🎯 **Goal Setting** - Track and monitor sustainability targets
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🔐 **User Authentication** - Secure Google OAuth integration
- 🚗 **Multiple Transport Modes** - Car, train, bus, bike, walking, metro combinations

## Tech Stack

- **Frontend**: React with Next.js 14+ (App Router)
- **Backend**: Next.js API Routes
- **AI/ML**: Google Gemini API for sustainability analysis
- **Maps & Routing**: Google Maps API (Routes, Places, Geocoding)
- **Database**: Firestore (configured for future use)
- **Styling**: Tailwind CSS
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Maps API key
- Gemini API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Fill in your API keys in `.env.local`:
   ```
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   NEXTAUTH_SECRET=your_nextauth_secret_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── icons/            # Icon components
│   ├── ui/               # UI components
│   ├── TripPlanner.tsx   # Trip planning form
│   ├── RouteResults.tsx  # Route results display
│   └── RouteCard.tsx     # Individual route card
├── lib/                  # Utilities and services
│   ├── services/         # External service integrations
│   ├── constants.ts      # App constants
│   ├── env.ts           # Environment variables
│   ├── types.ts         # TypeScript types
│   └── utils.ts         # Utility functions
├── next.config.js        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Environment Variables

Required environment variables:

- `GOOGLE_MAPS_API_KEY`: Google Maps API key for route planning
- `GEMINI_API_KEY`: Google Gemini API key for AI analysis
- `NEXTAUTH_SECRET`: Secret for NextAuth.js authentication

Optional environment variables:

- `FIREBASE_PROJECT_ID`: Firebase project ID (for future database features)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID (for future authentication)
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret (for future authentication)

## API Endpoints

### Travel History
- `GET /api/user/history` - Get user's travel history with analytics
- `POST /api/user/history` - Save a completed trip
- `GET /api/user/history/[tripId]` - Get specific trip details
- `DELETE /api/user/history/[tripId]` - Delete a trip

### Analytics & Insights
- `GET /api/user/analytics` - Comprehensive travel analytics
- `GET /api/user/insights` - Personalized sustainability insights
- `GET /api/user/reports` - Detailed sustainability reports

### Goals & Tracking
- `GET /api/user/goals` - Get sustainability goals and progress
- `POST /api/user/goals` - Create new sustainability goals

### User Management
- `GET /api/user/profile` - Get user profile and preferences
- `PUT /api/user/profile` - Update user profile

## Development

The application is built with:

- **Next.js 14+** with App Router for modern React development
- **TypeScript** for type safety
- **Tailwind CSS** for responsive styling
- **ESLint** for code quality

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run test suite

## Troubleshooting

### Common Issues

1. **UI disappears on load**: Usually caused by missing API keys. Check browser console for errors.

2. **"Google Maps API key is required"**: Ensure `GOOGLE_MAPS_API_KEY` is set in your environment variables.

3. **Authentication issues**: Verify Google OAuth credentials and `NEXTAUTH_SECRET` are configured.

4. **No routes found**: Check that Google Maps APIs are enabled and have proper billing setup.

### Service Status

The app includes built-in service status checking. Missing configurations will show warnings in the UI rather than crashing the application.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
