'use client'

import React, { useState, useCallback } from 'react';
import { TripPlanner } from '@/components/TripPlanner';
import { RouteResults } from '@/components/RouteResults';
import { RouteOption, SustainabilityAnalysis, GeolocationCoords } from '@/lib/types';
import { TravelPreferencesData } from '@/components/TravelPreferences';
import Header from '@/components/Header';
import { RouteErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { handleError, logError, AppError } from '@/lib/utils/errorHandling';
import { logger, analytics } from '@/lib/utils/logging';
export default function Home() {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [analysis, setAnalysis] = useState<SustainabilityAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
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

    // Log user action
    analytics.trackUserAction('plan_trip', 'trip_planner', {
      origin,
      destination,
      hasUserLocation: !!userLocation,
      hasTravelDate: !!travelDate,
      hasPreferences: !!preferences
    });

    logger.info('Trip planning started', 'trip-planner', {
      origin,
      destination,
      userLocation: userLocation ? 'provided' : 'not_provided',
      travelDate,
      preferences
    });

    try {
      // Call API route instead of service directly to keep API keys secure
      const response = await fetch('/api/routes/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin,
          destination,
          userLocation,
          travelDate,
          preferences,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to plan trip');
      }

      const { routes: fetchedRoutes, analysis: aiAnalysis } = await response.json();

      if (fetchedRoutes && fetchedRoutes.length > 0) {
        setRoutes(fetchedRoutes);
        setAnalysis(aiAnalysis);

        logger.info('Trip planning successful', 'trip-planner', {
          routeCount: fetchedRoutes.length,
          hasAnalysis: !!aiAnalysis
        });

        analytics.track('trip_planned_success', {
          routeCount: fetchedRoutes.length,
          origin,
          destination
        });
      } else {
        const noRoutesError = handleError(new Error("No routes found"), 'trip-planning');
        setError(noRoutesError);
        logError(noRoutesError, 'trip-planning-no-results');

        analytics.track('trip_planned_no_routes', {
          origin,
          destination
        });
      }
    } catch (err) {
      const appError = handleError(err, 'trip-planning');
      setError(appError);
      logError(appError, 'trip-planning-main');
      
      analytics.trackError(
        err instanceof Error ? err : new Error(String(err)),
        'trip-planning'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    // The user can retry by clicking the plan trip button again
  }, []);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-neo-white">
      <Header />
      <div className="container-brutal">
        <main>
          {/* Trip Planner Section */}
          <RouteErrorBoundary>
            <div className="mb-12">
              <TripPlanner onPlanTrip={handlePlanTrip} isLoading={isLoading} />
            </div>
          </RouteErrorBoundary>
          
          {/* Error Display */}
          {error && (
            <ErrorDisplay
              error={error}
              onRetry={error.retryable ? handleRetry : undefined}
              onDismiss={handleDismissError}
              className="mb-6"
            />
          )}
          
          {/* Results Section */}
          <RouteErrorBoundary>
            <RouteResults 
              routes={routes} 
              analysis={analysis}
              isLoading={isLoading} 
              error={error ? error.userMessage : null}
              hasSearched={hasSearched}
            />
          </RouteErrorBoundary>
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