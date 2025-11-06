'use client'

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { UserPreferencesManager, UserPreferencesData } from '@/components/UserPreferencesManager';
import { TransportMode } from '@/lib/types';

// Default preferences
const DEFAULT_PREFERENCES: UserPreferencesData = {
  prioritizeSustainability: true,
  maxTravelTime: undefined,
  budgetLimit: undefined,
  preferredTransportModes: [TransportMode.TRAIN, TransportMode.BUS, TransportMode.WALK, TransportMode.BIKE],
  defaultOrigin: undefined,
  defaultDestination: undefined,
  notifications: {
    emailUpdates: false,
    sustainabilityTips: true,
    routeAlerts: false,
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReader: false,
  },
  privacy: {
    saveSearchHistory: true,
    shareAnonymousData: false,
  },
};

export default function PreferencesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferencesData>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/preferences');
    }
  }, [status, router]);

  // Load user preferences on mount
  useEffect(() => {
    if (session?.user?.email) {
      loadUserPreferences();
    }
  }, [session]);

  const loadUserPreferences = async () => {
    if (!session?.user?.email) return;

    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch('/api/user/preferences');
      
      if (response.ok) {
        const data = await response.json();
        setPreferences({ ...DEFAULT_PREFERENCES, ...data.preferences });
      } else if (response.status === 404) {
        // User preferences don't exist yet, use defaults
        setPreferences(DEFAULT_PREFERENCES);
      } else {
        throw new Error('Failed to load preferences');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      setLoadError('Failed to load your preferences. Using default settings.');
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserPreferences = async (newPreferences: UserPreferencesData) => {
    if (!session?.user?.email) {
      throw new Error('You must be signed in to save preferences');
    }

    const response = await fetch('/api/user/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ preferences: newPreferences }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save preferences');
    }

    return response.json();
  };

  const handleReset = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neo-white">
        <Header />
        <div className="container-brutal">
          <div className="text-center mt-16">
            <div className="card-yellow inline-block px-8 py-4 mb-4">
              <p className="text-brutal text-xl">LOADING...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-neo-white">
      <Header />
      <div className="container-brutal">
        <main>
          {/* Page Header */}
          <div className="mb-8">
            <div className="card-brutal text-center">
              <div className="text-6xl mb-4">⚙️</div>
              <h1 className="heading-brutal text-4xl mb-4">
                USER PREFERENCES
              </h1>
              <div className="card-cyan inline-block px-6 py-3 mb-4">
                <p className="text-brutal">CUSTOMIZE YOUR ECOTRACK EXPERIENCE</p>
              </div>
              {session?.user?.email && (
                <p className="text-brutal text-sm opacity-75">
                  SIGNED IN AS: {session.user.email.toUpperCase()}
                </p>
              )}
            </div>
          </div>

          {/* Load Error */}
          {loadError && (
            <div className="status-error mb-6">
              <h3 className="text-lg mb-2">NOTICE</h3>
              <p>{loadError}</p>
            </div>
          )}

          {/* Preferences Manager */}
          <UserPreferencesManager
            preferences={preferences}
            onChange={setPreferences}
            onSave={saveUserPreferences}
            onReset={handleReset}
            isLoading={isLoading}
          />

          {/* Help Section */}
          <div className="mt-12 card-brutal">
            <h2 className="heading-brutal text-xl mb-4">NEED HELP?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card-cyan">
                <h3 className="heading-brutal text-lg mb-3">ACCESSIBILITY</h3>
                <p className="text-brutal text-sm mb-3">
                  ECOTRACK FOLLOWS WCAG 2.1 GUIDELINES FOR ACCESSIBILITY.
                </p>
                <ul className="text-brutal text-sm space-y-1">
                  <li>• KEYBOARD NAVIGATION SUPPORTED</li>
                  <li>• SCREEN READER COMPATIBLE</li>
                  <li>• HIGH CONTRAST MODE AVAILABLE</li>
                  <li>• REDUCED MOTION OPTIONS</li>
                </ul>
              </div>
              
              <div className="card-yellow">
                <h3 className="heading-brutal text-lg mb-3">PRIVACY</h3>
                <p className="text-brutal text-sm mb-3">
                  YOUR DATA IS SECURE AND UNDER YOUR CONTROL.
                </p>
                <ul className="text-brutal text-sm space-y-1">
                  <li>• SEARCH HISTORY IS OPTIONAL</li>
                  <li>• ANONYMOUS DATA SHARING IS OPT-IN</li>
                  <li>• DELETE YOUR DATA ANYTIME</li>
                  <li>• NO THIRD-PARTY TRACKING</li>
                </ul>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center mt-16">
          <div className="divider-brutal"></div>
          <div className="card-teal inline-block px-8 py-4">
            <p className="text-brutal text-lg">
              &copy; {new Date().getFullYear()} ECOTRACK - YOUR PREFERENCES, YOUR CONTROL
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}