import { env } from '@/lib/env';

export interface ServiceStatus {
  googleMaps: boolean;
  gemini: boolean;
  firebase: boolean;
  auth: boolean;
}

export function checkServiceAvailability(): ServiceStatus {
  return {
    googleMaps: !!env.GOOGLE_MAPS_API_KEY,
    gemini: !!env.GEMINI_API_KEY,
    firebase: !!(env.FIREBASE_PROJECT_ID && env.FIREBASE_PRIVATE_KEY && env.FIREBASE_CLIENT_EMAIL),
    auth: !!(env.NEXTAUTH_SECRET && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
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