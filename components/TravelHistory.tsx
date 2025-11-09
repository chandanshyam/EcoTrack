'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CompletedTrip, TransportMode } from '@/lib/types'

interface TravelHistoryProps {
  className?: string
}

interface FilterOptions {
  sortBy: 'date' | 'carbon' | 'sustainability'
  sortOrder: 'asc' | 'desc'
  transportMode: 'all' | TransportMode
  dateRange: 'all' | 'week' | 'month' | 'year'
}

export default function TravelHistory({ className = '' }: TravelHistoryProps) {
  const { data: session } = useSession()
  const [trips, setTrips] = useState<CompletedTrip[]>([])
  const [filteredTrips, setFilteredTrips] = useState<CompletedTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTrip, setSelectedTrip] = useState<CompletedTrip | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: 'date',
    sortOrder: 'desc',
    transportMode: 'all',
    dateRange: 'all'
  })

  useEffect(() => {
    if (session?.user?.email) {
      fetchTravelHistory()
    }
  }, [session])

  useEffect(() => {
    applyFilters()
  }, [trips, filters]) // applyFilters is stable since it doesn't depend on changing values

  const fetchTravelHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/history')
      if (!response.ok) {
        throw new Error('Failed to fetch travel history')
      }
      
      const data = await response.json()
      setTrips(data.trips || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load travel history')
      console.error('Travel history fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to safely format dates
  const formatTripDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'Date not available'

    try {
      const dateObj = date instanceof Date ? date : new Date(date)
      if (isNaN(dateObj.getTime())) return 'Invalid date'

      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Date error'
    }
  }

  const applyFilters = () => {
    let filtered = [...trips]

    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const cutoffDate = new Date()

      switch (filters.dateRange) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7)
          break
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1)
          break
      }
      
      filtered = filtered.filter(trip => {
        if (!trip.completedAt) return false
        const tripDate = trip.completedAt instanceof Date ? trip.completedAt : new Date(trip.completedAt)
        return tripDate >= cutoffDate
      })
    }

    // Apply transport mode filter
    if (filters.transportMode !== 'all') {
      filtered = filtered.filter(trip => 
        trip.route.transportModes.some(segment => segment.mode === filters.transportMode)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (filters.sortBy) {
        case 'date': {
          // Safely handle null/undefined dates
          const dateA = a.completedAt ? (a.completedAt instanceof Date ? a.completedAt : new Date(a.completedAt)) : new Date(0)
          const dateB = b.completedAt ? (b.completedAt instanceof Date ? b.completedAt : new Date(b.completedAt)) : new Date(0)
          comparison = dateA.getTime() - dateB.getTime()
          break
        }
        case 'carbon':
          comparison = a.carbonFootprint - b.carbonFootprint
          break
        case 'sustainability':
          comparison = a.route.sustainabilityScore - b.route.sustainabilityScore
          break
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison
    })

    setFilteredTrips(filtered)
  }

  const formatCarbonAmount = (kg: number): string => {
    if (kg < 1) return `${Math.round(kg * 1000)}g`
    if (kg < 1000) return `${Math.round(kg * 10) / 10}kg`
    return `${Math.round(kg / 100) / 10}t`
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const kmToMiles = (km: number): number => {
    return Math.round(km * 0.621371)
  }

  const getSustainabilityScoreColor = (score: number): string => {
    if (score >= 80) return 'card-green'
    if (score >= 60) return 'card-yellow'
    if (score >= 40) return 'card-teal'
    return 'card-coral'
  }

  const getTransportModeIcon = (mode: TransportMode): string => {
    const icons = {
      [TransportMode.CAR]: '🚗',
      [TransportMode.TRAIN]: '🚆',
      [TransportMode.BUS]: '🚌',
      [TransportMode.PLANE]: '✈️'
    }
    return icons[mode] || '🚗'
  }

  const compareTrips = (trip1: CompletedTrip, trip2: CompletedTrip) => {
    setSelectedTrip(null) // Close any open trip details
    // This would open a comparison modal in a full implementation
    console.log('Comparing trips:', trip1.id, 'vs', trip2.id)
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="card-brutal">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neo-mustard border-4 border-neo-black w-1/3"></div>
            <div className="space-y-3">
              <div className="h-20 bg-neo-lime border-4 border-neo-black"></div>
              <div className="h-20 bg-neo-cyan border-4 border-neo-black"></div>
              <div className="h-20 bg-neo-coral border-4 border-neo-black"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`card-brutal ${className}`}>
        <div className="text-center py-8">
          <div className="status-error inline-block mb-4">
            ERROR LOADING HISTORY
          </div>
          <p className="text-brutal mb-4">{error}</p>
          <button 
            onClick={fetchTravelHistory}
            className="btn-primary"
          >
            RETRY
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Filters */}
      <div className="card-brutal">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <h2 className="heading-brutal text-3xl">TRAVEL HISTORY</h2>
          <div className="status-info">
            {filteredTrips.length} OF {trips.length} TRIPS
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-brutal text-sm mb-2 block">SORT BY</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as FilterOptions['sortBy'] }))}
              className="input-brutal w-full text-sm"
            >
              <option value="date">DATE</option>
              <option value="carbon">CARBON FOOTPRINT</option>
              <option value="sustainability">SUSTAINABILITY</option>
            </select>
          </div>

          <div>
            <label className="text-brutal text-sm mb-2 block">ORDER</label>
            <select
              value={filters.sortOrder}
              onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as FilterOptions['sortOrder'] }))}
              className="input-brutal w-full text-sm"
            >
              <option value="desc">NEWEST FIRST</option>
              <option value="asc">OLDEST FIRST</option>
            </select>
          </div>

          <div>
            <label className="text-brutal text-sm mb-2 block">TRANSPORT MODE</label>
            <select
              value={filters.transportMode}
              onChange={(e) => setFilters(prev => ({ ...prev, transportMode: e.target.value as FilterOptions['transportMode'] }))}
              className="input-brutal w-full text-sm"
            >
              <option value="all">ALL MODES</option>
              <option value={TransportMode.CAR}>CAR</option>
              <option value={TransportMode.TRAIN}>TRAIN</option>
              <option value={TransportMode.BUS}>BUS</option>
              <option value={TransportMode.PLANE}>PLANE</option>
            </select>
          </div>

          <div>
            <label className="text-brutal text-sm mb-2 block">TIME PERIOD</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as FilterOptions['dateRange'] }))}
              className="input-brutal w-full text-sm"
            >
              <option value="all">ALL TIME</option>
              <option value="week">LAST WEEK</option>
              <option value="month">LAST MONTH</option>
              <option value="year">LAST YEAR</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trip List */}
      {filteredTrips.length === 0 ? (
        <div className="card-brutal">
          <div className="text-center py-12">
            <div className="card-yellow inline-block p-6 mb-6">
              <svg className="w-16 h-16 text-neo-black mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="heading-brutal text-2xl mb-4">NO TRIPS FOUND</h3>
            <p className="text-brutal mb-6">
              {trips.length === 0 
                ? 'START PLANNING YOUR FIRST SUSTAINABLE TRIP!' 
                : 'TRY ADJUSTING YOUR FILTERS TO SEE MORE TRIPS.'
              }
            </p>
            {filters.dateRange !== 'all' || filters.transportMode !== 'all' ? (
              <button
                onClick={() => setFilters({
                  sortBy: 'date',
                  sortOrder: 'desc',
                  transportMode: 'all',
                  dateRange: 'all'
                })}
                className="btn-secondary"
              >
                CLEAR FILTERS
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTrips.map((trip) => (
            <div key={trip.id} className="card-brutal">
              <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                {/* Trip Basic Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="heading-brutal text-lg mb-1">
                        {trip.route.origin.address} → {trip.route.destination.address}
                      </h3>
                      <p className="text-brutal text-sm text-gray-600">
                        {formatTripDate(trip.completedAt)}
                      </p>
                    </div>
                    <div className={`${getSustainabilityScoreColor(trip.route.sustainabilityScore)} px-3 py-1 text-center`}>
                      <p className="text-brutal text-xs">SCORE</p>
                      <p className="heading-brutal text-lg">{Math.round(trip.route.sustainabilityScore)}</p>
                    </div>
                  </div>

                  {/* Transport Modes */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {trip.route.transportModes.map((segment, index) => (
                      <div key={index} className="flex items-center gap-1 bg-neo-white border-2 border-neo-black px-2 py-1">
                        <span className="text-lg">{getTransportModeIcon(segment.mode)}</span>
                        <span className="text-brutal text-xs uppercase">{segment.mode}</span>
                      </div>
                    ))}
                  </div>

                  {/* Trip Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center">
                      <p className="text-brutal text-xs mb-1">DURATION</p>
                      <p className="text-brutal text-sm">{formatDuration(trip.route.totalDuration)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-brutal text-xs mb-1">DISTANCE</p>
                      <p className="text-brutal text-sm">{kmToMiles(trip.route.totalDistance)} mi</p>
                    </div>
                    <div className="text-center">
                      <p className="text-brutal text-xs mb-1">CARBON</p>
                      <p className="text-brutal text-sm">{formatCarbonAmount(trip.carbonFootprint)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-brutal text-xs mb-1">SAVED</p>
                      <p className="text-brutal text-sm text-green-700">{formatCarbonAmount(trip.carbonSaved)}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setSelectedTrip(selectedTrip?.id === trip.id ? null : trip)}
                    className="btn-brutal bg-neo-cyan px-4 py-2 text-sm"
                  >
                    {selectedTrip?.id === trip.id ? 'HIDE DETAILS' : 'VIEW DETAILS'}
                  </button>
                  <button
                    onClick={() => compareTrips(trip, trip)} // In real implementation, this would open comparison modal
                    className="btn-brutal bg-neo-mustard px-4 py-2 text-sm"
                    disabled
                  >
                    COMPARE
                  </button>
                </div>
              </div>

              {/* Expanded Trip Details */}
              {selectedTrip?.id === trip.id && (
                <div className="mt-6 pt-6 border-t-4 border-neo-black">
                  <h4 className="heading-brutal text-lg mb-4">TRIP DETAILS</h4>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Route Segments */}
                    <div>
                      <h5 className="text-brutal mb-3">ROUTE SEGMENTS</h5>
                      <div className="space-y-2">
                        {trip.route.transportModes.map((segment, index) => (
                          <div key={index} className="bg-neo-white border-2 border-neo-black p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getTransportModeIcon(segment.mode)}</span>
                                <span className="text-brutal uppercase">{segment.mode}</span>
                              </div>
                              <span className="text-brutal text-sm">{formatDuration(segment.duration)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <p className="text-brutal">DISTANCE</p>
                                <p>{kmToMiles(segment.distance)} mi</p>
                              </div>
                              <div>
                                <p className="text-brutal">CARBON</p>
                                <p>{formatCarbonAmount(segment.carbonEmission)}</p>
                              </div>
                              <div>
                                <p className="text-brutal">COST</p>
                                <p>${segment.cost.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Environmental Impact */}
                    <div>
                      <h5 className="text-brutal mb-3">ENVIRONMENTAL IMPACT</h5>
                      <div className="space-y-3">
                        <div className="card-green p-4">
                          <p className="text-brutal text-sm mb-1">CARBON SAVED</p>
                          <p className="heading-brutal text-2xl">{formatCarbonAmount(trip.carbonSaved)}</p>
                          <p className="text-brutal text-xs mt-1">vs conventional travel</p>
                        </div>
                        
                        <div className="card-yellow p-4">
                          <p className="text-brutal text-sm mb-1">ACTUAL FOOTPRINT</p>
                          <p className="heading-brutal text-2xl">{formatCarbonAmount(trip.carbonFootprint)}</p>
                          <p className="text-brutal text-xs mt-1">total emissions</p>
                        </div>
                        
                        <div className="card-teal p-4">
                          <p className="text-brutal text-sm mb-1">TOTAL COST</p>
                          <p className="heading-brutal text-2xl">${trip.route.totalCost.toFixed(2)}</p>
                          <p className="text-brutal text-xs mt-1">all transport modes</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}