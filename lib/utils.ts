import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { TransportMode, type Location, type UserPreferences, type TransportSegment, type RouteOption } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCarbonFootprint(kg: number): string {
  if (kg < 1) {
    return `${Math.round(kg * 1000)}g CO₂e`
  }
  return `${kg.toFixed(1)}kg CO₂e`
}

// Validation functions for user inputs and data models

export function isValidLocation(location: any): location is Location {
  return (
    typeof location === 'object' &&
    location !== null &&
    typeof location.address === 'string' &&
    location.address.trim().length > 0 &&
    typeof location.coordinates === 'object' &&
    location.coordinates !== null &&
    typeof location.coordinates.lat === 'number' &&
    typeof location.coordinates.lng === 'number' &&
    location.coordinates.lat >= -90 &&
    location.coordinates.lat <= 90 &&
    location.coordinates.lng >= -180 &&
    location.coordinates.lng <= 180
  )
}

export function isValidTransportMode(mode: any): mode is TransportMode {
  return Object.values(TransportMode).includes(mode)
}

export function isValidTransportSegment(segment: any): segment is TransportSegment {
  return (
    typeof segment === 'object' &&
    segment !== null &&
    isValidTransportMode(segment.mode) &&
    typeof segment.duration === 'number' &&
    segment.duration >= 0 &&
    typeof segment.distance === 'number' &&
    segment.distance >= 0 &&
    typeof segment.carbonEmission === 'number' &&
    segment.carbonEmission >= 0 &&
    typeof segment.cost === 'number' &&
    segment.cost >= 0 &&
    (segment.provider === undefined || typeof segment.provider === 'string')
  )
}

export function isValidSustainabilityScore(score: any): score is number {
  return typeof score === 'number' && score >= 0 && score <= 100
}

export function isValidRouteOption(route: any): route is RouteOption {
  return (
    typeof route === 'object' &&
    route !== null &&
    typeof route.id === 'string' &&
    route.id.trim().length > 0 &&
    typeof route.name === 'string' &&
    route.name.trim().length > 0 &&
    isValidLocation(route.origin) &&
    isValidLocation(route.destination) &&
    Array.isArray(route.transportModes) &&
    route.transportModes.length > 0 &&
    route.transportModes.every(isValidTransportSegment) &&
    typeof route.totalDuration === 'number' &&
    route.totalDuration >= 0 &&
    typeof route.totalDistance === 'number' &&
    route.totalDistance >= 0 &&
    typeof route.totalCost === 'number' &&
    route.totalCost >= 0 &&
    typeof route.totalCarbonFootprint === 'number' &&
    route.totalCarbonFootprint >= 0 &&
    isValidSustainabilityScore(route.sustainabilityScore)
  )
}

export function isValidUserPreferences(preferences: any): preferences is UserPreferences {
  return (
    typeof preferences === 'object' &&
    preferences !== null &&
    typeof preferences.prioritizeSustainability === 'boolean' &&
    (preferences.maxTravelTime === undefined || 
     (typeof preferences.maxTravelTime === 'number' && preferences.maxTravelTime > 0)) &&
    (preferences.budgetLimit === undefined || 
     (typeof preferences.budgetLimit === 'number' && preferences.budgetLimit > 0)) &&
    Array.isArray(preferences.preferredTransportModes) &&
    preferences.preferredTransportModes.every(isValidTransportMode)
  )
}

export function validateTripPlanningInput(input: {
  origin?: string;
  destination?: string;
  travelDate?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!input.origin || typeof input.origin !== 'string' || input.origin.trim().length === 0) {
    errors.push('Origin location is required and must be a non-empty string')
  }

  if (!input.destination || typeof input.destination !== 'string' || input.destination.trim().length === 0) {
    errors.push('Destination location is required and must be a non-empty string')
  }

  if (input.travelDate) {
    const date = new Date(input.travelDate)
    if (isNaN(date.getTime())) {
      errors.push('Travel date must be a valid date')
    } else if (date < new Date()) {
      errors.push('Travel date cannot be in the past')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function sanitizeLocationInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}