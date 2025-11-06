'use client'

import React, { useState, useEffect } from 'react';
import { TransportMode } from '@/lib/types';
import { TravelPreferencesData } from './TravelPreferences';

export type UserPreferencesData = TravelPreferencesData & {
  // Additional user-specific preferences
  defaultOrigin?: string;
  defaultDestination?: string;
  notifications: {
    emailUpdates: boolean;
    sustainabilityTips: boolean;
    routeAlerts: boolean;
  };
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
  };
  privacy: {
    saveSearchHistory: boolean;
    shareAnonymousData: boolean;
  };
}

type UserPreferencesManagerProps = {
  preferences: UserPreferencesData;
  onChange: (preferences: UserPreferencesData) => void;
  onSave: (preferences: UserPreferencesData) => Promise<void>;
  onReset: () => void;
  isLoading?: boolean;
  className?: string;
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

export const UserPreferencesManager: React.FC<UserPreferencesManagerProps> = ({
  preferences,
  onChange,
  onSave,
  onReset,
  isLoading = false,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'travel' | 'notifications' | 'accessibility' | 'privacy'>('travel');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Track changes to show unsaved indicator
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [preferences]);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await onSave(preferences);
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleReset = () => {
    onReset();
    setHasUnsavedChanges(false);
    setSaveStatus('idle');
  };

  const updatePreferences = (updates: Partial<UserPreferencesData>) => {
    onChange({ ...preferences, ...updates });
  };

  const updateNestedPreferences = <T extends keyof UserPreferencesData>(
    section: T,
    updates: Partial<UserPreferencesData[T]>
  ) => {
    const currentSection = preferences[section];
    if (typeof currentSection === 'object' && currentSection !== null) {
      onChange({
        ...preferences,
        [section]: { ...currentSection, ...updates }
      });
    }
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
    
    updatePreferences({ preferredTransportModes: newModes });
  };

  const tabs = [
    { id: 'travel' as const, label: 'TRAVEL', icon: '🚗' },
    { id: 'notifications' as const, label: 'ALERTS', icon: '🔔' },
    { id: 'accessibility' as const, label: 'ACCESS', icon: '♿' },
    { id: 'privacy' as const, label: 'PRIVACY', icon: '🔒' },
  ];

  return (
    <div className={`card-brutal ${className}`} role="region" aria-label="User preferences management">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="heading-brutal text-2xl mb-2">USER PREFERENCES</h2>
          <div className="card-cyan inline-block px-4 py-2">
            <p className="text-brutal">CUSTOMIZE YOUR EXPERIENCE</p>
          </div>
        </div>
        
        <div className="flex space-x-3 mt-4 md:mt-0">
          {hasUnsavedChanges && (
            <div className="card-yellow px-3 py-2">
              <span className="text-brutal text-sm">UNSAVED CHANGES</span>
            </div>
          )}
          
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="btn-secondary"
            aria-label="Reset all preferences to default values"
          >
            RESET
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || saveStatus === 'saving'}
            className={`btn-primary ${
              saveStatus === 'saved' ? 'bg-neo-lime' : 
              saveStatus === 'error' ? 'bg-neo-red' : ''
            }`}
            aria-label="Save current preferences"
          >
            {saveStatus === 'saving' && (
              <svg className="w-4 h-4 animate-spin mr-2" fill="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {saveStatus === 'saving' ? 'SAVING...' :
             saveStatus === 'saved' ? 'SAVED!' :
             saveStatus === 'error' ? 'ERROR!' : 'SAVE'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6" role="tablist" aria-label="Preference categories">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              onClick={() => setActiveTab(tab.id)}
              disabled={isLoading}
              className={`p-3 border-4 border-neo-black font-mono font-bold text-sm uppercase transition-all duration-150 ${
                activeTab === tab.id
                  ? 'bg-neo-lime text-neo-black shadow-brutal-sm translate-x-1 translate-y-1'
                  : 'bg-neo-white text-neo-black hover:bg-neo-yellow hover:translate-x-1 hover:translate-y-1 hover:shadow-brutal-sm'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-2xl mb-1">{tab.icon}</div>
              <div>{tab.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Travel Preferences Tab */}
        {activeTab === 'travel' && (
          <div id="travel-panel" role="tabpanel" aria-labelledby="travel-tab">
            <div className="space-y-6">
              {/* Sustainability Priority */}
              <div className="card-brutal">
                <h3 className="heading-brutal text-lg mb-4">SUSTAINABILITY SETTINGS</h3>
                
                <label className="flex items-center space-x-4 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={preferences.prioritizeSustainability}
                    onChange={(e) => updatePreferences({ prioritizeSustainability: e.target.checked })}
                    disabled={isLoading}
                    className="w-6 h-6 border-4 border-neo-black bg-neo-white checked:bg-neo-lime focus:outline-none focus:ring-4 focus:ring-neo-yellow cursor-pointer"
                    aria-describedby="sustainability-help"
                  />
                  <span className="text-brutal text-lg uppercase">
                    PRIORITIZE ECO-FRIENDLY OPTIONS
                  </span>
                </label>
                <p id="sustainability-help" className="text-sm font-mono text-gray-600">
                  SHOW MOST SUSTAINABLE ROUTES FIRST BY DEFAULT
                </p>
              </div>

              {/* Travel Limits */}
              <div className="card-brutal">
                <h3 className="heading-brutal text-lg mb-4">TRAVEL LIMITS</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="maxTravelTime" className="block text-brutal text-sm mb-2 uppercase">
                      MAX TRAVEL TIME (HOURS)
                    </label>
                    <input
                      id="maxTravelTime"
                      type="number"
                      min="0.5"
                      max="48"
                      step="0.5"
                      value={preferences.maxTravelTime ? (preferences.maxTravelTime / 60).toString() : ''}
                      onChange={(e) => {
                        const hours = e.target.value ? parseFloat(e.target.value) : undefined;
                        const minutes = hours ? Math.round(hours * 60) : undefined;
                        updatePreferences({ maxTravelTime: minutes });
                      }}
                      placeholder="NO LIMIT"
                      disabled={isLoading}
                      className="input-brutal w-full text-sm uppercase placeholder:text-neo-gray"
                      aria-describedby="maxTime-help"
                    />
                    <p id="maxTime-help" className="text-xs font-mono mt-1 text-gray-600">
                      MAXIMUM ACCEPTABLE TRAVEL TIME
                    </p>
                  </div>

                  <div>
                    <label htmlFor="budgetLimit" className="block text-brutal text-sm mb-2 uppercase">
                      BUDGET LIMIT ($)
                    </label>
                    <input
                      id="budgetLimit"
                      type="number"
                      min="0"
                      step="10"
                      value={preferences.budgetLimit || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseFloat(e.target.value) : undefined;
                        updatePreferences({ budgetLimit: value });
                      }}
                      placeholder="NO LIMIT"
                      disabled={isLoading}
                      className="input-brutal w-full text-sm uppercase placeholder:text-neo-gray"
                      aria-describedby="budget-help"
                    />
                    <p id="budget-help" className="text-xs font-mono mt-1 text-gray-600">
                      MAXIMUM ACCEPTABLE TRIP COST
                    </p>
                  </div>
                </div>
              </div>

              {/* Default Locations */}
              <div className="card-brutal">
                <h3 className="heading-brutal text-lg mb-4">DEFAULT LOCATIONS</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="defaultOrigin" className="block text-brutal text-sm mb-2 uppercase">
                      DEFAULT ORIGIN
                    </label>
                    <input
                      id="defaultOrigin"
                      type="text"
                      value={preferences.defaultOrigin || ''}
                      onChange={(e) => updatePreferences({ defaultOrigin: e.target.value || undefined })}
                      placeholder="HOME ADDRESS"
                      disabled={isLoading}
                      className="input-brutal w-full text-sm uppercase placeholder:text-neo-gray"
                      aria-describedby="origin-help"
                    />
                    <p id="origin-help" className="text-xs font-mono mt-1 text-gray-600">
                      AUTO-FILL ORIGIN FIELD WITH THIS ADDRESS
                    </p>
                  </div>

                  <div>
                    <label htmlFor="defaultDestination" className="block text-brutal text-sm mb-2 uppercase">
                      DEFAULT DESTINATION
                    </label>
                    <input
                      id="defaultDestination"
                      type="text"
                      value={preferences.defaultDestination || ''}
                      onChange={(e) => updatePreferences({ defaultDestination: e.target.value || undefined })}
                      placeholder="WORK ADDRESS"
                      disabled={isLoading}
                      className="input-brutal w-full text-sm uppercase placeholder:text-neo-gray"
                      aria-describedby="destination-help"
                    />
                    <p id="destination-help" className="text-xs font-mono mt-1 text-gray-600">
                      AUTO-FILL DESTINATION FIELD WITH THIS ADDRESS
                    </p>
                  </div>
                </div>
              </div>

              {/* Preferred Transport Modes */}
              <div className="card-brutal">
                <h3 className="heading-brutal text-lg mb-4 uppercase">
                  PREFERRED TRANSPORT MODES
                </h3>
                <p className="text-sm font-mono mb-3 text-gray-600">
                  CLICK TO TOGGLE TRANSPORT OPTIONS (GREEN = PREFERRED)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {Object.values(TransportMode).map((mode) => {
                    const isSelected = preferences.preferredTransportModes.includes(mode);
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleTransportModeToggle(mode)}
                        disabled={isLoading}
                        className={`p-3 border-4 border-neo-black font-mono font-bold text-xs uppercase transition-all duration-150 ${
                          isSelected
                            ? 'bg-neo-lime text-neo-black shadow-brutal-sm translate-x-1 translate-y-1'
                            : 'bg-neo-white text-neo-black hover:bg-neo-yellow hover:translate-x-1 hover:translate-y-1 hover:shadow-brutal-sm'
                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        aria-pressed={isSelected}
                        aria-label={`${isSelected ? 'Remove' : 'Add'} ${TRANSPORT_MODE_LABELS[mode].toLowerCase()} as preferred transport mode`}
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
                  SELECTED: {preferences.preferredTransportModes.length} OF {Object.values(TransportMode).length} MODES
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div id="notifications-panel" role="tabpanel" aria-labelledby="notifications-tab">
            <div className="card-brutal">
              <h3 className="heading-brutal text-lg mb-4">NOTIFICATION SETTINGS</h3>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.notifications.emailUpdates}
                    onChange={(e) => updateNestedPreferences('notifications', { emailUpdates: e.target.checked })}
                    disabled={isLoading}
                    className="w-6 h-6 border-4 border-neo-black bg-neo-white checked:bg-neo-lime focus:outline-none focus:ring-4 focus:ring-neo-yellow cursor-pointer"
                  />
                  <div>
                    <span className="text-brutal text-lg uppercase">EMAIL UPDATES</span>
                    <p className="text-sm font-mono text-gray-600">RECEIVE UPDATES ABOUT NEW FEATURES</p>
                  </div>
                </label>

                <label className="flex items-center space-x-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.notifications.sustainabilityTips}
                    onChange={(e) => updateNestedPreferences('notifications', { sustainabilityTips: e.target.checked })}
                    disabled={isLoading}
                    className="w-6 h-6 border-4 border-neo-black bg-neo-white checked:bg-neo-lime focus:outline-none focus:ring-4 focus:ring-neo-yellow cursor-pointer"
                  />
                  <div>
                    <span className="text-brutal text-lg uppercase">SUSTAINABILITY TIPS</span>
                    <p className="text-sm font-mono text-gray-600">GET WEEKLY ECO-FRIENDLY TRAVEL TIPS</p>
                  </div>
                </label>

                <label className="flex items-center space-x-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.notifications.routeAlerts}
                    onChange={(e) => updateNestedPreferences('notifications', { routeAlerts: e.target.checked })}
                    disabled={isLoading}
                    className="w-6 h-6 border-4 border-neo-black bg-neo-white checked:bg-neo-lime focus:outline-none focus:ring-4 focus:ring-neo-yellow cursor-pointer"
                  />
                  <div>
                    <span className="text-brutal text-lg uppercase">ROUTE ALERTS</span>
                    <p className="text-sm font-mono text-gray-600">NOTIFY ABOUT DISRUPTIONS ON SAVED ROUTES</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Accessibility Tab */}
        {activeTab === 'accessibility' && (
          <div id="accessibility-panel" role="tabpanel" aria-labelledby="accessibility-tab">
            <div className="card-brutal">
              <h3 className="heading-brutal text-lg mb-4">ACCESSIBILITY SETTINGS</h3>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.accessibility.highContrast}
                    onChange={(e) => updateNestedPreferences('accessibility', { highContrast: e.target.checked })}
                    disabled={isLoading}
                    className="w-6 h-6 border-4 border-neo-black bg-neo-white checked:bg-neo-lime focus:outline-none focus:ring-4 focus:ring-neo-yellow cursor-pointer"
                  />
                  <div>
                    <span className="text-brutal text-lg uppercase">HIGH CONTRAST MODE</span>
                    <p className="text-sm font-mono text-gray-600">INCREASE COLOR CONTRAST FOR BETTER VISIBILITY</p>
                  </div>
                </label>

                <label className="flex items-center space-x-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.accessibility.largeText}
                    onChange={(e) => updateNestedPreferences('accessibility', { largeText: e.target.checked })}
                    disabled={isLoading}
                    className="w-6 h-6 border-4 border-neo-black bg-neo-white checked:bg-neo-lime focus:outline-none focus:ring-4 focus:ring-neo-yellow cursor-pointer"
                  />
                  <div>
                    <span className="text-brutal text-lg uppercase">LARGE TEXT</span>
                    <p className="text-sm font-mono text-gray-600">INCREASE TEXT SIZE FOR BETTER READABILITY</p>
                  </div>
                </label>

                <label className="flex items-center space-x-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.accessibility.reducedMotion}
                    onChange={(e) => updateNestedPreferences('accessibility', { reducedMotion: e.target.checked })}
                    disabled={isLoading}
                    className="w-6 h-6 border-4 border-neo-black bg-neo-white checked:bg-neo-lime focus:outline-none focus:ring-4 focus:ring-neo-yellow cursor-pointer"
                  />
                  <div>
                    <span className="text-brutal text-lg uppercase">REDUCED MOTION</span>
                    <p className="text-sm font-mono text-gray-600">MINIMIZE ANIMATIONS AND TRANSITIONS</p>
                  </div>
                </label>

                <label className="flex items-center space-x-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.accessibility.screenReader}
                    onChange={(e) => updateNestedPreferences('accessibility', { screenReader: e.target.checked })}
                    disabled={isLoading}
                    className="w-6 h-6 border-4 border-neo-black bg-neo-white checked:bg-neo-lime focus:outline-none focus:ring-4 focus:ring-neo-yellow cursor-pointer"
                  />
                  <div>
                    <span className="text-brutal text-lg uppercase">SCREEN READER OPTIMIZED</span>
                    <p className="text-sm font-mono text-gray-600">OPTIMIZE INTERFACE FOR SCREEN READERS</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div id="privacy-panel" role="tabpanel" aria-labelledby="privacy-tab">
            <div className="card-brutal">
              <h3 className="heading-brutal text-lg mb-4">PRIVACY SETTINGS</h3>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.privacy.saveSearchHistory}
                    onChange={(e) => updateNestedPreferences('privacy', { saveSearchHistory: e.target.checked })}
                    disabled={isLoading}
                    className="w-6 h-6 border-4 border-neo-black bg-neo-white checked:bg-neo-lime focus:outline-none focus:ring-4 focus:ring-neo-yellow cursor-pointer"
                  />
                  <div>
                    <span className="text-brutal text-lg uppercase">SAVE SEARCH HISTORY</span>
                    <p className="text-sm font-mono text-gray-600">STORE YOUR SEARCHES FOR FASTER PLANNING</p>
                  </div>
                </label>

                <label className="flex items-center space-x-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.privacy.shareAnonymousData}
                    onChange={(e) => updateNestedPreferences('privacy', { shareAnonymousData: e.target.checked })}
                    disabled={isLoading}
                    className="w-6 h-6 border-4 border-neo-black bg-neo-white checked:bg-neo-lime focus:outline-none focus:ring-4 focus:ring-neo-yellow cursor-pointer"
                  />
                  <div>
                    <span className="text-brutal text-lg uppercase">SHARE ANONYMOUS DATA</span>
                    <p className="text-sm font-mono text-gray-600">HELP IMPROVE ECOTRACK WITH ANONYMOUS USAGE DATA</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};