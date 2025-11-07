import React, { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { RouteOption, SustainabilityAnalysis, TransportMode } from '@/lib/types';
import { RouteCard } from '@/components/RouteCard';
import { InteractiveMap } from '@/components/InteractiveMap';
import { FilterControls, FilterOptions, SortOption } from '@/components/FilterControls';
import { ToastContainer, ToastType } from '@/components/Toast';

type RouteResultsProps = {
  routes: RouteOption[];
  analysis: SustainabilityAnalysis | null;
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="card-yellow h-32 w-full bounce-brutal"></div>
    <div className="card-pink h-48 w-full bounce-brutal" style={{ animationDelay: '0.2s' }}></div>
    <div className="card-cyan h-48 w-full bounce-brutal" style={{ animationDelay: '0.4s' }}></div>
  </div>
);

export const RouteResults: React.FC<RouteResultsProps> = ({
  routes,
  analysis,
  isLoading,
  error,
  hasSearched
}) => {
  const { data: session } = useSession();
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>();
  const [savingRouteId, setSavingRouteId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: 'sustainability',
    sortOrder: 'desc',
    maxTime: undefined,
    maxCost: undefined,
    maxCarbon: undefined,
    transportModes: Object.values(TransportMode),
    minSustainabilityScore: undefined
  });

  const handleRouteSelect = (routeId: string) => {
    setSelectedRouteId(routeId);
  };

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleSaveTrip = async (route: RouteOption) => {
    if (!session?.user?.email) {
      addToast('Please sign in to save trips', 'warning');
      return;
    }

    setSavingRouteId(route.id);

    try {
      // Calculate carbon saved compared to car
      const carEmissionFactor = 0.2; // kg CO2 per km for average car
      const carFootprint = route.totalDistance * carEmissionFactor;
      const carbonSaved = Math.max(0, carFootprint - route.totalCarbonFootprint);

      const response = await fetch('/api/user/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route,
          carbonFootprint: route.totalCarbonFootprint,
          carbonSaved,
          completedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save trip');
      }

      addToast('Trip saved successfully! Check your history.', 'success');
    } catch (error) {
      console.error('Error saving trip:', error);
      addToast(
        error instanceof Error ? error.message : 'Failed to save trip. Please try again.',
        'error'
      );
    } finally {
      setSavingRouteId(null);
    }
  };

  // Filter and sort routes based on current filters
  const filteredAndSortedRoutes = useMemo(() => {
    if (!routes || routes.length === 0) return [];

    // Apply filters
    let filtered = routes.filter(route => {
      // Time filter
      if (filters.maxTime && route.totalDuration > filters.maxTime) {
        return false;
      }

      // Cost filter
      if (filters.maxCost && route.totalCost > filters.maxCost) {
        return false;
      }

      // Carbon filter
      if (filters.maxCarbon && route.totalCarbonFootprint > filters.maxCarbon) {
        return false;
      }

      // Sustainability score filter
      if (filters.minSustainabilityScore && route.sustainabilityScore < filters.minSustainabilityScore) {
        return false;
      }

      // Transport mode filter - check if route uses only allowed transport modes
      const routeTransportModes = route.transportModes.map(segment => segment.mode);
      const hasDisallowedMode = routeTransportModes.some(mode => !filters.transportModes.includes(mode));
      if (hasDisallowedMode) {
        return false;
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'sustainability':
          comparison = a.sustainabilityScore - b.sustainabilityScore;
          break;
        case 'time':
          comparison = a.totalDuration - b.totalDuration;
          break;
        case 'cost':
          comparison = a.totalCost - b.totalCost;
          break;
        case 'carbon':
          comparison = a.totalCarbonFootprint - b.totalCarbonFootprint;
          break;
        default:
          comparison = 0;
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [routes, filters]);
  if (isLoading) {
    return (
      <div className="mt-12 w-full max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="card-yellow inline-block px-8 py-4 mb-4">
            <p className="text-brutal text-xl">FINDING GREENEST PATHS...</p>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-12 w-full max-w-5xl mx-auto">
        <div className="status-error text-center">
          <h3 className="text-2xl mb-4">ERROR!</h3>
          <p className="text-lg">{error}</p>
        </div>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="mt-16 w-full max-w-5xl mx-auto">
        <div className="card-brutal text-center">
          <div className="text-8xl mb-6">🌍</div>
          <h2 className="heading-brutal text-3xl mb-4">
            READY TO GO GREEN?
          </h2>
          <div className="card-cyan inline-block px-6 py-3 mb-4">
            <p className="text-brutal">ENTER YOUR JOURNEY DETAILS ABOVE</p>
          </div>
          <p className="text-brutal text-sm opacity-75">
            (ALLOW LOCATION ACCESS FOR BEST RESULTS)
          </p>
        </div>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="mt-12 w-full max-w-5xl mx-auto">
        <div className="status-warning text-center">
          <h3 className="text-2xl mb-4">NO ROUTES FOUND</h3>
          <p className="text-lg">TRY A DIFFERENT SEARCH</p>
        </div>
      </div>
    );
  }

  // Show message if all routes are filtered out
  if (filteredAndSortedRoutes.length === 0 && routes.length > 0) {
    return (
      <div className="mt-12 w-full max-w-5xl mx-auto space-y-8">
        {/* AI Analysis Section */}
        {analysis && (
          <div className="card-green">
            <div className="mb-6">
              <h2 className="heading-brutal text-2xl mb-2">AI INSIGHTS</h2>
              <div className="card-yellow inline-block px-4 py-2">
                <p className="text-brutal">SUSTAINABILITY ANALYSIS</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="card-brutal">
                <p className="text-brutal text-lg">{analysis.summary}</p>
              </div>

              {analysis.comparison && (
                <div className="card-pink">
                  <h3 className="heading-brutal text-lg mb-4">COMPARISON</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card-brutal text-center">
                      <p className="text-brutal text-sm mb-2">YOUR BEST OPTION</p>
                      <p className="heading-brutal text-2xl text-neo-green">
                        {(routes[0]?.totalCarbonFootprint ?? 0).toFixed(2)} KG CO₂
                      </p>
                    </div>
                    <div className="card-brutal text-center">
                      <p className="text-brutal text-sm mb-2">CONVENTIONAL CAR</p>
                      <p className="heading-brutal text-2xl text-neo-red">
                        {(analysis.comparison.conventionalFootprint ?? 0).toFixed(2)} KG CO₂
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 card-yellow p-4">
                    <p className="text-brutal text-center">{analysis.comparison.savings}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <FilterControls
          filters={filters}
          onChange={setFilters}
          routeCount={filteredAndSortedRoutes.length}
          disabled={isLoading}
        />

        <div className="status-warning text-center">
          <h3 className="text-2xl mb-4">NO ROUTES MATCH YOUR FILTERS</h3>
          <p className="text-lg mb-4">TRY ADJUSTING YOUR FILTER SETTINGS</p>
          <div className="card-cyan inline-block px-4 py-2">
            <p className="text-brutal">{routes.length} TOTAL ROUTES AVAILABLE</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 w-full max-w-5xl mx-auto space-y-8">
      {/* AI Analysis Section */}
      {analysis && (
        <div className="card-green">
          <div className="mb-6">
            <h2 className="heading-brutal text-2xl mb-2">AI INSIGHTS</h2>
            <div className="card-yellow inline-block px-4 py-2">
              <p className="text-brutal">SUSTAINABILITY ANALYSIS</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="card-brutal">
              <p className="text-brutal text-lg">{analysis.summary}</p>
            </div>

            {analysis.comparison && (
              <div className="card-pink">
                <h3 className="heading-brutal text-lg mb-4">COMPARISON</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card-brutal text-center">
                    <p className="text-brutal text-sm mb-2">YOUR BEST OPTION</p>
                    <p className="heading-brutal text-2xl text-neo-green">
                      {(routes[0]?.totalCarbonFootprint ?? 0).toFixed(2)} KG CO₂
                    </p>
                  </div>
                  <div className="card-brutal text-center">
                    <p className="text-brutal text-sm mb-2">CONVENTIONAL CAR</p>
                    <p className="heading-brutal text-2xl text-neo-red">
                      {(analysis.comparison.conventionalFootprint ?? 0).toFixed(2)} KG CO₂
                    </p>
                  </div>
                </div>
                <div className="mt-4 card-yellow p-4">
                  <p className="text-brutal text-center">{analysis.comparison.savings}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Filter Controls */}
      <FilterControls
        filters={filters}
        onChange={setFilters}
        routeCount={filteredAndSortedRoutes.length}
        disabled={isLoading}
      />

      {/* Interactive Map Section */}
      <div className="mb-8">
        <InteractiveMap 
          routes={filteredAndSortedRoutes}
          selectedRouteId={selectedRouteId}
          onRouteSelect={handleRouteSelect}
          className="w-full"
        />
      </div>

      {/* Routes Section */}
      <div>
        <div className="mb-6">
          <h2 className="heading-brutal text-2xl mb-2">YOUR ROUTES</h2>
          <div className="card-pink inline-block px-4 py-2">
            <p className="text-brutal">
              SORTED BY {filters.sortBy.toUpperCase()} ({filters.sortOrder === 'desc' ? 'HIGH TO LOW' : 'LOW TO HIGH'})
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          {filteredAndSortedRoutes.map((route, index) => (
            <RouteCard
              key={route.id}
              route={route}
              isBestOption={index === 0 && filters.sortBy === 'sustainability' && filters.sortOrder === 'desc'}
              isSelected={selectedRouteId === route.id}
              onSelect={() => handleRouteSelect(route.id)}
              onSave={handleSaveTrip}
              isSaving={savingRouteId === route.id}
              isAuthenticated={!!session}
            />
          ))}
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};