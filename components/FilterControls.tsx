'use client'

import React from 'react';
import { TransportMode } from '@/lib/types';

export type SortOption = 'sustainability' | 'time' | 'cost' | 'carbon';

export type FilterOptions = {
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
  maxTime?: number; // in minutes
  maxCost?: number;
  maxCarbon?: number; // kg CO2e
  transportModes: TransportMode[];
  minSustainabilityScore?: number;
}

type FilterControlsProps = {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
  routeCount: number;
  disabled?: boolean;
}

const SORT_OPTIONS = [
  { value: 'sustainability' as SortOption, label: 'SUSTAINABILITY', icon: '🌱' },
  { value: 'time' as SortOption, label: 'TIME', icon: '⏱️' },
  { value: 'cost' as SortOption, label: 'COST', icon: '💰' },
  { value: 'carbon' as SortOption, label: 'CARBON', icon: '🌍' },
];

const TRANSPORT_MODE_LABELS = {
  [TransportMode.BUS]: 'BUS',
  [TransportMode.TRAIN]: 'TRAIN',
  [TransportMode.CAR]: 'CAR',
  [TransportMode.PLANE]: 'PLANE',
};

const TRANSPORT_MODE_ICONS = {
  [TransportMode.BUS]: '🚌',
  [TransportMode.TRAIN]: '🚂',
  [TransportMode.CAR]: '🚗',
  [TransportMode.PLANE]: '✈️',
};

export const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  onChange,
  routeCount,
  disabled = false
}) => {
  const handleSortChange = (sortBy: SortOption) => {
    const newSortOrder = filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    onChange({
      ...filters,
      sortBy,
      sortOrder: newSortOrder
    });
  };

  const handleMaxTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hours = e.target.value ? parseFloat(e.target.value) : undefined;
    const minutes = hours ? Math.round(hours * 60) : undefined;
    onChange({
      ...filters,
      maxTime: minutes
    });
  };

  const handleMaxCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : undefined;
    onChange({
      ...filters,
      maxCost: value
    });
  };

  const handleMaxCarbonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : undefined;
    onChange({
      ...filters,
      maxCarbon: value
    });
  };

  const handleMinSustainabilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : undefined;
    onChange({
      ...filters,
      minSustainabilityScore: value
    });
  };

  const handleTransportModeToggle = (mode: TransportMode) => {
    const currentModes = filters.transportModes;
    const isSelected = currentModes.includes(mode);
    
    let newModes: TransportMode[];
    if (isSelected) {
      newModes = currentModes.filter(m => m !== mode);
    } else {
      newModes = [...currentModes, mode];
    }
    
    onChange({
      ...filters,
      transportModes: newModes
    });
  };

  const clearAllFilters = () => {
    onChange({
      sortBy: 'sustainability',
      sortOrder: 'desc',
      maxTime: undefined,
      maxCost: undefined,
      maxCarbon: undefined,
      transportModes: Object.values(TransportMode),
      minSustainabilityScore: undefined
    });
  };

  const hasActiveFilters = filters.maxTime || filters.maxCost || filters.maxCarbon || 
    filters.minSustainabilityScore || filters.transportModes.length < Object.values(TransportMode).length;

  return (
    <div className="card-brutal mb-6" role="region" aria-label="Route filtering and sorting controls">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h3 className="heading-brutal text-xl mb-2">FILTER & SORT</h3>
          <div className="card-cyan inline-block px-3 py-1">
            <span className="text-brutal text-sm">
              SHOWING {routeCount} ROUTE{routeCount !== 1 ? 'S' : ''}
            </span>
          </div>
        </div>
        
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            disabled={disabled}
            className="btn-secondary mt-4 md:mt-0"
            aria-label="Clear all filters and reset to default view"
          >
            CLEAR FILTERS
          </button>
        )}
      </div>

      {/* Sort Options */}
      <div className="mb-6">
        <h4 className="text-brutal text-lg mb-3">SORT BY</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SORT_OPTIONS.map((option) => {
            const isActive = filters.sortBy === option.value;
            const isDesc = filters.sortOrder === 'desc';
            
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSortChange(option.value)}
                disabled={disabled}
                className={`p-3 border-4 border-neo-black font-mono font-bold text-sm uppercase transition-all duration-150 ${
                  isActive
                    ? 'bg-neo-lime text-neo-black shadow-brutal-sm translate-x-1 translate-y-1'
                    : 'bg-neo-white text-neo-black hover:bg-neo-yellow hover:translate-x-1 hover:translate-y-1 hover:shadow-brutal-sm'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                aria-pressed={isActive}
                aria-label={`Sort by ${option.label.toLowerCase()}${isActive ? `, currently ${isDesc ? 'descending' : 'ascending'}` : ''}`}
              >
                <div className="text-2xl mb-1">
                  {option.icon}
                  {isActive && (
                    <span className="ml-1 text-lg">
                      {isDesc ? '↓' : '↑'}
                    </span>
                  )}
                </div>
                <div>{option.label}</div>
              </button>
            );
          })}
        </div>
        <p className="text-sm font-mono mt-2 text-gray-600">
          CLICK AGAIN TO REVERSE ORDER
        </p>
      </div>

      {/* Filter Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Max Travel Time */}
        <div>
          <label htmlFor="maxTime" className="block text-brutal text-sm mb-2 uppercase">
            MAX TIME (HOURS)
          </label>
          <input
            id="maxTime"
            type="number"
            min="0.5"
            max="48"
            step="0.5"
            value={filters.maxTime ? (filters.maxTime / 60).toString() : ''}
            onChange={handleMaxTimeChange}
            placeholder="NO LIMIT"
            disabled={disabled}
            className="input-brutal w-full text-sm uppercase placeholder:text-neo-gray"
            aria-describedby="maxTime-help"
          />
          <p id="maxTime-help" className="text-xs font-mono mt-1 text-gray-600">
            HIDE ROUTES LONGER THAN THIS
          </p>
        </div>

        {/* Max Cost */}
        <div>
          <label htmlFor="maxCost" className="block text-brutal text-sm mb-2 uppercase">
            MAX COST ($)
          </label>
          <input
            id="maxCost"
            type="number"
            min="0"
            step="10"
            value={filters.maxCost || ''}
            onChange={handleMaxCostChange}
            placeholder="NO LIMIT"
            disabled={disabled}
            className="input-brutal w-full text-sm uppercase placeholder:text-neo-gray"
            aria-describedby="maxCost-help"
          />
          <p id="maxCost-help" className="text-xs font-mono mt-1 text-gray-600">
            HIDE ROUTES MORE EXPENSIVE THAN THIS
          </p>
        </div>

        {/* Max Carbon */}
        <div>
          <label htmlFor="maxCarbon" className="block text-brutal text-sm mb-2 uppercase">
            MAX CO₂ (KG)
          </label>
          <input
            id="maxCarbon"
            type="number"
            min="0"
            step="0.1"
            value={filters.maxCarbon || ''}
            onChange={handleMaxCarbonChange}
            placeholder="NO LIMIT"
            disabled={disabled}
            className="input-brutal w-full text-sm uppercase placeholder:text-neo-gray"
            aria-describedby="maxCarbon-help"
          />
          <p id="maxCarbon-help" className="text-xs font-mono mt-1 text-gray-600">
            HIDE HIGH-EMISSION ROUTES
          </p>
        </div>

        {/* Min Sustainability Score */}
        <div>
          <label htmlFor="minSustainability" className="block text-brutal text-sm mb-2 uppercase">
            MIN ECO SCORE
          </label>
          <input
            id="minSustainability"
            type="number"
            min="0"
            max="100"
            step="5"
            value={filters.minSustainabilityScore || ''}
            onChange={handleMinSustainabilityChange}
            placeholder="NO LIMIT"
            disabled={disabled}
            className="input-brutal w-full text-sm uppercase placeholder:text-neo-gray"
            aria-describedby="minSustainability-help"
          />
          <p id="minSustainability-help" className="text-xs font-mono mt-1 text-gray-600">
            SHOW ONLY ECO-FRIENDLY ROUTES
          </p>
        </div>
      </div>

      {/* Transport Mode Filter */}
      <div>
        <h4 className="text-brutal text-lg mb-3 uppercase">
          ALLOWED TRANSPORT MODES
        </h4>
        <p className="text-sm font-mono mb-3 text-gray-600">
          CLICK TO TOGGLE TRANSPORT OPTIONS (GREEN = ALLOWED)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.values(TransportMode).map((mode) => {
            const isSelected = filters.transportModes.includes(mode);
            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleTransportModeToggle(mode)}
                disabled={disabled}
                className={`p-3 border-4 border-neo-black font-mono font-bold text-xs uppercase transition-all duration-150 ${
                  isSelected
                    ? 'bg-neo-lime text-neo-black shadow-brutal-sm translate-x-1 translate-y-1'
                    : 'bg-neo-white text-neo-black hover:bg-neo-yellow hover:translate-x-1 hover:translate-y-1 hover:shadow-brutal-sm'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                aria-pressed={isSelected}
                aria-label={`${isSelected ? 'Disable' : 'Enable'} ${TRANSPORT_MODE_LABELS[mode].toLowerCase()} transport mode`}
              >
                <div className="text-lg mb-1">
                  {TRANSPORT_MODE_ICONS[mode]}
                </div>
                <div>
                  {TRANSPORT_MODE_LABELS[mode]}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-sm font-mono mt-3 text-gray-600">
          SELECTED: {filters.transportModes.length} OF {Object.values(TransportMode).length} MODES
        </p>
      </div>
    </div>
  );
};