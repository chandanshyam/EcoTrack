'use client'

import React, { useState, useCallback } from 'react';
import { TripPlanner } from '@/components/TripPlanner';
import { RouteResults } from '@/components/RouteResults';
import { planTripWithAI } from '@/lib/services/geminiService';
import { RouteOption, SustainabilityAnalysis, GeolocationCoords } from '@/lib/types';
import { TravelPreferencesData } from '@/components/TravelPreferences';
import Header from '@/components/Header';
export default function Home() {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [analysis, setAnalysis] = useState<SustainabilityAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handlePlanTrip = useCallback(async (
    origin: string, 
    destination: string, 
    userLocation?: GeolocationCoords,
    travelDate?: string,
    preferences?: TravelPreferencesData
  ) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setRoutes([]);
    setAnalysis(null);

    try {
      // For now, we'll pass the additional parameters but the service may not use them yet
      // This allows for future enhancement of the planTripWithAI function
      const { routes: fetchedRoutes, analysis: aiAnalysis } = await planTripWithAI(
        origin, 
        destination, 
        userLocation,
        travelDate,
        preferences
      );
      
      if (fetchedRoutes && fetchedRoutes.length > 0) {
        setRoutes(fetchedRoutes);
        setAnalysis(aiAnalysis);
      } else {
        setError("No sustainable routes could be found for this trip.");
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      
      if (errorMessage.includes("API key")) {
        setError("Service configuration error. Please check that all required API keys are set up correctly.");
      } else {
        setError("An unexpected error occurred while planning your trip. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-neo-white">
      <Header />
      <div className="container-brutal">
        <main>
          {/* Trip Planner Section */}
          <div className="mb-12">
            <TripPlanner onPlanTrip={handlePlanTrip} isLoading={isLoading} />
          </div>
          
          {/* Results Section */}
          <RouteResults 
            routes={routes} 
            analysis={analysis}
            isLoading={isLoading} 
            error={error}
            hasSearched={hasSearched}
          />
        </main>
        
        {/* NeoBrutalism Footer */}
        <footer className="text-center mt-16">
          <div className="divider-brutal"></div>
          <div className="card-teal inline-block px-8 py-4">
            <p className="text-brutal text-lg">
              &copy; {new Date().getFullYear()} ECOTRACK - TRAVEL SMARTER, LIVE GREENER
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}