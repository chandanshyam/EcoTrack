import React, { useState } from 'react';
import { RouteOption, SustainabilityAnalysis } from '@/lib/types';
import { RouteCard } from '@/components/RouteCard';
import { InteractiveMap } from '@/components/InteractiveMap';

interface RouteResultsProps {
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
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>();

  const handleRouteSelect = (routeId: string) => {
    setSelectedRouteId(routeId);
  };
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
            
            <div className="card-cyan">
              <h3 className="heading-brutal text-lg mb-4">PRO TIPS</h3>
              <ul className="space-y-2">
                {analysis.tips.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <span className="card-yellow px-2 py-1 text-brutal text-sm">{index + 1}</span>
                    <span className="text-brutal">{tip}</span>
                  </li>
                ))}
              </ul>
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
      
      {/* Interactive Map Section */}
      <div className="mb-8">
        <InteractiveMap 
          routes={routes}
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
            <p className="text-brutal">RANKED BY SUSTAINABILITY</p>
          </div>
        </div>
        
        <div className="space-y-6">
          {routes.map((route, index) => (
            <RouteCard 
              key={route.id} 
              route={route} 
              isBestOption={index === 0}
              isSelected={selectedRouteId === route.id}
              onSelect={() => handleRouteSelect(route.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};