'use client'

import React from 'react';
import { TransportMode } from '@/lib/types';

export interface TravelPreferencesData {
  prioritizeSustainability: boolean;
  maxTravelTime?: number;
  budgetLimit?: number;
  preferredTransportModes: TransportMode[];
}

interface TravelPreferencesProps {
  preferences: TravelPreferencesData;
  onChange: (preferences: TravelPreferencesData) => void;
  disabled?: boolean;
}

const TRANSPORT_MODE_LABELS = {
  [TransportMode.WALK]: 'WALKING',
  [TransportMode.BIKE]: 'CYCLING',
  [TransportMode.BUS]: 'BUS',
  [TransportMode.TRAIN]: 'TRAIN',
  [TransportMode.METRO]: 'METRO',
  [TransportMode.CAR]: 'CAR',
  [TransportMode.PLANE]: 'PLANE',
};

const TRANSPORT_MODE_ICONS = {
  [TransportMode.WALK]: '🚶',
  [TransportMode.BIKE]: '🚴',
  [TransportMode.BUS]: '🚌',
  [TransportMode.TRAIN]: '🚂',
  [TransportMode.METRO]: '🚇',
  [TransportMode.CAR]: '🚗',
  [TransportMode.PLANE]: '✈️',
};

export const TravelPreferences: React.FC<TravelPreferencesProps> = ({
  preferences,
  onChange,
  disabled = false
}) => {
  const handleSustainabilityToggle = () => {
    onChange({
      ...preferences,
      prioritizeSustainability: !preferences.prioritizeSustainability
    });
  };

  const handleMaxTravelTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : undefined;
    onChange({
      ...preferences,
      maxTravelTime: value
    });
  };

  const handleBudgetLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : undefined;
    onChange({
      ...preferences,
      budgetLimit: value
    });
  };

  const handleTransportModeToggle = (mode: TransportMode) => {
    const currentModes = preferences.preferredTransportModes;
    const isSelected = currentModes.includes(mode);
    
    let newModes: TransportMode[];
    if (isSelected) {
      newModes = currentModes.filter(m => m !== mode);
    } else {
      newModes = [...currentModes, mode];
    }
    
    onChange({
      ...preferences,
      preferredTransportModes: newModes
    });
  };

  return (
    <div className="space-y-6">
      <div className="card-brutal">
        <h3 className="heading-brutal text-xl mb-4">TRAVEL PREFERENCES</h3>
        
        {/* Sustainability Priority */}
        <div className="mb-6">
          <label className="flex items-center space-x-4 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.prioritizeSustainability}
              onChange={handleSustainabilityToggle}
              disabled={disabled}
              className="w-6 h-6 border-4 border-neo-black bg-neo-white checked:bg-neo-green focus:outline-none focus:ring-4 focus:ring-neo-yellow"
            />
            <span className="text-brutal text-lg uppercase">
              PRIORITIZE ECO-FRIENDLY OPTIONS
            </span>
          </label>
          <p className="text-sm font-mono mt-2 text-gray-600">
            SHOW MOST SUSTAINABLE ROUTES FIRST
          </p>
        </div>

        {/* Max Travel Time */}
        <div className="mb-6">
          <label htmlFor="maxTravelTime" className="block text-brutal text-lg mb-3 uppercase">
            MAX TRAVEL TIME (HOURS)
          </label>
          <input
            id="maxTravelTime"
            type="number"
            min="1"
            max="48"
            step="0.5"
            value={preferences.maxTravelTime || ''}
            onChange={handleMaxTravelTimeChange}
            placeholder="NO LIMIT"
            disabled={disabled}
            className="input-brutal w-full uppercase placeholder:text-neo-gray"
          />
          <p className="text-sm font-mono mt-2 text-gray-600">
            LEAVE EMPTY FOR NO TIME LIMIT
          </p>
        </div>

        {/* Budget Limit */}
        <div className="mb-6">
          <label htmlFor="budgetLimit" className="block text-brutal text-lg mb-3 uppercase">
            BUDGET LIMIT ($)
          </label>
          <input
            id="budgetLimit"
            type="number"
            min="0"
            step="10"
            value={preferences.budgetLimit || ''}
            onChange={handleBudgetLimitChange}
            placeholder="NO LIMIT"
            disabled={disabled}
            className="input-brutal w-full uppercase placeholder:text-neo-gray"
          />
          <p className="text-sm font-mono mt-2 text-gray-600">
            LEAVE EMPTY FOR NO BUDGET LIMIT
          </p>
        </div>

        {/* Preferred Transport Modes */}
        <div>
          <h4 className="text-brutal text-lg mb-4 uppercase">
            PREFERRED TRANSPORT MODES
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.values(TransportMode).map((mode) => {
              const isSelected = preferences.preferredTransportModes.includes(mode);
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleTransportModeToggle(mode)}
                  disabled={disabled}
                  className={`p-3 border-4 border-neo-black font-mono font-bold text-sm uppercase transition-all duration-150 ${
                    isSelected
                      ? 'bg-neo-green text-neo-black shadow-brutal-sm translate-x-1 translate-y-1'
                      : 'bg-neo-white text-neo-black hover:bg-neo-yellow hover:translate-x-1 hover:translate-y-1 hover:shadow-brutal-sm'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="text-2xl mb-1">
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
            SELECT YOUR PREFERRED TRANSPORT OPTIONS
          </p>
        </div>
      </div>
    </div>
  );
};