'use client'

import React, { useState } from 'react';
import { RouteOption, SustainabilityAnalysis } from '@/lib/types';
import { RouteCard } from '@/components/RouteCard';
import { FilterControls, FilterOptions } from '@/components/FilterControls';

type TabType = 'routes' | 'insights';

interface ResultsTabsProps {
  routes: RouteOption[];
  analysis: SustainabilityAnalysis | null;
  selectedRouteId: string | undefined;
  onRouteSelect: (routeId: string) => void;
  onSaveTrip: (route: RouteOption) => void;
  savingRouteId: string | null;
  isAuthenticated: boolean;
  sortBy: string;
  sortOrder: string;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  isLoading: boolean;
}

export const ResultsTabs: React.FC<ResultsTabsProps> = ({
  routes,
  analysis,
  selectedRouteId,
  onRouteSelect,
  onSaveTrip,
  savingRouteId,
  isAuthenticated,
  sortBy,
  sortOrder,
  filters,
  onFiltersChange,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('routes');
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="results-container">
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab tab-routes ${activeTab === 'routes' ? 'active' : ''}`}
          onClick={() => setActiveTab('routes')}
        >
          🌱 YOUR ROUTES
        </button>
        <button
          className={`tab tab-insights ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
          disabled={!analysis}
        >
          🤖 AI INSIGHTS
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Routes Tab */}
        {activeTab === 'routes' && (
          <div className="fade-in">
            {/* Filter Controls Button */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                disabled={isLoading}
                className={`btn-secondary py-2 text-sm ${showFilters ? 'bg-neo-yellow' : ''}`}
              >
                {showFilters ? '▲ HIDE FILTERS & SORT' : '▼ SHOW FILTERS & SORT'}
              </button>
            </div>

            {/* Collapsible Filter Controls */}
            {showFilters && (
              <div className="mb-6">
                <FilterControls
                  filters={filters}
                  onChange={onFiltersChange}
                  routeCount={routes.length}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Route Cards */}
            <div className="space-y-6">
              {routes.map((route, index) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  isBestOption={index === 0 && sortBy === 'sustainability' && sortOrder === 'desc'}
                  isSelected={selectedRouteId === route.id}
                  onSelect={() => onRouteSelect(route.id)}
                  onSave={onSaveTrip}
                  isSaving={savingRouteId === route.id}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && analysis && (
          <div className="fade-in space-y-6">
            {/* AI Analysis Section */}
            <div className="card-green p-6">
              <div className="mb-6">
                <h2 className="heading-brutal text-2xl mb-2">AI INSIGHTS</h2>
                <div className="card-yellow inline-block px-4 py-2">
                  <p className="text-brutal">SUSTAINABILITY ANALYSIS</p>
                </div>
              </div>

              <div className="card-brutal p-4">
                <p className="text-brutal text-lg">{analysis.summary}</p>
              </div>
            </div>

            {/* Comparison Section */}
            {analysis.comparison && (
              <div className="card-pink p-6">
                <div className="mb-6">
                  <h2 className="heading-brutal text-2xl mb-2">CARBON COMPARISON</h2>
                  <div className="card-yellow inline-block px-4 py-2">
                    <p className="text-brutal">YOUR ROUTE VS CONVENTIONAL CAR</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Top 3 vs Car */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card-green text-center p-6">
                      <div className="text-6xl mb-4">🌱</div>
                      <p className="text-brutal text-sm mb-2">YOUR BEST OPTION</p>
                      <p className="heading-brutal text-4xl text-neo-green mb-2">
                        {(routes[0]?.totalCarbonFootprint ?? 0).toFixed(2)} KG
                      </p>
                      <p className="text-brutal text-xs">CO₂ EMISSIONS</p>
                    </div>

                    <div className="card-coral text-center p-6">
                      <div className="text-6xl mb-4">🚗</div>
                      <p className="text-brutal text-sm mb-2">CONVENTIONAL CAR</p>
                      <p className="heading-brutal text-4xl text-neo-red mb-2">
                        {(analysis.comparison.conventionalFootprint ?? 0).toFixed(2)} KG
                      </p>
                      <p className="text-brutal text-xs">CO₂ EMISSIONS</p>
                    </div>
                  </div>

                  <div className="card-yellow p-6 text-center">
                    <p className="text-brutal text-lg">{analysis.comparison.savings}</p>
                  </div>

                  {/* Emissions Comparison Bar Chart */}
                  <div className="card-brutal p-6">
                    <h3 className="heading-brutal text-lg mb-4 text-center">EMISSIONS COMPARISON</h3>
                    <div className="space-y-4">
                      {routes.slice(0, 3).map((route, index) => {
                        const maxEmission = analysis.comparison?.conventionalFootprint ?? 100;
                        const percentage = (route.totalCarbonFootprint / maxEmission) * 100;
                        const displayPercentage = Math.max(percentage, 8);

                        // Get primary transport mode
                        const primaryMode = route.transportModes.length > 0
                          ? route.transportModes[0].mode.toUpperCase()
                          : 'UNKNOWN';

                        // Determine bar color based on transport mode
                        let barColor = 'bg-neo-green'; // Default for very low emissions
                        if (primaryMode === 'PLANE') {
                          barColor = 'bg-[#A855F7]'; // Purple for plane
                        } else if (primaryMode === 'CAR') {
                          barColor = 'bg-[#DC2626]'; // Dark red for car
                        } else if (primaryMode === 'BUS') {
                          barColor = 'bg-[#F87171]'; // Light red/pink for bus
                        } else if (primaryMode === 'TRAIN') {
                          barColor = 'bg-[#BFFF00]'; // Lime green for train
                        }

                        return (
                          <div key={route.id}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-brutal text-sm font-bold">{primaryMode}</span>
                              <span className="text-brutal text-sm font-bold">
                                {route.totalCarbonFootprint.toFixed(2)} KG CO₂
                              </span>
                            </div>
                            <div className="w-full h-10 bg-gray-200 border-4 border-neo-black relative overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 flex items-center ${barColor}`}
                                style={{ width: `${Math.min(displayPercentage, 100)}%` }}
                              >
                                <span className="text-brutal text-xs ml-2 font-bold text-neo-black">
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Conventional Car reference (no bar) */}
                      <div className="pt-4 border-t-4 border-neo-black mt-6">
                        <div className="flex items-center justify-between">
                          <span className="text-brutal text-sm font-bold">CONVENTIONAL CAR (BASELINE)</span>
                          <span className="text-brutal text-sm font-bold">
                            {(analysis.comparison?.conventionalFootprint ?? 0).toFixed(2)} KG CO₂
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
