'use client'

import React, { useState, useCallback } from 'react';
import { TripPlanner } from '@/components/TripPlanner';
import { RouteResults } from '@/components/RouteResults';
import { planTripWithAI } from '@/lib/services/geminiService';
import { RouteOption, SustainabilityAnalysis, GeolocationCoords } from '@/lib/types';
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
    userLocation?: GeolocationCoords
  ) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setRoutes([]);
    setAnalysis(null);

    try {
      const { routes: fetchedRoutes, analysis: aiAnalysis } = await planTripWithAI(origin, destination, userLocation);
      
      if (fetchedRoutes && fetchedRoutes.length > 0) {
        setRoutes(fetchedRoutes);
        setAnalysis(aiAnalysis);
      } else {
        setError("No sustainable routes could be found for this trip.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred while planning your trip. The AI may be busy or the request could not be completed. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="text-carbon-gray-900 font-sans p-4 sm:p-6 lg:p-8">
        <main className="container mx-auto">
          <header className="text-center mb-8">
            <div className="inline-block bg-white border-2 border-carbon-gray-900 p-3 rounded-md shadow-lg mb-4">
              <svg className="w-12 h-12 text-eco-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-carbon-gray-900">EcoTrack</h1>
            <p className="mt-2 text-lg text-carbon-gray-700">Your AI-Powered Sustainable Travel Planner</p>
          </header>
          
          <TripPlanner onPlanTrip={handlePlanTrip} isLoading={isLoading} />
          
          <RouteResults 
            routes={routes} 
            analysis={analysis}
            isLoading={isLoading} 
            error={error}
            hasSearched={hasSearched}
          />
        </main>
        
        <footer className="text-center mt-12 text-carbon-gray-600 text-sm">
          <p>&copy; {new Date().getFullYear()} EcoTrack. Travel Smarter, Live Greener.</p>
        </footer>
      </div>
    </div>
  );
}