# EcoTrack - AI-Powered Sustainable Travel Planner

EcoTrack is a Next.js-based web application that helps users plan eco-friendly trips by analyzing and suggesting routes and transport modes with minimal carbon footprint. The system leverages AI models for sustainability impact analysis and integrates with mapping services for route planning.

## Features

- AI-powered route planning with sustainability analysis
- Multiple transport mode combinations (car, train, bus, bike, walking, metro)
- Carbon footprint calculations and comparisons
- Responsive design with Tailwind CSS
- Real-time location services integration
- Sustainability scoring and recommendations

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
