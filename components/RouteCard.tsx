import React from 'react';
import { RouteOption } from '@/lib/types';
import { TransportIcon } from '@/components/icons/TransportIcon';
import { formatCarbonFootprint } from '@/lib/utils';

type RouteCardProps = {
  route: RouteOption;
  isBestOption: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onSave?: (route: RouteOption) => void;
  isSaving?: boolean;
  isAuthenticated?: boolean;
}

const formatDuration = (minutes: number) => {
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

const kmToMiles = (km: number) => {
  return Math.round(km * 0.621371);
};

export const RouteCard: React.FC<RouteCardProps> = ({ route, isBestOption, isSelected, onSelect, onSave, isSaving, isAuthenticated }) => {
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

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h3 className="heading-brutal text-xl md:text-2xl mb-2 md:mb-0">
            {route.name.toUpperCase()}
          </h3>
          <div className={`${getScoreCardClass(route.sustainabilityScore)} text-center min-w-[100px]`}>
            <div className="text-sm font-mono">SCORE</div>
            <div className="text-2xl font-bold">{route.sustainabilityScore}</div>
          </div>
        </div>

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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-cyan text-center">
            <p className="text-brutal text-sm mb-1">TIME</p>
            <p className="heading-brutal text-lg">
              {formatDuration(route.totalDuration)}
            </p>
          </div>
          <div className="card-yellow text-center">
            <p className="text-brutal text-sm mb-1">COST</p>
            <p className="heading-brutal text-lg">
              ${Math.round(route.totalCost ?? 0)}
            </p>
          </div>
          <div className="card-teal text-center">
            <p className="text-brutal text-sm mb-1">DISTANCE</p>
            <p className="heading-brutal text-lg">
              {kmToMiles(route.totalDistance)} MILES
            </p>
          </div>
          <div className="card-coral text-center">
            <p className="text-brutal text-sm mb-1">CO₂</p>
            <p className="heading-brutal text-lg">
              {formatCarbonFootprint(route.totalCarbonFootprint ?? 0)}
            </p>
          </div>
        </div>

        {/* Save Trip Button */}
        {onSave && (
          <div className="mt-6 pt-6 border-t-4 border-neo-black">
            {isAuthenticated ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSave(route);
                }}
                disabled={isSaving}
                className={`btn-accent w-full text-lg py-3 flex items-center justify-center gap-3 ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>SAVING...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>SAVE TRIP TO HISTORY</span>
                  </>
                )}
              </button>
            ) : (
              <div className="card-yellow p-4 text-center">
                <p className="text-brutal text-sm mb-2">SIGN IN TO SAVE TRIPS</p>
                <a href="/auth/signin" className="btn-secondary w-full py-2">
                  SIGN IN
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
