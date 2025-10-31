'use client'

import { useState, useCallback } from 'react';
import { GeolocationCoords } from '@/lib/types';

export interface GeolocationError {
  code: number;
  message: string;
  userFriendlyMessage: string;
}

export interface GeolocationState {
  coordinates: GeolocationCoords | null;
  error: GeolocationError | null;
  isLoading: boolean;
  isSupported: boolean;
}

const GEOLOCATION_ERRORS: Record<number, { message: string; userFriendlyMessage: string }> = {
  1: { // PERMISSION_DENIED
    message: 'User denied the request for Geolocation.',
    userFriendlyMessage: 'LOCATION ACCESS DENIED. PLEASE ENABLE LOCATION SERVICES AND TRY AGAIN.'
  },
  2: { // POSITION_UNAVAILABLE
    message: 'Location information is unavailable.',
    userFriendlyMessage: 'LOCATION UNAVAILABLE. CHECK YOUR GPS CONNECTION AND TRY AGAIN.'
  },
  3: { // TIMEOUT
    message: 'The request to get user location timed out.',
    userFriendlyMessage: 'LOCATION REQUEST TIMED OUT. PLEASE TRY AGAIN.'
  }
};

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    error: null,
    isLoading: false,
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator
  });

  const getCurrentPosition = useCallback(async (): Promise<GeolocationCoords | null> => {
    // Check if geolocation is supported
    if (!state.isSupported) {
      const error: GeolocationError = {
        code: -1,
        message: 'Geolocation is not supported by this browser.',
        userFriendlyMessage: 'LOCATION SERVICES NOT SUPPORTED BY YOUR BROWSER.'
      };
      setState(prev => ({ ...prev, error, isLoading: false }));
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    return new Promise((resolve) => {
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 300000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates: GeolocationCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          
          setState(prev => ({
            ...prev,
            coordinates,
            error: null,
            isLoading: false
          }));
          
          resolve(coordinates);
        },
        (error) => {
          const geolocationError: GeolocationError = {
            code: error.code,
            message: error.message,
            userFriendlyMessage: GEOLOCATION_ERRORS[error.code]?.userFriendlyMessage || 
              'UNABLE TO GET YOUR LOCATION. PLEASE TRY AGAIN.'
          };
          
          setState(prev => ({
            ...prev,
            error: geolocationError,
            isLoading: false
          }));
          
          resolve(null);
        },
        options
      );
    });
  }, [state.isSupported]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      coordinates: null,
      error: null,
      isLoading: false
    }));
  }, []);

  return {
    ...state,
    getCurrentPosition,
    clearError,
    reset
  };
};