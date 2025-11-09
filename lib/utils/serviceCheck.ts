export interface ServiceStatus {
  googleMaps: boolean;
  gemini: boolean;
  firebase: boolean;
  auth: boolean;
}

export function checkServiceAvailability(): ServiceStatus {
  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  return {
    googleMaps: !!googleMapsKey,
    gemini: !!geminiKey,
    firebase: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL),
    auth: !!(process.env.NEXTAUTH_SECRET && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  };
}

export function getServiceStatusMessage(services: ServiceStatus): string {
  const missing = [];
  
  if (!services.googleMaps) missing.push('Google Maps API');
  if (!services.gemini) missing.push('Gemini AI');
  if (!services.firebase) missing.push('Firebase');
  if (!services.auth) missing.push('Authentication');
  
  if (missing.length === 0) {
    return 'All services are configured and ready.';
  }
  
  return `Missing configuration for: ${missing.join(', ')}. Some features may not work properly.`;
}

export function canPlanTrips(services: ServiceStatus): boolean {
  return services.googleMaps && services.gemini;
}