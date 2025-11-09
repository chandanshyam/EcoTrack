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
      baseClass += ' bg-neo-lime';
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
        {/* Header Section - Horizontal Layout */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b-4 border-neo-black">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {isBestOption && (
                <div className="status-success px-3 py-1 text-sm">
                  🏆 BEST
                </div>
              )}
              {isSelected && (
                <div className="card-blue px-3 py-1">
                  <span className="text-brutal text-sm">SELECTED</span>
                </div>
              )}
            </div>
            <h3 className="heading-brutal text-xl md:text-2xl">
              {route.name.toUpperCase()}
            </h3>

            {/* Transport Modes - Inline */}
            <div className="flex items-center mt-3 flex-wrap gap-2">
              {route.transportModes.map((segment, index) => (
                <React.Fragment key={index}>
                  <div className="flex items-center gap-1 bg-neo-mustard border-2 border-neo-black px-2 py-1">
                    <TransportIcon mode={segment.mode} className="w-4 h-4" />
                    <span className="text-brutal text-xs">
                      {segment.mode.toUpperCase()}
                    </span>
                  </div>
                  {index < route.transportModes.length - 1 && (
                    <span className="text-brutal text-lg">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Transit Details Section */}
          {route.transportModes.some(s => s.transitDetails) && (
            <div className="w-full mt-4 pt-4 border-t-4 border-neo-black">
              <h4 className="heading-brutal text-sm mb-3">🚇 TRANSIT DETAILS</h4>
              <div className="space-y-3">
                {route.transportModes.map((segment, index) => {
                  if (!segment.transitDetails) {
                    return segment.instructions?.toLowerCase().includes('walk') ? (
                      <div key={index} className="flex items-center gap-2 text-xs opacity-75">
                        <span>🚶</span>
                        <span className="text-brutal">Walk {segment.distance.toFixed(1)} km</span>
                      </div>
                    ) : null;
                  }

                  const td = segment.transitDetails;
                  return (
                    <div key={index} className="card-white border-l-8" style={{
                      borderLeftColor: td.lineColor || '#000000'
                    }}>
                      {/* Line Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="px-3 py-1 border-2 border-neo-black font-bold text-sm"
                            style={{
                              backgroundColor: td.lineColor || '#000000',
                              color: td.lineTextColor || '#FFFFFF'
                            }}
                          >
                            {td.lineShortName || td.lineName}
                          </div>
                          <span className="text-brutal text-xs">{td.lineName}</span>
                        </div>
                        <span className="text-xs opacity-75">{td.agencyName}</span>
                      </div>

                      {/* Route Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="flex items-start gap-2">
                            <span className="text-xl">📍</span>
                            <div>
                              <div className="text-brutal text-xs opacity-75">FROM</div>
                              <div className="font-bold">{td.departureStop.name}</div>
                              {td.departureTimeText && (
                                <div className="text-brutal text-xs text-neo-teal">
                                  🕐 {td.departureTimeText}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-start gap-2">
                            <span className="text-xl">🏁</span>
                            <div>
                              <div className="text-brutal text-xs opacity-75">TO</div>
                              <div className="font-bold">{td.arrivalStop.name}</div>
                              {td.arrivalTimeText && (
                                <div className="text-brutal text-xs text-neo-teal">
                                  🕐 {td.arrivalTimeText}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="flex items-center gap-4 mt-2 pt-2 border-t-2 border-neo-black text-xs">
                        <span className="text-brutal">
                          📊 {td.numStops} stops
                        </span>
                        {td.headsign && (
                          <span className="text-brutal opacity-75">
                            → {td.headsign}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Score Badge */}
          <div className={`${getScoreCardClass(route.sustainabilityScore)} text-center min-w-[120px] shrink-0`}>
            <div className="text-xs font-mono uppercase">Eco Score</div>
            <div className="text-3xl font-bold">{route.sustainabilityScore}</div>
            <div className="text-xs font-mono">/100</div>
          </div>
        </div>

        {/* Metrics Section - 4 Column Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="card-cyan text-center py-3">
            <div className="text-2xl mb-1">⏱</div>
            <p className="text-brutal text-xs mb-1 opacity-75">TIME</p>
            <p className="heading-brutal text-lg">
              {formatDuration(route.totalDuration)}
            </p>
          </div>
          <div className="card-yellow text-center py-3">
            <div className="text-2xl mb-1">💵</div>
            <p className="text-brutal text-xs mb-1 opacity-75">COST</p>
            <p className="heading-brutal text-lg">
              ${Math.round(route.totalCost ?? 0)}
            </p>
          </div>
          <div className="card-teal text-center py-3">
            <div className="text-2xl mb-1">📏</div>
            <p className="text-brutal text-xs mb-1 opacity-75">DISTANCE</p>
            <p className="heading-brutal text-lg">
              {kmToMiles(route.totalDistance)} MI
            </p>
          </div>
          <div className="card-coral text-center py-3">
            <div className="text-2xl mb-1">🌱</div>
            <p className="text-brutal text-xs mb-1 opacity-75">CO₂</p>
            <p className="heading-brutal text-lg">
              {formatCarbonFootprint(route.totalCarbonFootprint ?? 0)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {onSave && (
          <div className="flex gap-3">
            {onSelect && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className="btn-secondary flex-1 py-2 text-sm"
              >
                {isSelected ? 'SELECTED ✓' : 'SELECT ROUTE'}
              </button>
            )}

            {isAuthenticated ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSave(route);
                }}
                disabled={isSaving}
                className={`btn-accent flex-1 py-2 text-sm flex items-center justify-center gap-2 ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>SAVING...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>SAVE TRIP</span>
                  </>
                )}
              </button>
            ) : (
              <a href="/auth/signin" className="btn-secondary flex-1 py-2 text-sm text-center">
                SIGN IN TO SAVE
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
