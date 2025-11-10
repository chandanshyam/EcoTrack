import React from 'react';
import { RouteOption } from '@/lib/types';
import { TransportIcon } from '@/components/icons/TransportIcon';
import { formatCarbonFootprint } from '@/lib/utils';
import { InteractiveMap } from '@/components/InteractiveMap';

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

// Distance is already in miles, no conversion needed

const getEcoTips = (mode: string): string[] => {
  const tips: { [key: string]: string[] } = {
    car: [
      'Carpool to reduce per-person emissions',
      'Maintain steady speed (55-65 mph optimal)',
    ],
  };
  return tips[mode] || [];
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
                  <div className="flex items-center gap-1 bg-neo-mustard border-2 border-neo-black p-2" title={segment.mode.toUpperCase()}>
                    <TransportIcon mode={segment.mode} className="w-5 h-5" />
                  </div>
                  {index < route.transportModes.length - 1 && (
                    <span className="text-brutal text-lg">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Transit Details - Show for transit routes only */}
            {route.transportModes.some(seg => seg.transitDetails) && (
              <div className="mt-3 card-cyan px-3 py-2">
                {route.transportModes.filter(seg => seg.transitDetails).map((segment, idx) => (
                  <div key={idx} className="text-brutal text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">🚏</span>
                      <span>{segment.transitDetails!.line}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-75">
                      <span>📍</span>
                      <span>{segment.transitDetails!.departureStop.name} → {segment.transitDetails!.arrivalStop.name}</span>
                    </div>
                    {/* Departure and Arrival Times */}
                    {(segment.transitDetails!.departureStop.departureTime || segment.transitDetails!.arrivalStop.arrivalTime) && (
                      <div className="flex items-center gap-2 font-bold text-neo-black">
                        <span>🕐</span>
                        <span>
                          {segment.transitDetails!.departureStop.departureTime && (
                            <>Departs: {segment.transitDetails!.departureStop.departureTime}</>
                          )}
                          {segment.transitDetails!.departureStop.departureTime && segment.transitDetails!.arrivalStop.arrivalTime && (
                            <> • </>
                          )}
                          {segment.transitDetails!.arrivalStop.arrivalTime && (
                            <>Arrives: {segment.transitDetails!.arrivalStop.arrivalTime}</>
                          )}
                        </span>
                      </div>
                    )}
                    {/* Fare or Cost */}
                    {segment.transitDetails!.fare && (
                      <div className="flex items-center gap-2 font-bold">
                        <span>💵</span>
                        <span>Fare: {segment.transitDetails!.fare.text}</span>
                      </div>
                    )}
                    {!segment.transitDetails!.fare && (
                      <div className="flex items-center gap-2 opacity-75">
                        <span>💵</span>
                        <span>Est. Cost: ${segment.cost.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Eco Tips - Show for car routes */}
            {route.transportModes.some(seg => seg.mode === 'car') && (
              <div className="mt-3 card-yellow px-3 py-2">
                <div className="text-brutal text-xs space-y-1">
                  <div className="font-bold mb-1">💡 ECO TIPS:</div>
                  {getEcoTips('car').map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span>•</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flight Details - Show for plane routes */}
            {route.transportModes.some(seg => seg.mode === 'plane') && (
              <div className="mt-3 card-pink px-3 py-2">
                <div className="text-brutal text-xs space-y-1">
                  <div className="font-bold mb-1 flex items-center gap-2">
                    <span>✈️</span>
                    <span>FLIGHT DETAILS</span>
                  </div>

                  {/* Extract flight type and airport codes from route name */}
                  {(() => {
                    const nameMatch = route.name.match(/Flight \(([^)]+)\)(?:\s*\(([^)]+)\))?/);
                    const flightType = nameMatch?.[1] || 'Direct Flight';
                    const airportInfo = nameMatch?.[2] || null;
                    const isRealTime = flightType.includes('Real-time');
                    const isEstimated = airportInfo?.includes('Estimated');

                    return (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="opacity-75">Type:</span>
                          <span className="font-bold">{flightType}</span>
                        </div>

                        {airportInfo && !isEstimated && (
                          <div className="flex items-center gap-2">
                            <span className="opacity-75">Route:</span>
                            <span className="font-bold">{airportInfo}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="opacity-75">CO₂ Data:</span>
                          <span className={`font-bold ${isRealTime ? 'text-neo-green' : 'text-neo-black'}`}>
                            {isRealTime ? '✓ Real-time from Google' : isEstimated ? 'Estimated' : 'Calculated'}
                          </span>
                        </div>

                        {isRealTime && (
                          <div className="mt-2 pt-2 border-t-2 border-neo-black">
                            <div className="flex items-start gap-2 text-[10px] opacity-75">
                              <span>ℹ️</span>
                              <span>Based on actual airline operational data from Google Travel Impact Model</span>
                            </div>
                          </div>
                        )}

                        {/* Flight eco tips */}
                        <div className="mt-2 pt-2 border-t-2 border-neo-black">
                          <div className="font-bold mb-1">💡 REDUCE EMISSIONS:</div>
                          <div className="flex items-start gap-2">
                            <span>•</span>
                            <span>Choose economy class (lowest emissions per passenger)</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span>•</span>
                            <span>Pack light to reduce aircraft weight</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span>•</span>
                            <span>Choose direct flights when possible</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Score Badge */}
          <div className={`${getScoreCardClass(route.sustainabilityScore)} text-center min-w-[120px] shrink-0`}>
            <div className="text-xs font-mono uppercase">Eco Score</div>
            <div className="text-3xl font-bold">{route.sustainabilityScore}</div>
            <div className="text-xs font-mono">/100</div>
          </div>
        </div>

        {/* Interactive Map and Details - Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Map Column - Takes up 2/3 on desktop */}
          <div className="md:col-span-2">
            <InteractiveMap
              routes={[route]}
              selectedRouteId={route.id}
              className="w-full"
              showHeader={false}
            />
          </div>

          {/* Details Card Column - Takes up 1/3 on desktop */}
          <div className="card-brutal p-3 flex flex-col space-y-2">
            <h4 className="heading-brutal text-sm mb-1 pb-2 border-b-2 border-neo-black">ROUTE DETAILS</h4>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">⏱</span>
                <span className="text-brutal text-xs opacity-75">TIME</span>
              </div>
              <span className="heading-brutal text-sm">{formatDuration(route.totalDuration)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">💵</span>
                <span className="text-brutal text-xs opacity-75">COST</span>
              </div>
              <span className="heading-brutal text-sm">${Math.round(route.totalCost ?? 0)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📏</span>
                <span className="text-brutal text-xs opacity-75">DISTANCE</span>
              </div>
              <span className="heading-brutal text-sm">{Math.round(route.totalDistance)} MI</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌱</span>
                <span className="text-brutal text-xs opacity-75">CO₂</span>
              </div>
              <span className="heading-brutal text-sm">{formatCarbonFootprint(route.totalCarbonFootprint ?? 0)}</span>
            </div>

            {/* Save Trip Button */}
            {onSave && (
              <div className="pt-2 mt-auto border-t-2 border-neo-black">
                {isAuthenticated ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSave(route);
                    }}
                    disabled={isSaving}
                    className={`btn-accent w-full py-1.5 text-xs flex items-center justify-center gap-2 ${
                      isSaving ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" fill="currentColor" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>SAVING...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>SAVE TRIP</span>
                      </>
                    )}
                  </button>
                ) : (
                  <a href="/auth/signin" className="btn-secondary w-full py-1.5 text-xs text-center">
                    SIGN IN TO SAVE
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
