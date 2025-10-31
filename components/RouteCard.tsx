import React from 'react';
import { RouteOption } from '@/lib/types';
import { TransportIcon } from '@/components/icons/TransportIcon';
import { formatCarbonFootprint } from '@/lib/utils';

interface RouteCardProps {
  route: RouteOption;
  isBestOption: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h > 0 ? `${h}h ` : ''}${m}m`;
};

export const RouteCard: React.FC<RouteCardProps> = ({ route, isBestOption, isSelected, onSelect }) => {
  const getScoreCardClass = (score: number) => {
    if (score > 80) return 'score-high';
    if (score > 60) return 'score-medium';
    return 'score-low';
  };

  const getCardClass = () => {
    let baseClass = 'card-brutal hover:translate-x-2 hover:translate-y-2 hover:shadow-brutal-sm transition-all duration-150';
    if (isSelected) {
      baseClass += ' ring-4 ring-neo-blue bg-neo-blue bg-opacity-10';
    } else if (isBestOption) {
      baseClass += ' card-green';
    }
    if (onSelect) {
      baseClass += ' cursor-pointer';
    }
    return baseClass;
  };

  return (
    <div className="relative">
      <div 
        className={getCardClass()}
        onClick={onSelect}
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onKeyDown={onSelect ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        } : undefined}
      >
        {isBestOption && (
          <div className="absolute -top-4 -right-4 status-success rotate-12">
            BEST ECO CHOICE!
          </div>
        )}
        
        {isSelected && (
          <div className="absolute -top-4 -left-4 card-blue rotate-[-12deg] px-3 py-1">
            <span className="text-brutal text-sm">SELECTED</span>
          </div>
        )}
        
        {onSelect && (
          <div className="absolute top-4 right-4">
            <div className="card-yellow px-2 py-1">
              <span className="text-brutal text-xs">CLICK TO SELECT</span>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h3 className="heading-brutal text-xl md:text-2xl mb-2 md:mb-0">
            {route.name.toUpperCase()}
          </h3>
          <div className={`${getScoreCardClass(route.sustainabilityScore)} text-center min-w-[100px]`}>
            <div className="text-sm font-mono">SCORE</div>
            <div className="text-2xl font-bold">{route.sustainabilityScore}</div>
          </div>
        </div>
        
        {/* Transport Modes */}
        <div className="mb-6">
          <h4 className="text-brutal text-lg mb-3">TRANSPORT MODES:</h4>
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            {route.transportModes.map((segment, index) => (
              <React.Fragment key={index}>
                <div className="card-yellow px-3 py-2 flex items-center gap-2">
                  <TransportIcon mode={segment.mode} className="w-6 h-6" />
                  <span className="text-brutal text-sm">
                    {segment.mode.toUpperCase()}
                  </span>
                </div>
                {index < route.transportModes.length - 1 && (
                  <span className="text-brutal text-2xl">+</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-cyan text-center">
            <p className="text-brutal text-sm mb-1">TIME</p>
            <p className="heading-brutal text-lg">{formatDuration(route.totalDuration)}</p>
          </div>
          <div className="card-yellow text-center">
            <p className="text-brutal text-sm mb-1">COST</p>
            <p className="heading-brutal text-lg">${(route.totalCost ?? 0).toFixed(0)}</p>
          </div>
          <div className="card-pink text-center">
            <p className="text-brutal text-sm mb-1">DISTANCE</p>
            <p className="heading-brutal text-lg">{route.totalDistance.toFixed(0)} KM</p>
          </div>
          <div className="card-brutal text-center bg-neo-orange">
            <p className="text-brutal text-sm mb-1">CO₂</p>
            <p className="heading-brutal text-lg">
              {formatCarbonFootprint(route.totalCarbonFootprint ?? 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};