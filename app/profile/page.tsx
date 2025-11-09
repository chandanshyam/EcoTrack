'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TransportMode, UserPreferences } from '@/lib/types'
import Header from '@/components/Header'

interface UserProfile {
  email: string
  name: string
  preferences: UserPreferences
  createdAt: string
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [prioritizeSustainability, setPrioritizeSustainability] = useState(true)
  const [maxTravelTime, setMaxTravelTime] = useState<number | undefined>()
  const [budgetLimit, setBudgetLimit] = useState<number | undefined>()
  const [preferredTransportModes, setPreferredTransportModes] = useState<TransportMode[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status, router])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      
      const profileData = await response.json()
      setProfile(profileData)
      
      // Update form state
      setName(profileData.name || '')
      setPrioritizeSustainability(profileData.preferences?.prioritizeSustainability ?? true)
      setMaxTravelTime(profileData.preferences?.maxTravelTime)
      setBudgetLimit(profileData.preferences?.budgetLimit)
      setPreferredTransportModes(profileData.preferences?.preferredTransportModes || [])
    } catch (err) {
      setError('Failed to load profile')
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          preferences: {
            prioritizeSustainability,
            maxTravelTime: maxTravelTime || undefined,
            budgetLimit: budgetLimit || undefined,
            preferredTransportModes,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      
      // Show success message (you could add a toast notification here)
      alert('Profile updated successfully!')
    } catch (err) {
      setError('Failed to update profile')
      console.error('Error updating profile:', err)
    } finally {
      setSaving(false)
    }
  }

  const toggleTransportMode = (mode: TransportMode) => {
    setPreferredTransportModes(prev => 
      prev.includes(mode)
        ? prev.filter(m => m !== mode)
        : [...prev, mode]
    )
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-neo-white">
        <Header />
        <div className="container-brutal">
          <div className="text-center mb-12">
            <div className="card-yellow inline-block px-8 py-4 bounce-brutal">
              <p className="text-brutal text-xl">LOADING PROFILE...</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="card-green h-48 bounce-brutal"></div>
            <div className="card-pink h-64 bounce-brutal" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neo-white">
      <Header />
      <div className="container-brutal">
        <div className="text-center mb-12">
          <h1 className="heading-brutal text-4xl md:text-6xl mb-4">
            PROFILE <span className="text-neo-pink">SETTINGS</span>
          </h1>
          <div className="card-cyan inline-block px-6 py-3">
            <p className="text-brutal">CUSTOMIZE YOUR TRAVEL PREFERENCES</p>
          </div>
        </div>

        {error && (
          <div className="status-error mb-8 text-center">
            <p className="text-lg">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Basic Information */}
          <div className="card-green">
            <h2 className="heading-brutal text-2xl mb-6">BASIC INFO</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-brutal text-lg mb-3">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ''}
                  disabled
                  className="input-brutal w-full opacity-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-brutal text-lg mb-3">
                  DISPLAY NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-brutal w-full"
                  placeholder="ENTER YOUR NAME"
                />
              </div>
            </div>
          </div>

          {/* Travel Preferences */}
          <div className="card-yellow">
            <h2 className="heading-brutal text-2xl mb-6">TRAVEL PREFERENCES</h2>
            <div className="space-y-8">
              {/* Sustainability Priority */}
              <div className="card-brutal p-4">
                <label className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={prioritizeSustainability}
                    onChange={(e) => setPrioritizeSustainability(e.target.checked)}
                    className="w-6 h-6 border-4 border-neo-black focus:outline-none"
                  />
                  <span className="text-brutal text-lg">
                    PRIORITIZE SUSTAINABILITY IN ROUTES
                  </span>
                </label>
              </div>

              {/* Time Limit */}
              <div>
                <label className="block text-brutal text-lg mb-3">
                  MAX TRAVEL TIME (MINUTES)
                </label>
                <input
                  type="number"
                  value={maxTravelTime || ''}
                  onChange={(e) => setMaxTravelTime(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="input-brutal w-full"
                  placeholder="NO LIMIT"
                  min="0"
                />
              </div>

              {/* Budget Limit */}
              <div>
                <label className="block text-brutal text-lg mb-3">
                  BUDGET LIMIT (USD)
                </label>
                <input
                  type="number"
                  value={budgetLimit || ''}
                  onChange={(e) => setBudgetLimit(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="input-brutal w-full"
                  placeholder="NO LIMIT"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Transport Modes */}
              <div>
                <label className="block text-brutal text-lg mb-4">
                  PREFERRED TRANSPORT MODES
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.values(TransportMode).map((mode) => (
                    <div key={mode} className="card-brutal p-3">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferredTransportModes.includes(mode)}
                          onChange={() => toggleTransportMode(mode)}
                          className="w-5 h-5 border-3 border-neo-black focus:outline-none"
                        />
                        <span className="text-brutal text-sm uppercase">
                          {mode}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="text-center">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`btn-primary text-xl px-12 py-4 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saving ? (
                <span className="flex items-center space-x-3">
                  <svg className="w-6 h-6 animate-spin" fill="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>SAVING...</span>
                </span>
              ) : (
                'SAVE CHANGES'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}