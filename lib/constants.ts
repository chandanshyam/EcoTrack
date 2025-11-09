// Basic carbon emission factors (kg CO2e per km) - for backward compatibility
// For detailed calculations, use CarbonCalculationService
export const CARBON_EMISSION_FACTORS = {
  car: 0.21,
  train: 0.041,
  bus: 0.089,
  plane: 0.255,
  bike: 0,
  metro: 0.028,
} as const

// Transport mode display names
export const TRANSPORT_MODE_NAMES = {
  car: 'Car',
  train: 'Train',
  bus: 'Bus',
  plane: 'Plane',
  bike: 'Bicycle',
  metro: 'Metro/Subway',
} as const

// API endpoints
export const API_ENDPOINTS = {
  ROUTES_PLAN: '/api/routes/plan',
  SUSTAINABILITY_ANALYZE: '/api/sustainability/analyze',
  USER_HISTORY: '/api/user/history',
  HEALTH: '/api/health',
} as const