'use client'

import React, { useState } from 'react';
import { GeolocationCoords, TransportMode } from '@/lib/types';
import { LocationAutocomplete } from './LocationAutocomplete';
import { DateSelector } from './DateSelector';
import { TravelPreferences, TravelPreferencesData } from './TravelPreferences';
import { useGeolocation } from '../hooks/useGeolocation';

interface TripPlannerProps {
  onPlanTrip: (
    origin: string, 
    destination: string, 
    userLocation?: GeolocationCoords,
    travelDate?: string,
    preferences?: TravelPreferencesData
  ) => void;
  isLoading: boolean;
}

export const TripPlanner: React.FC<TripPlannerProps> = ({ onPlanTrip, isLoading }) => {
  const [origin, setOrigin] = useState('New York, NY');
  const [destination, setDestination] = useState('Boston, MA');
  const [travelDate, setTravelDate] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<TravelPreferencesData>({
    prioritizeSustainability: true,
    maxTravelTime: undefined,
    budgetLimit: undefined,
    preferredTransportModes: [TransportMode.CAR, TransportMode.TRAIN, TransportMode.BUS, TransportMode.PLANE]
  });

  const { 
    coordinates: userLocation, 
    error: locationError, 
    isLoading: isLocating, 
    getCurrentPosition,
    clearError: clearLocationError
  } = useGeolocation();

  const handleUseMyLocation = async () => {
    clearLocationError();
    const coords = await getCurrentPosition();
    if (coords) {
      setOrigin('My Current Location');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (origin && destination) {
      onPlanTrip(
        origin, 
        destination, 
        origin === 'My Current Location' ? userLocation || undefined : undefined,
        travelDate || undefined,
        preferences
      );
    }
  };

  const handleOriginLocationSelect = (location: { address: string; coordinates?: { lat: number; lng: number } }) => {
    // Handle location selection if needed for future enhancements
  };

  const handleDestinationLocationSelect = (location: { address: string; coordinates?: { lat: number; lng: number } }) => {
    // Handle location selection if needed for future enhancements
  };

  return (
    <div className="card-brutal w-full max-w-5xl mx-auto p-4">
      <div className="mb-4">
        <h2 className="heading-brutal text-xl mb-2">PLAN YOUR TRIP</h2>
        <div className="card-cyan inline-block px-3 py-1">
          <p className="text-brutal text-sm">FIND THE MOST SUSTAINABLE ROUTE</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Origin Input with Autocomplete */}
          <div className="relative">
            <LocationAutocomplete
              id="origin"
              label="FROM WHERE?"
              value={origin}
              onChange={setOrigin}
              placeholder="NEW YORK, NY"
              disabled={isLoading}
              onLocationSelect={handleOriginLocationSelect}
            />
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isLocating || isLoading}
              className="absolute right-1 top-[34px] p-2 bg-neo-white hover:bg-neo-yellow border-3 border-neo-black disabled:opacity-50 z-10 transition-all duration-200 shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              aria-label="Use my current location"
              title="Use my current location"
            >
              {isLocating ? (
                <svg className="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>

          {/* Destination Input with Autocomplete */}
          <LocationAutocomplete
            id="destination"
            label="TO WHERE?"
            value={destination}
            onChange={setDestination}
            placeholder="BOSTON, MA"
            disabled={isLoading}
            onLocationSelect={handleDestinationLocationSelect}
          />
        </div>

        {/* Location Error Display */}
        {locationError && (
          <div className="status-error p-2 rounded-none text-sm">
            <div className="flex items-center justify-between">
              <span>{locationError.userFriendlyMessage}</span>
              <button
                type="button"
                onClick={clearLocationError}
                className="ml-2 text-neo-white hover:text-neo-yellow"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Date Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateSelector
            id="travelDate"
            label="TRAVEL DATE"
            value={travelDate}
            onChange={setTravelDate}
            disabled={isLoading}
          />

          {/* Preferences Toggle */}
          <div>
            <label className="block text-brutal text-sm mb-2 uppercase">
              PREFERENCES
            </label>
            <button
              type="button"
              onClick={() => setShowPreferences(!showPreferences)}
              disabled={isLoading}
              className={`btn-secondary w-full py-2 text-sm ${showPreferences ? 'bg-neo-pink' : ''}`}
            >
              {showPreferences ? 'HIDE PREFERENCES' : 'SHOW PREFERENCES'}
            </button>
          </div>
        </div>

        {/* Travel Preferences */}
        {showPreferences && (
          <TravelPreferences
            preferences={preferences}
            onChange={setPreferences}
            disabled={isLoading}
          />
        )}

        {/* Submit Button */}
        <div className="text-center">
          <button
            type="submit"
            disabled={isLoading || isLocating}
            className={`btn-primary text-lg px-8 py-3 ${isLoading || isLocating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <svg className="w-5 h-5 animate-spin" fill="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>ANALYZING...</span>
              </span>
            ) : (
              'PLAN MY TRIP'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};