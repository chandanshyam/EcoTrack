import React from 'react';
import { RouteOption } from '../types';
import { TransportIcon } from './IconComponents';

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
  if (score > 80) return 'text-brut-green';
  if (score > 60) return 'text-brut-yellow';
  return 'text-brut-red';
};

export const RouteCard: React.FC<RouteCardProps> = ({ route, isBestOption }) => {
  return (
    <div className={`relative bg-brut-white border-2 border-brut-black rounded-lg p-6 transition-all duration-200 shadow-hard hover:shadow-hard-hover`}>
       {isBestOption && (
        <div className="absolute -top-3 -right-3 bg-brut-yellow text-brut-black text-xs font-bold px-3 py-1 rounded-md border-2 border-brut-black">
          Best Eco Choice
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <h3 className="text-xl md:text-2xl font-bold text-brut-black mb-2 md:mb-0">{route.name}</h3>
        <div className="flex items-center gap-2">
            <span className="text-brut-black text-sm font-semibold">Sustainability Score</span>
            <span className={`text-2xl font-black ${getScoreColor(route.sustainabilityScore)}`}>{route.sustainabilityScore}</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4 mb-5 flex-wrap">
        {route.transportModes.map((segment, index) => (
          <React.Fragment key={index}>
            <div className="flex items-center gap-2 text-brut-black">
              <TransportIcon mode={segment.mode} className="w-5 h-5" />
              <span className="text-sm font-medium">{segment.mode.charAt(0).toUpperCase() + segment.mode.slice(1)}</span>
            </div>
            {index < route.transportModes.length - 1 && <span className="text-gray-400 text-lg font-bold">+</span>}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-t-2 border-brut-black pt-4">
        <div>
          <p className="text-sm text-gray-600">Duration</p>
          <p className="text-lg font-bold text-brut-black">{formatDuration(route.totalDuration)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Cost</p>
          <p className="text-lg font-bold text-brut-black">${(route.totalCost ?? 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Distance</p>
          <p className="text-lg font-bold text-brut-black">{route.totalDistance} km</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">CO₂ Footprint</p>
          <p className="text-lg font-bold text-brut-black">{(route.totalCarbonFootprint ?? 0).toFixed(2)} kg</p>
        </div>
      </div>

    </div>
  );
};