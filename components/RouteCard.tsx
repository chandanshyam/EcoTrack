import React from 'react';
import { RouteOption } from '@/lib/types';
import { TransportIcon } from '@/components/icons/TransportIcon';
import { Card } from '@/components/ui/Card';
import { formatCarbonFootprint, getSustainabilityScoreColor } from '@/lib/utils';

interface RouteCardProps {
  route: RouteOption;
  isBestOption: boolean;
}

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h > 0 ? `${h}h ` : ''}${m}m`;
};

const getScoreColor = (score: number) => {
  if (score > 80) return 'text-eco-green-600';
  if (score > 60) return 'text-yellow-600';
  return 'text-red-600';
};

export const RouteCard: React.FC<RouteCardProps> = ({ route, isBestOption }) => {
  return (
    <div className="relative">
      <Card className="transition-all duration-200 hover:shadow-lg">
        {isBestOption && (
          <div className="absolute -top-3 -right-3 bg-eco-green-100 text-eco-green-800 text-xs font-bold px-3 py-1 rounded-md border-2 border-eco-green-600">
            Best Eco Choice
          </div>
        )}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <h3 className="text-xl md:text-2xl font-bold text-carbon-gray-900 mb-2 md:mb-0">{route.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-carbon-gray-700 text-sm font-semibold">Sustainability Score</span>
            <span className={`text-2xl font-black ${getScoreColor(route.sustainabilityScore)}`}>
              {route.sustainabilityScore}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mb-5 flex-wrap">
          {route.transportModes.map((segment, index) => (
            <React.Fragment key={index}>
              <div className="flex items-center gap-2 text-carbon-gray-700">
                <TransportIcon mode={segment.mode} className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {segment.mode.charAt(0).toUpperCase() + segment.mode.slice(1)}
                </span>
              </div>
              {index < route.transportModes.length - 1 && (
                <span className="text-carbon-gray-400 text-lg font-bold">+</span>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-t-2 border-carbon-gray-200 pt-4">
          <div>
            <p className="text-sm text-carbon-gray-600">Duration</p>
            <p className="text-lg font-bold text-carbon-gray-900">{formatDuration(route.totalDuration)}</p>
          </div>
          <div>
            <p className="text-sm text-carbon-gray-600">Cost</p>
            <p className="text-lg font-bold text-carbon-gray-900">${(route.totalCost ?? 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-carbon-gray-600">Distance</p>
            <p className="text-lg font-bold text-carbon-gray-900">{route.totalDistance} km</p>
          </div>
          <div>
            <p className="text-sm text-carbon-gray-600">CO₂ Footprint</p>
            <p className="text-lg font-bold text-carbon-gray-900">
              {formatCarbonFootprint(route.totalCarbonFootprint ?? 0)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};