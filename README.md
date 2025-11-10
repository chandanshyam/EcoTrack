# EcoTrack - AI-Powered Sustainable Travel Planner

[![Next.js](https://img.shields.io/badge/Next.js-14+-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

EcoTrack is a Next.js-based web application that helps users plan eco-friendly trips by analyzing and suggesting routes and transport modes with minimal carbon footprint. The system leverages Google Gemini AI for sustainability analysis and integrates with Google Maps for comprehensive route planning.

**🌍 Live Demo:** [EcoTrack on Cloud Run](https://ecotrack-1099051481130.us-central1.run.app)

## ✨ Features

- 🌱 **AI-Powered Route Planning** - Gemini AI analyzes transport options for sustainability
- 📊 **Carbon Footprint Tracking** - Real-time emissions calculations with comparison to car travel
- 💰 **Fare Information** - Actual transit ticket prices and cost comparisons
- 📈 **Travel Analytics Dashboard** - Comprehensive metrics, trends, and insights
- 🎯 **AI-Generated Sustainability Targets** - Monthly and yearly goals based on your travel patterns
- 📱 **Responsive Neobrutalism Design** - Bold, accessible UI that works on all devices
- 🔐 **Secure Authentication** - Google OAuth with NextAuth.js
- 🚗 **Multi-Modal Transport** - Car, train, bus, plane, bike, walking combinations
- 🗺️ **Interactive Maps** - Route visualization with clickable polylines
- 📜 **Travel History** - Save and track your completed trips
- 🔄 **Real-Time Updates** - Dashboard metrics update instantly when trips are saved

## 🛠️ Tech Stack

- **Frontend**: React 18 with Next.js 14+ (App Router)
- **Backend**: Next.js API Routes (serverless)
- **AI/ML**: Google Gemini API for sustainability analysis
- **Maps & Routing**: Google Maps API (Routes, Places, Geocoding)
- **Database**: Cloud Firestore
- **Authentication**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS with custom Neobrutalism design system
- **TypeScript**: Full type safety across the stack
- **Testing**: Jest with React Testing Library
- **Deployment**: Google Cloud Run with CI/CD
- **Secret Management**: Google Secret Manager

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

## 🚀 Deployment

EcoTrack is designed to be deployed on Google Cloud Run with full CI/CD automation.

### Quick Deploy

```bash
# Using the deployment script
./scripts/deploy.sh
```

### Automated Deployment

Push to `main` branch to trigger automatic deployment via:
- ✅ GitHub Actions
- ✅ Google Cloud Build

For detailed deployment instructions, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**

### Security

**⚠️ IMPORTANT:** Never commit API keys to the repository!

- All secrets are managed via Google Secret Manager
- API keys must have proper restrictions configured

### 🌍 Real Transit Data Integration

EcoTrack supports real-time bus/train routing powered by OpenTripPlanner APIs.

**To enable:**
1. Set `OTP_BASE_URL` in `.env.local`:
```bash
OTP_BASE_URL=https://your-otp-instance/otp/routers/default
```

2. Run `npm run dev` and use the Transit API:
```bash
curl -X POST http://localhost:3001/api/routes/transit \
  -H "Content-Type: application/json" \
  -d '{
    "from": "40.7128,-74.0060",
    "to": "40.7580,-73.9855"
  }'
```

For detailed setup instructions, see [`docs/transit-integration.md`](./docs/transit-integration.md).

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

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Test Coverage:**
- ✅ 38 passing tests
- API route testing
- Component testing
- Integration testing

## 🎨 Design System

EcoTrack uses a custom **Neobrutalism** design system:

- Bold, flat colors with black borders
- 8px offset shadows (`shadow-brutal`)
- All-caps typography
- High contrast for accessibility
- Mobile-first responsive design

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide for Google Cloud Run
system documentation

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run test suite
- `npm run type-check` - Run TypeScript type checking

## 🐛 Troubleshooting

### Common Issues

1. **UI disappears on load**
   - Cause: Missing API keys
   - Solution: Check browser console for errors, verify `.env.local` has all required variables

2. **"Google Maps API key is required"**
   - Cause: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` not set
   - Solution: Set in `.env.local` for development or Secret Manager for production

3. **Authentication issues**
   - Cause: OAuth credentials not configured
   - Solution: Verify `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_SECRET`
   - Ensure redirect URIs include your domain in Google Cloud Console

4. **No routes found**
   - Cause: Google Maps APIs not enabled or billing not set up
   - Solution: Enable required APIs in Google Cloud Console and set up billing

5. **Build fails with type errors**
   - Cause: TypeScript errors in code
   - Solution: Run `npm run type-check` to identify issues

6. **Tests failing**
   - Cause: API mocks not properly configured
   - Solution: Check `jest.setup.js` has all required environment variables

### Service Status

The app includes built-in service status checking at `/api/health`. Missing configurations will show warnings in the UI rather than crashing.

### Debug Mode

```bash
# Run with debug logging
DEBUG=* npm run dev
```

## 📊 Performance

- **Lighthouse Score:** 95+ (Performance, Accessibility, Best Practices, SEO)
- **Core Web Vitals:** Optimized
- **Bundle Size:** < 500KB (gzipped)
- **Time to Interactive:** < 3s

## 🔒 Security Features

- ✅ API keys stored in Google Secret Manager (production)
- ✅ Environment variables never committed to git
- ✅ API key restrictions configured (HTTP referrers, API limits)
- ✅ Secure authentication with NextAuth.js
- ✅ HTTPS only in production
- ✅ Content Security Policy headers
- ✅ Regular dependency updates

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow the existing code style
   - Add tests for new features
   - Update documentation as needed
4. **Run tests and linting**
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```
5. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
   Follow [Conventional Commits](https://www.conventionalcommits.org/)
6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines

- Use TypeScript for all new code
- Follow the Neobrutalism design system
- Write tests for new features
- Keep components small and focused
- Use meaningful variable names
- Comment complex logic
- Update documentation

## 🙏 Acknowledgments

- Google Gemini AI for sustainability analysis
- Google Maps Platform for routing data
- Next.js team for the amazing framework
- Open source community for inspiration

## 📧 Contact

- **Issues:** [GitHub Issues](https://github.com/your-username/ecotrack/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-username/ecotrack/discussions)
- **Email:** your-email@example.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ and ☕ for a sustainable future 🌍**
