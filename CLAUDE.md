# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EcoTrack is a Next.js 14+ application that helps users plan sustainable travel by analyzing routes and suggesting eco-friendly transportation options. The app combines Google Maps routing data with Google Gemini AI for sustainability analysis and carbon footprint calculations.

## Essential Commands

### Development
```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build production bundle
npm start            # Start production server
npm run lint         # Run ESLint
```

### Testing
```bash
npm test            # Run all tests
npm run test:watch  # Run tests in watch mode
```

## Environment Setup

Required environment variables (see `.env.example`):
- `GOOGLE_MAPS_API_KEY` - Google Maps API key (Routes, Places, Geocoding APIs must be enabled)
- `GEMINI_API_KEY` - Google Gemini API key for AI sustainability analysis
- `NEXTAUTH_SECRET` - Secret for NextAuth.js sessions
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth credentials
- `FIREBASE_PROJECT_ID` / `FIREBASE_PRIVATE_KEY` / `FIREBASE_CLIENT_EMAIL` - Firebase/Firestore credentials

**Note**: The app gracefully handles missing API keys and displays warnings rather than crashing. See `lib/utils/serviceCheck.ts` for service availability checking.

## Architecture Overview

### Data Flow: Trip Planning

1. **User Input** → `components/TripPlanner.tsx` collects origin, destination, travel date, and preferences
2. **API Request** → Calls `planTripWithAI()` in `lib/services/geminiService.ts`
3. **Parallel Processing**:
   - `googleMapsService.ts` fetches multiple route options (driving, transit, walking, biking)
   - Each route is processed with detailed step analysis to determine transport modes
4. **Carbon Calculation** → `carbonCalculationService.ts` calculates emissions for each segment using mode-specific emission factors
5. **Sustainability Scoring** → Routes are scored 0-100 based on:
   - Carbon footprint (50%)
   - Use of public/active transport (30%)
   - Distance efficiency (20%)
6. **AI Analysis** → Gemini AI generates:
   - Sustainability summary
   - Personalized tips
   - Comparison with conventional car travel
7. **Display** → `components/RouteResults.tsx` renders routes, map, and analysis

### Service Layer Architecture

**`lib/services/geminiService.ts`** - Primary orchestrator
- Coordinates between Google Maps and carbon calculation services
- Generates AI-powered sustainability insights
- Handles fallback logic when APIs are unavailable
- Key function: `planTripWithAI(origin, destination, userLocation?, travelDate?, preferences?)`

**`lib/services/googleMapsService.ts`** - Route fetching
- Fetches driving, transit, walking, and biking routes
- Parses Google Maps responses into standardized `RouteOption` format
- Extracts transport modes from route steps
- Key function: `getRoutes(origin, destination, travelDate?)`

**`lib/services/carbonCalculationService.ts`** - Emission calculations
- Contains emission factors for all transport modes (car, train, bus, plane, bike, walk, metro)
- Calculates per-segment and total route emissions
- Provides sustainability scores and comparisons
- Key constants: `CARBON_EMISSION_FACTORS` object with base and variant factors

### Type System

All types are defined in `lib/types.ts`. Critical types:

- **`RouteOption`** - Complete route with segments, carbon data, and sustainability score
- **`TransportSegment`** - Individual leg of journey with mode, duration, distance, emissions, cost
- **`TransportMode`** - Enum: car, train, bus, plane, bike, walk, metro
- **`SustainabilityAnalysis`** - AI-generated insights and comparisons
- **`UserPreferences`** - User's sustainability priorities and constraints

### Authentication Flow

- NextAuth.js with Google OAuth provider
- Firestore adapter for session storage
- JWT strategy for sessions
- Custom pages at `/auth/signin` and `/auth/error`
- Session callbacks in `app/api/auth/[...nextauth]/route.ts` add user ID to token

### API Routes Structure

User data endpoints (authenticated):
- `/api/user/profile` - GET/PUT user profile and preferences
- `/api/user/history` - GET/POST travel history
- `/api/user/analytics` - GET aggregated sustainability metrics
- `/api/user/insights` - GET personalized recommendations
- `/api/user/goals` - GET/POST sustainability goals

Public endpoints:
- `/api/health` - Service status check
- `/api/routes/plan` - Route planning (if direct API access needed)
- `/api/sustainability/analyze` - Sustainability analysis (if direct API access needed)

## Design System: NeoBrutalism

EcoTrack uses a distinctive neobrutalism design system (see `NEOBRUTALISM_GUIDE.md` for full details).

### Key Design Principles

1. **Colors**: Vibrant, flat colors with pure black (#000000) borders
   - Primary: Lime green (`#BFFF00`) - CTAs and accents
   - Category colors: Teal (`#00BCD4`), Olive (`#697B42`), Coral (`#FF6B4A`), Mustard (`#E5A82D`)
   - Background: White (`#FFFFFF`) or Dark charcoal (`#2D2D2D`)

2. **Borders & Shadows**: All interactive elements use:
   - 4px solid black borders (`border-4 border-neo-black`)
   - 8px offset shadows (`shadow-brutal` = `8px 8px 0px 0px #000000`)

3. **Typography**:
   - Use `.heading-brutal` for all-caps, bold headings
   - Use `.text-brutal` for monospace body text
   - Text is always uppercase for emphasis

4. **Components**: Use CSS classes directly (no UI component library):
   - Buttons: `.btn-primary`, `.btn-secondary`, `.btn-accent`
   - Cards: `.card-brutal`, `.card-green`, `.card-yellow`, `.card-teal`
   - Status: `.status-success`, `.status-warning`, `.status-error`
   - Inputs: `.input-brutal`

### Styling New Features

When adding new UI:
- Use existing neobrutalism classes from `app/globals.css`
- Maintain 4px borders and 8px shadows
- Use vibrant colors from the palette
- Keep text uppercase and bold
- No rounded corners or gradients

## Component Patterns

### Location Input with Geolocation

`components/LocationAutocomplete.tsx` provides autocomplete with Places API integration. `hooks/useGeolocation.ts` provides browser geolocation access with error handling.

```tsx
const { coordinates, error, isLoading, getCurrentPosition } = useGeolocation();

// Use coordinates for "My Current Location" feature
if (origin === 'My Current Location') {
  planTrip(origin, destination, coordinates);
}
```

### Interactive Map

`components/InteractiveMap.tsx` displays routes on Google Maps with selectable polylines. Accepts `routes`, `selectedRouteId`, and `onRouteSelect` props.

### Travel Preferences

`components/TravelPreferences.tsx` collects user preferences:
- `prioritizeSustainability`: boolean
- `maxTravelTime`: number (minutes)
- `budgetLimit`: number (currency)
- `preferredTransportModes`: TransportMode[]

These preferences influence Gemini AI recommendations but don't filter routes.

## Next.js Best Practices

This project uses Next.js 14+ with the App Router. Follow these patterns:

### Server vs Client Components

**Default to Server Components** - Only add `'use client'` when necessary:
- Components with browser APIs (geolocation, localStorage)
- Components with event handlers (onClick, onChange)
- Components using React hooks (useState, useEffect)
- Components using NextAuth session hooks (useSession)

**Current Client Components:**
- All pages under `app/` (dashboard, profile, history) - use `useSession()` and `useRouter()`
- `components/TripPlanner.tsx` - form state and event handlers
- `components/RouteResults.tsx` - interactive state management
- `components/LocationAutocomplete.tsx` - Places API integration
- `components/InteractiveMap.tsx` - Google Maps SDK
- `components/Header.tsx` - auth state and navigation

**Server Components** (no 'use client' directive):
- `components/RouteCard.tsx` - pure display component
- `components/DateSelector.tsx` - can be server-rendered
- `components/TransportIcon.tsx` - pure icon rendering

### API Routes Best Practices

1. **Use Route Handlers** (not Pages API routes):
   ```typescript
   // ✅ Correct: app/api/user/profile/route.ts
   export async function GET(request: Request) { }

   // ❌ Wrong: pages/api/user/profile.ts
   ```

2. **Return NextResponse** for proper headers and status:
   ```typescript
   import { NextResponse } from 'next/server';

   return NextResponse.json({ data }, { status: 200 });
   ```

3. **Handle Errors Consistently**:
   ```typescript
   try {
     // API logic
   } catch (error) {
     console.error('API Error:', error);
     return NextResponse.json(
       { error: 'Internal server error' },
       { status: 500 }
     );
   }
   ```

4. **Validate Requests Early**:
   ```typescript
   if (!request.body) {
     return NextResponse.json(
       { error: 'Request body required' },
       { status: 400 }
     );
   }
   ```

### Data Fetching Patterns

1. **Fetch in Server Components** when possible:
   ```typescript
   // Server Component - no loading state needed
   async function DashboardStats() {
     const stats = await fetchStats(); // Direct async fetch
     return <div>{stats.total}</div>;
   }
   ```

2. **Use Client-Side Fetch** for interactive features:
   ```typescript
   // Client Component - use useState/useEffect
   'use client'

   const [data, setData] = useState(null);
   useEffect(() => {
     fetch('/api/data').then(res => setData(res));
   }, []);
   ```

3. **Parallel Data Fetching**:
   ```typescript
   // Good - parallel requests
   const [routes, analysis] = await Promise.all([
     fetchRoutes(origin, destination),
     fetchAnalysis(params)
   ]);
   ```

### Performance Optimization

1. **Dynamic Imports** for heavy components:
   ```typescript
   const InteractiveMap = dynamic(
     () => import('@/components/InteractiveMap'),
     { ssr: false, loading: () => <LoadingSkeleton /> }
   );
   ```

2. **Loading States**: Every async operation should show loading UI
   - Use `loading.tsx` files for route-level loading
   - Use conditional rendering for component-level loading
   - Example: `RouteResults.tsx` shows `LoadingSkeleton` while fetching

3. **Error Boundaries**: Create `error.tsx` for route-level error handling

4. **Metadata**: Define metadata for SEO in page components:
   ```typescript
   export const metadata = {
     title: 'EcoTrack - Plan Trip',
     description: 'Plan sustainable travel routes'
   };
   ```

### Environment Variables

- Access via `process.env` in Server Components and API routes
- Use `lib/env.ts` wrapper for centralized access and validation
- Never expose server-only env vars to client (no NEXT_PUBLIC_ prefix for API keys)

## Mobile-Friendly Development

EcoTrack is designed to be fully responsive and mobile-friendly. Follow these guidelines:

### Responsive Design Principles

1. **Mobile-First Approach**: Start with mobile layout, then enhance for larger screens
   ```tsx
   // ✅ Mobile first
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

   // ❌ Desktop first
   <div className="grid grid-cols-4 md:grid-cols-2 sm:grid-cols-1">
   ```

2. **Tailwind Breakpoints** (in order):
   - `sm:` - 640px and up (large phones, portrait tablets)
   - `md:` - 768px and up (tablets, small laptops)
   - `lg:` - 1024px and up (laptops, desktops)
   - `xl:` - 1280px and up (large desktops)

3. **Common Responsive Patterns**:
   ```tsx
   // Stack on mobile, side-by-side on desktop
   <div className="flex flex-col md:flex-row gap-4">

   // Full width on mobile, constrained on desktop
   <div className="w-full max-w-5xl mx-auto px-4">

   // Hide on mobile, show on desktop
   <nav className="hidden md:flex">

   // Smaller text on mobile
   <h1 className="text-3xl md:text-5xl">
   ```

### Touch-Friendly Interactions

1. **Button and Link Sizes**: Minimum 44x44px touch target
   ```tsx
   // ✅ Good - adequate padding
   <button className="py-3 px-6">CLICK ME</button>

   // ❌ Bad - too small
   <button className="py-1 px-2">Click</button>
   ```

2. **Spacing**: Provide adequate spacing between interactive elements
   ```tsx
   <div className="space-y-4"> {/* Vertical spacing */}
   <div className="space-x-4"> {/* Horizontal spacing */}
   ```

3. **Hover States**: Use `hover:` classes, but ensure touch states work
   ```tsx
   <button className="hover:translate-x-1 active:translate-x-2">
   ```

### Mobile Navigation

- `components/Header.tsx` uses conditional rendering:
  - Mobile: Hidden navigation (`hidden md:flex`)
  - Desktop: Full navigation visible
  - **TODO**: Add mobile hamburger menu for better UX

### Forms and Inputs

1. **Input Types**: Use appropriate input types for mobile keyboards
   ```tsx
   <input type="email" />    {/* Shows email keyboard */}
   <input type="tel" />      {/* Shows number pad */}
   <input type="date" />     {/* Shows date picker */}
   ```

2. **Autocomplete Attributes**: Enable browser autofill
   ```tsx
   <input autoComplete="address-line1" />
   ```

3. **Input Sizing**: Full width on mobile, constrained on desktop
   ```tsx
   <input className="w-full md:w-auto" />
   ```

### Map Interactions

`components/InteractiveMap.tsx` handles mobile map interactions:
- Touch gestures for pan and zoom
- Tap to select routes
- Responsive height: `h-64 md:h-96`

### Image and Asset Optimization

When adding images:
1. **Use Next.js Image component**:
   ```tsx
   import Image from 'next/image';

   <Image
     src="/icon.png"
     alt="EcoTrack icon"
     width={64}
     height={64}
     priority // For above-fold images
   />
   ```

2. **Responsive Images**: Use `sizes` prop
   ```tsx
   <Image
     sizes="(max-width: 768px) 100vw, 50vw"
     // Mobile: full width, Desktop: half width
   />
   ```

### Performance on Mobile

1. **Loading States**: Essential for slower mobile connections
   - Show skeleton loaders while fetching (see `LoadingSkeleton` in `RouteResults.tsx`)
   - Disable buttons during loading to prevent double-submission

2. **Lazy Loading**: Defer loading heavy components
   ```tsx
   const InteractiveMap = dynamic(() => import('./InteractiveMap'), {
     loading: () => <div>Loading map...</div>,
     ssr: false // Map needs browser APIs
   });
   ```

3. **Minimize Bundle Size**:
   - Import only what you need: `import { useState } from 'react'` not `import React`
   - Check bundle size: `npm run build` shows size analysis

### Testing on Mobile

1. **Browser DevTools**: Test responsive breakpoints
   - Chrome: Device Toolbar (Cmd+Shift+M / Ctrl+Shift+M)
   - Test common devices: iPhone SE, iPhone 12/13, iPad, Galaxy S20

2. **Touch Testing**: Verify all interactions work with touch
   - Buttons should respond to tap
   - Forms should be easy to fill
   - No hover-only functionality

3. **Viewport Meta Tag**: Ensure `app/layout.tsx` includes:
   ```tsx
   <meta name="viewport" content="width=device-width, initial-scale=1" />
   ```

### Mobile-Specific Considerations

1. **Font Sizes**: Maintain readability
   - Minimum body text: 16px (prevents iOS zoom on focus)
   - Headings: Scale appropriately with `text-xl md:text-3xl`

2. **Contrast**: Neobrutalism design has high contrast (black on vibrant colors) - good for mobile visibility

3. **Network Conditions**: App handles slow connections
   - Shows loading states during API calls
   - Graceful error handling with retry options
   - Consider adding offline detection in future

4. **Geolocation**: `useGeolocation.ts` hook handles mobile GPS
   - Requests permission appropriately
   - Shows clear error messages if denied
   - Works on both iOS and Android

## Common Development Patterns

### Adding a New Transport Mode

1. Add enum value to `TransportMode` in `lib/types.ts`
2. Add emission factors to `CARBON_EMISSION_FACTORS` in `lib/services/carbonCalculationService.ts`
3. Update mode detection logic in `googleMapsService.ts` (`detectTransportMode()` function)
4. Add icon to `components/icons/TransportIcon.tsx`

### Handling API Errors

The app uses graceful degradation:
- Check for API key availability before making requests
- Provide default/fallback data when services are unavailable
- Display user-friendly warnings via status classes (`.status-warning`, `.status-error`)
- Never crash - show meaningful error messages instead

Example pattern:
```typescript
if (!env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. Using default analysis.");
  return defaultAnalysis;
}
```

### Validation

Use utility functions from `lib/utils.ts`:
- `isValidLocation()` - Validates location objects
- `isValidRouteOption()` - Validates complete routes
- `validateTripPlanningInput()` - Validates user inputs
- `sanitizeLocationInput()` - Cleans location strings

## File Organization

```
app/
├── api/              # API routes (Next.js API handlers)
├── auth/             # Authentication pages (signin, error)
├── dashboard/        # User dashboard (authenticated)
├── profile/          # User profile management (authenticated)
├── history/          # Travel history (authenticated)
├── page.tsx          # Home page with trip planner
├── layout.tsx        # Root layout with session provider
└── globals.css       # Global styles and neobrutalism classes

components/
├── Header.tsx        # Navigation with auth status
├── TripPlanner.tsx   # Main trip planning form
├── RouteResults.tsx  # Results display with AI insights
├── RouteCard.tsx     # Individual route display
├── InteractiveMap.tsx # Google Maps integration
├── LocationAutocomplete.tsx # Places autocomplete
├── TravelPreferences.tsx # User preference form
├── DateSelector.tsx  # Date picker
└── icons/           # Icon components

lib/
├── services/        # External service integrations
│   ├── geminiService.ts           # Primary orchestrator
│   ├── googleMapsService.ts       # Route fetching
│   ├── carbonCalculationService.ts # Emission calculations
│   └── firestoreService.ts        # Database operations
├── utils/          # Utility functions
│   └── serviceCheck.ts  # API availability checking
├── types.ts        # TypeScript type definitions
├── constants.ts    # App-wide constants
├── env.ts          # Environment variable access
└── utils.ts        # Validation and formatting utilities

hooks/
└── useGeolocation.ts # Browser geolocation hook
```

## Testing

Tests are located in `__tests__/` directory, mirroring the `app/api/` structure:
- `__tests__/api/routes/plan.test.ts`
- `__tests__/api/sustainability/analyze.test.ts`
- `__tests__/api/user/history.test.ts`
- `__tests__/api/user/analytics.test.ts`

Use Jest for testing. Configuration in `jest.config.js`.

## Important Notes

1. **Google Maps API Billing**: Route fetching can incur costs. The app makes 4 parallel requests per trip plan (driving, transit, walking, biking).

2. **Gemini AI Token Limits**: Long route data can hit token limits. The prompt in `geminiService.ts` is optimized but may need adjustment for very complex multi-modal routes.

3. **Carbon Factors**: Emission factors in `carbonCalculationService.ts` are based on industry averages. Update these as better data becomes available.

4. **Session Strategy**: Uses JWT strategy (not database sessions) for better performance. User data persists in Firestore via adapter.

5. **Middleware**: `middleware.ts` handles auth redirects and route protection.

6. **No UI Component Library**: The app intentionally avoids component libraries. All styling uses Tailwind CSS utility classes and custom neobrutalism classes defined in `globals.css`.
