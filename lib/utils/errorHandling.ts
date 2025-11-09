/**
 * Comprehensive error handling utilities for EcoTrack
 */

export type AppError = {
  code: string;
  message: string;
  userMessage: string;
  details?: any;
  timestamp: string;
  retryable: boolean;
}

export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  
  // External service errors
  GOOGLE_MAPS_ERROR = 'GOOGLE_MAPS_ERROR',
  GEMINI_AI_ERROR = 'GEMINI_AI_ERROR',
  FIRESTORE_ERROR = 'FIRESTORE_ERROR',
  
  // User input errors
  INVALID_LOCATION = 'INVALID_LOCATION',
  INVALID_DATE = 'INVALID_DATE',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Authentication errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  
  // Route planning errors
  NO_ROUTES_FOUND = 'NO_ROUTES_FOUND',
  ROUTE_CALCULATION_FAILED = 'ROUTE_CALCULATION_FAILED',
  
  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  SERVER_ERROR = 'SERVER_ERROR'
}

const ERROR_MESSAGES: Record<ErrorCode, { message: string; userMessage: string; retryable: boolean }> = {
  [ErrorCode.NETWORK_ERROR]: {
    message: 'Network connection failed',
    userMessage: 'CONNECTION PROBLEM. CHECK YOUR INTERNET AND TRY AGAIN.',
    retryable: true
  },
  [ErrorCode.API_TIMEOUT]: {
    message: 'API request timed out',
    userMessage: 'REQUEST TIMED OUT. PLEASE TRY AGAIN.',
    retryable: true
  },
  [ErrorCode.API_RATE_LIMIT]: {
    message: 'API rate limit exceeded',
    userMessage: 'TOO MANY REQUESTS. PLEASE WAIT A MOMENT AND TRY AGAIN.',
    retryable: true
  },
  [ErrorCode.GOOGLE_MAPS_ERROR]: {
    message: 'Google Maps service error',
    userMessage: 'MAP SERVICE TEMPORARILY UNAVAILABLE. TRYING BACKUP DATA.',
    retryable: true
  },
  [ErrorCode.GEMINI_AI_ERROR]: {
    message: 'AI analysis service error',
    userMessage: 'AI ANALYSIS UNAVAILABLE. SHOWING BASIC ROUTE INFO.',
    retryable: true
  },
  [ErrorCode.FIRESTORE_ERROR]: {
    message: 'Database connection error',
    userMessage: 'DATA SERVICE TEMPORARILY UNAVAILABLE. PLEASE TRY AGAIN.',
    retryable: true
  },
  [ErrorCode.INVALID_LOCATION]: {
    message: 'Invalid location provided',
    userMessage: 'LOCATION NOT FOUND. PLEASE CHECK YOUR INPUT.',
    retryable: false
  },
  [ErrorCode.INVALID_DATE]: {
    message: 'Invalid date provided',
    userMessage: 'INVALID DATE. PLEASE SELECT A VALID DATE.',
    retryable: false
  },
  [ErrorCode.MISSING_REQUIRED_FIELD]: {
    message: 'Required field missing',
    userMessage: 'PLEASE FILL IN ALL REQUIRED FIELDS.',
    retryable: false
  },
  [ErrorCode.AUTH_REQUIRED]: {
    message: 'Authentication required',
    userMessage: 'PLEASE SIGN IN TO CONTINUE.',
    retryable: false
  },
  [ErrorCode.AUTH_EXPIRED]: {
    message: 'Authentication expired',
    userMessage: 'SESSION EXPIRED. PLEASE SIGN IN AGAIN.',
    retryable: false
  },
  [ErrorCode.NO_ROUTES_FOUND]: {
    message: 'No routes found for the given locations',
    userMessage: 'NO ROUTES FOUND. TRY DIFFERENT LOCATIONS OR TRANSPORT MODES.',
    retryable: false
  },
  [ErrorCode.ROUTE_CALCULATION_FAILED]: {
    message: 'Route calculation failed',
    userMessage: 'UNABLE TO CALCULATE ROUTES. PLEASE TRY AGAIN.',
    retryable: true
  },
  [ErrorCode.UNKNOWN_ERROR]: {
    message: 'Unknown error occurred',
    userMessage: 'SOMETHING WENT WRONG. PLEASE TRY AGAIN.',
    retryable: true
  },
  [ErrorCode.SERVER_ERROR]: {
    message: 'Internal server error',
    userMessage: 'SERVER ERROR. PLEASE TRY AGAIN LATER.',
    retryable: true
  }
};

/**
 * Create a standardized AppError
 */
export function createAppError(
  code: ErrorCode,
  originalError?: Error | any,
  details?: any
): AppError {
  const errorInfo = ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR];
  
  return {
    code,
    message: originalError?.message || errorInfo.message,
    userMessage: errorInfo.userMessage,
    details: details || originalError,
    timestamp: new Date().toISOString(),
    retryable: errorInfo.retryable
  };
}

/**
 * Handle and classify different types of errors
 */
export function handleError(error: any, context?: string): AppError {
  console.error(`Error in ${context || 'unknown context'}:`, error);

  // Network errors
  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
    return createAppError(ErrorCode.NETWORK_ERROR, error);
  }

  // Timeout errors
  if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
    return createAppError(ErrorCode.API_TIMEOUT, error);
  }

  // Rate limiting
  if (error?.status === 429 || error?.message?.includes('rate limit')) {
    return createAppError(ErrorCode.API_RATE_LIMIT, error);
  }

  // Google Maps specific errors
  if (error?.message?.includes('Google Maps') || error?.message?.includes('OVER_QUERY_LIMIT')) {
    return createAppError(ErrorCode.GOOGLE_MAPS_ERROR, error);
  }

  // Gemini AI specific errors
  if (error?.message?.includes('Gemini') || error?.message?.includes('AI model')) {
    return createAppError(ErrorCode.GEMINI_AI_ERROR, error);
  }

  // Firestore specific errors
  if (error?.code?.startsWith('firestore/') || error?.message?.includes('Firestore')) {
    return createAppError(ErrorCode.FIRESTORE_ERROR, error);
  }

  // Authentication errors
  if (error?.status === 401 || error?.message?.includes('unauthorized')) {
    return createAppError(ErrorCode.AUTH_REQUIRED, error);
  }

  if (error?.status === 403 || error?.message?.includes('forbidden')) {
    return createAppError(ErrorCode.AUTH_EXPIRED, error);
  }

  // Validation errors
  if (error?.status === 400) {
    if (error?.message?.includes('location')) {
      return createAppError(ErrorCode.INVALID_LOCATION, error);
    }
    if (error?.message?.includes('date')) {
      return createAppError(ErrorCode.INVALID_DATE, error);
    }
    return createAppError(ErrorCode.MISSING_REQUIRED_FIELD, error);
  }

  // Server errors
  if (error?.status >= 500) {
    return createAppError(ErrorCode.SERVER_ERROR, error);
  }

  // Default to unknown error
  return createAppError(ErrorCode.UNKNOWN_ERROR, error);
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }

      // Check if error is retryable
      const appError = handleError(error);
      if (!appError.retryable) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Fallback data for when external services fail
 */
export const FALLBACK_DATA = {
  routes: {
    mockRoute: {
      id: 'fallback-route',
      name: 'Estimated Route',
      totalDuration: 60, // 1 hour
      totalDistance: 50, // 50 km
      totalCost: 25, // $25
      totalCarbonFootprint: 10.5, // 10.5 kg CO2e
      sustainabilityScore: 45,
      transportModes: [{
        mode: 'car' as const,
        duration: 60,
        distance: 50,
        carbonEmission: 10.5,
        cost: 25
      }]
    }
  },
  locations: {
    'new york': { address: 'New York, NY, USA', coordinates: { lat: 40.7127753, lng: -74.0059728 } },
    'boston': { address: 'Boston, MA, USA', coordinates: { lat: 42.3600825, lng: -71.0588801 } },
    'san francisco': { address: 'San Francisco, CA, USA', coordinates: { lat: 37.7749295, lng: -122.4194155 } },
    'los angeles': { address: 'Los Angeles, CA, USA', coordinates: { lat: 34.0522265, lng: -118.2436596 } },
    'chicago': { address: 'Chicago, IL, USA', coordinates: { lat: 41.8781136, lng: -87.6297982 } }
  }
};

/**
 * Get fallback route data when route calculation fails
 */
export function getFallbackRoute(origin: string, destination: string) {
  const fallbackRoute = { ...FALLBACK_DATA.routes.mockRoute };
  
  // Customize based on known locations
  const originKey = origin.toLowerCase();
  const destKey = destination.toLowerCase();
  
  if (FALLBACK_DATA.locations[originKey as keyof typeof FALLBACK_DATA.locations] && FALLBACK_DATA.locations[destKey as keyof typeof FALLBACK_DATA.locations]) {
    // Calculate approximate distance for known locations
    const originCoords = FALLBACK_DATA.locations[originKey as keyof typeof FALLBACK_DATA.locations].coordinates;
    const destCoords = FALLBACK_DATA.locations[destKey as keyof typeof FALLBACK_DATA.locations].coordinates;
    
    const distance = calculateDistance(originCoords, destCoords);
    fallbackRoute.totalDistance = distance;
    fallbackRoute.totalDuration = distance / 60 * 60; // Assume 60 km/h average
    fallbackRoute.totalCost = distance * 0.56; // $0.56 per km
    fallbackRoute.totalCarbonFootprint = distance * 0.21; // 0.21 kg CO2e per km
  }
  
  return fallbackRoute;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Log errors for monitoring (in production, this would send to a monitoring service)
 */
export function logError(error: AppError, context?: string) {
  const logData = {
    ...error,
    context,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'server'
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', logData);
  }

  // In production, this would send to a monitoring service like Sentry, LogRocket, etc.
  // Example: Sentry.captureException(error, { extra: logData });
}