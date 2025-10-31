import React from 'react';
import { RouteOption, SustainabilityAnalysis } from '../types';
import { RouteCard } from './RouteCard';

interface RouteResultsProps {
  routes: RouteOption[];
  analysis: SustainabilityAnalysis | null;
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-6">
        <div className="bg-gray-200 rounded-lg h-32 w-full animate-pulse border-2 border-brut-black"></div>
        <div className="bg-gray-200 rounded-lg h-48 w-full animate-pulse border-2 border-brut-black"></div>
        <div className="bg-gray-200 rounded-lg h-48 w-full animate-pulse border-2 border-brut-black"></div>
    </div>
);

export const RouteResults: React.FC<RouteResultsProps> = ({ routes, analysis, isLoading, error, hasSearched }) => {
  if (isLoading) {
    return (
        <div className="mt-8 w-full max-w-4xl mx-auto">
            <p className="text-center text-lg text-brut-black font-semibold mb-4">Finding the greenest paths for you...</p>
            <LoadingSkeleton />
        </div>
    );
  }

  if (error) {
    return <div className="mt-8 text-center text-brut-red font-bold bg-brut-red/20 border-2 border-brut-red p-4 rounded-lg">{error}</div>;
  }

  if (!hasSearched) {
    return (
        <div className="mt-12 text-center text-brut-black bg-brut-white border-2 border-brut-black shadow-hard rounded-lg p-8">
            <div className="text-6xl mb-4">🌍</div>
            <h2 className="text-2xl font-bold">Plan your next sustainable journey</h2>
            <p className="mt-1 text-gray-600">Enter your origin and destination to get started.</p>
            <p className="text-sm mt-2 text-gray-500">(For best results, allow location access when prompted)</p>
        </div>
    );
  }

  if (routes.length === 0) {
    return <div className="mt-8 text-center text-brut-black bg-brut-white border-2 border-brut-black p-6 rounded-lg shadow-hard">No routes found. The AI couldn't find any suitable routes. Please try a different search.</div>;
  }

  return (
    <div className="mt-8 w-full max-w-4xl mx-auto space-y-8">
      {analysis && (
        <div className="bg-brut-yellow border-2 border-brut-black text-brut-black p-6 rounded-lg shadow-hard">
            <h2 className="text-xl font-bold mb-2">AI Sustainability Insights</h2>
            <p className="mb-4 text-brut-black">{analysis.summary}</p>
            <div className="bg-brut-white p-4 rounded-md border-2 border-brut-black">
                <h3 className="font-bold mb-2">💡 Pro Tips:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-brut-black">
                    {analysis.tips.map((tip, index) => <li key={index}>{tip}</li>)}
                </ul>
            </div>
            {analysis.comparison && (
             <div className="mt-4 bg-brut-white p-4 rounded-md border-2 border-brut-black">
                <h3 className="font-bold mb-2">📊 Comparison:</h3>
                <p className="text-sm text-brut-black">
                    {analysis.comparison.savings} Your best option emits only <strong>{(routes[0]?.totalCarbonFootprint ?? 0).toFixed(2)} kg CO₂e</strong>, compared to ~<strong>{(analysis.comparison.conventionalFootprint ?? 0).toFixed(2)} kg CO₂e</strong> from {analysis.comparison.conventionalMethod}.
                </p>
            </div>
            )}
        </div>
      )}
      
      <div className="space-y-6">
        {routes.map((route, index) => (
          <RouteCard key={route.id} route={route} isBestOption={index === 0} />
        ))}
      </div>
    </div>
  );
};