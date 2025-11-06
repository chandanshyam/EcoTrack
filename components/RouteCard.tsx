import React from 'react';
import { RouteOption } from '@/lib/types';
import { TransportIcon } from '@/components/icons/TransportIcon';
import { formatCarbonFootprint } from '@/lib/utils';

type RouteCardProps = {
  route: RouteOption;
  isBestOption: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

const formatDuration = (minutes: number) => {
  // Ensure we have a valid number and round to integer
  const totalMinutes = Math.round(Number(minutes) || 0);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0 && m > 0) {
    return `${h}H ${m}M`;
  } else if (h > 0) {
    return `${h}H`;
  } else {
    return `${m}M`;
  }
};

export const RouteCard: React.FC<RouteCardProps> = ({ route, isBestOption, isSelected, onSelect }) => {
  const getScoreCardClass = (score: number) => {
    if (score > 80) return 'score-high';
    if (score > 60) return 'score-medium';
    return 'score-low';
  };

  const getCardClass = () => {
    let baseClass = 'card-brutal hover:translate-x-2 hover:translate-y-2 hover:shadow-brutal-sm transition-all duration-150 focus-within:ring-4 focus-within:ring-neo-yellow';
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

  const getScoreDescription = (score: number) => {
    if (score > 80) return 'Excellent sustainability score';
    if (score > 60) return 'Good sustainability score';
    if (score > 40) return 'Fair sustainability score';
    return 'Poor sustainability score';
  };

  return (
    <div className="relative">
      <div 
        className={getCardClass()}
        onClick={onSelect}
        role={onSelect ? 'button' : 'article'}
        tabIndex={onSelect ? 0 : undefined}
        onKeyDown={onSelect ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        } : undefined}
        aria-label={onSelect ? `Select ${route.name} route` : `${route.name} route details`}
        aria-describedby={`route-${route.id}-description`}
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
          <div 
            className={`${getScoreCardClass(route.sustainabilityScore)} text-center min-w-[100px]`}
            role="img"
            aria-label={`${getScoreDescription(route.sustainabilityScore)}: ${route.sustainabilityScore} out of 100`}
          >
            <div className="text-sm font-mono">SCORE</div>
            <div className="text-2xl font-bold">{route.sustainabilityScore}</div>
          </div>
        </div>
        
        {/* Transport Modes */}
        <div className="mb-6">
          <h4 className="text-brutal text-lg mb-3">TRANSPORT MODES:</h4>
          <div 
            className="flex items-center space-x-3 flex-wrap gap-2"
            role="list"
            aria-label="Transport modes for this route"
          >
            {route.transportModes.map((segment, index) => (
              <React.Fragment key={index}>
                <div 
                  className="card-yellow px-3 py-2 flex items-center gap-2"
                  role="listitem"
                  aria-label={`${segment.mode} for ${Math.round(segment.distance)} kilometers, ${Math.round(segment.duration)} minutes`}
                >
                  <TransportIcon mode={segment.mode} className="w-6 h-6" aria-hidden="true" />
                  <span className="text-brutal text-sm">
                    {segment.mode.toUpperCase()}
                  </span>
                </div>
                {index < route.transportModes.length - 1 && (
                  <span className="text-brutal text-2xl" aria-hidden="true">+</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          id={`route-${route.id}-description`}
        >
          <div className="card-cyan text-center" role="group" aria-label="Travel time">
            <p className="text-brutal text-sm mb-1">TIME</p>
            <p className="heading-brutal text-lg" aria-label={`${formatDuration(route.totalDuration)} travel time`}>
              {formatDuration(route.totalDuration)}
            </p>
          </div>
          <div className="card-yellow text-center" role="group" aria-label="Travel cost">
            <p className="text-brutal text-sm mb-1">COST</p>
            <p className="heading-brutal text-lg" aria-label={`$${Math.round(route.totalCost ?? 0)} total cost`}>
              ${Math.round(route.totalCost ?? 0)}
            </p>
          </div>
          <div className="card-teal text-center" role="group" aria-label="Travel distance">
            <p className="text-brutal text-sm mb-1">DISTANCE</p>
            <p className="heading-brutal text-lg" aria-label={`${Math.round(route.totalDistance)} kilometers total distance`}>
              {Math.round(route.totalDistance)} KM
            </p>
          </div>
          <div className="card-coral text-center" role="group" aria-label="Carbon emissions">
            <p className="text-brutal text-sm mb-1">CO₂</p>
            <p className="heading-brutal text-lg" aria-label={`${formatCarbonFootprint(route.totalCarbonFootprint ?? 0)} carbon dioxide emissions`}>
              {formatCarbonFootprint(route.totalCarbonFootprint ?? 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};