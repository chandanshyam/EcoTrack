import React from 'react';
import { RouteOption, SustainabilityAnalysis } from '@/lib/types';
import { RouteCard } from '@/components/RouteCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface RouteResultsProps {
  routes: RouteOption[];
  analysis: SustainabilityAnalysis | null;
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="bg-carbon-gray-200 rounded-lg h-32 w-full animate-pulse border-2 border-carbon-gray-300"></div>
    <div className="bg-carbon-gray-200 rounded-lg h-48 w-full animate-pulse border-2 border-carbon-gray-300"></div>
    <div className="bg-carbon-gray-200 rounded-lg h-48 w-full animate-pulse border-2 border-carbon-gray-300"></div>
  </div>
);

export const RouteResults: React.FC<RouteResultsProps> = ({ 
  routes, 
  analysis, 
  isLoading, 
  error, 
  hasSearched 
}) => {
  if (isLoading) {
    return (
      <div className="mt-8 w-full max-w-4xl mx-auto">
        <p className="text-center text-lg text-carbon-gray-900 font-semibold mb-4">
          Finding the greenest paths for you...
        </p>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 w-full max-w-4xl mx-auto">
        <Card className="border-red-300 bg-red-50">
          <CardContent className="text-center text-red-700 font-bold">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="mt-12 w-full max-w-4xl mx-auto">
        <Card className="text-center">
          <CardContent className="py-8">
            <div className="text-6xl mb-4">🌍</div>
            <CardTitle className="text-2xl font-bold mb-2">
              Plan your next sustainable journey
            </CardTitle>
            <p className="text-carbon-gray-600 mb-2">
              Enter your origin and destination to get started.
            </p>
            <p className="text-sm text-carbon-gray-500">
              (For best results, allow location access when prompted)
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="mt-8 w-full max-w-4xl mx-auto">
        <Card>
          <CardContent className="text-center text-carbon-gray-900">
            No routes found. The AI couldn&apos;t find any suitable routes. Please try a different search.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-8 w-full max-w-4xl mx-auto space-y-8">
      {analysis && (
        <Card className="bg-eco-green-50 border-eco-green-200">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-carbon-gray-900">
              AI Sustainability Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-carbon-gray-800">{analysis.summary}</p>
            
            <div className="bg-white p-4 rounded-md border-2 border-eco-green-200 mb-4">
              <h3 className="font-bold mb-2 text-carbon-gray-900">💡 Pro Tips:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-carbon-gray-700">
                {analysis.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
            
            {analysis.comparison && (
              <div className="bg-white p-4 rounded-md border-2 border-eco-green-200">
                <h3 className="font-bold mb-2 text-carbon-gray-900">📊 Comparison:</h3>
                <p className="text-sm text-carbon-gray-700">
                  {analysis.comparison.savings} Your best option emits only{' '}
                  <strong>{(routes[0]?.totalCarbonFootprint ?? 0).toFixed(2)} kg CO₂e</strong>, 
                  compared to ~<strong>{(analysis.comparison.conventionalFootprint ?? 0).toFixed(2)} kg CO₂e</strong>{' '}
                  from {analysis.comparison.conventionalMethod}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-6">
        {routes.map((route, index) => (
          <RouteCard key={route.id} route={route} isBestOption={index === 0} />
        ))}
      </div>
    </div>
  );
};