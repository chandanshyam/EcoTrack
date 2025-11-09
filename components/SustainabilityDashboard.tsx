'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface AnalyticsData {
  metrics: {
    totalCarbonFootprint: number
    totalCarbonSaved: number
    totalTrips: number
    averageSustainabilityScore: number
  }
  trends: Array<{
    period: string
    carbonFootprint: number
    carbonSaved: number
    sustainabilityScore: number
  }>
  insights: {
    mostSustainableMonth: string
    averageTripsPerMonth: number
    topTransportModes: Array<{
      mode: string
      count: number
      carbonSaved: number
    }>
    sustainabilityImprovement: number
    goalProgress?: {
      target: number
      current: number
      percentage: number
    }
  }
  monthlyMetrics: Array<{
    month: string
    carbonFootprint: number
    carbonSaved: number
    tripCount: number
    sustainabilityScore: number
  }>
}

interface SustainabilityDashboardProps {
  className?: string
}

export default function SustainabilityDashboard({ className = '' }: SustainabilityDashboardProps) {
  const { data: session } = useSession()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year'>('month')

  useEffect(() => {
    if (session?.user?.email) {
      fetchAnalytics()
    }
  }, [session, selectedPeriod]) // fetchAnalytics is stable since it doesn't depend on changing values

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/user/analytics?period=${selectedPeriod}`)
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }
      
      const data = await response.json()
      setAnalyticsData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
      console.error('Analytics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCarbonAmount = (kg: number): string => {
    if (kg < 1) return `${Math.round(kg * 1000)}g`
    if (kg < 1000) return `${Math.round(kg * 10) / 10}kg`
    return `${Math.round(kg / 100) / 10}t`
  }

  const getSustainabilityScoreColor = (score: number): string => {
    if (score >= 80) return 'card-green'
    if (score >= 60) return 'card-yellow'
    if (score >= 40) return 'card-teal'
    return 'card-coral'
  }

  const getImprovementIndicator = (improvement: number) => {
    if (improvement > 5) return { text: 'EXCELLENT PROGRESS', color: 'status-success' }
    if (improvement > 0) return { text: 'IMPROVING', color: 'status-info' }
    if (improvement > -5) return { text: 'STABLE', color: 'status-warning' }
    return { text: 'NEEDS ATTENTION', color: 'status-error' }
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="card-brutal">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neo-mustard border-4 border-neo-black w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="h-24 bg-neo-lime border-4 border-neo-black"></div>
              <div className="h-24 bg-neo-cyan border-4 border-neo-black"></div>
              <div className="h-24 bg-neo-coral border-4 border-neo-black"></div>
              <div className="h-24 bg-neo-teal border-4 border-neo-black"></div>
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
            ERROR LOADING DASHBOARD
          </div>
          <p className="text-brutal mb-4">{error}</p>
          <button 
            onClick={fetchAnalytics}
            className="btn-primary"
          >
            RETRY
          </button>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className={`card-brutal ${className}`}>
        <div className="text-center py-8">
          <div className="status-info inline-block">
            NO DATA AVAILABLE
          </div>
        </div>
      </div>
    )
  }

  const { metrics, insights, trends } = analyticsData
  const improvementIndicator = getImprovementIndicator(insights.sustainabilityImprovement)

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header with Period Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="heading-brutal text-3xl">SUSTAINABILITY DASHBOARD</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`btn-brutal px-4 py-2 text-sm ${
              selectedPeriod === 'month' ? 'bg-neo-lime' : 'bg-neo-white'
            }`}
          >
            MONTHLY
          </button>
          <button
            onClick={() => setSelectedPeriod('year')}
            className={`btn-brutal px-4 py-2 text-sm ${
              selectedPeriod === 'year' ? 'bg-neo-lime' : 'bg-neo-white'
            }`}
          >
            YEARLY
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-green text-center">
          <div className="mb-3">
            <svg className="w-10 h-10 mx-auto text-neo-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-brutal text-sm mb-2">TOTAL TRIPS</p>
          <p className="heading-brutal text-3xl">{metrics.totalTrips}</p>
        </div>

        <div className="card-cyan text-center">
          <div className="mb-3">
            <svg className="w-10 h-10 mx-auto text-neo-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <p className="text-brutal text-sm mb-2">CO₂ SAVED</p>
          <p className="heading-brutal text-2xl">{formatCarbonAmount(metrics.totalCarbonSaved)}</p>
        </div>

        <div className="card-coral text-center">
          <div className="mb-3">
            <svg className="w-10 h-10 mx-auto text-neo-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <p className="text-brutal text-sm mb-2">AVG. SUSTAINABILITY</p>
          <p className="heading-brutal text-2xl">{Math.round(metrics.averageSustainabilityScore)}/100</p>
        </div>

        <div className="card-yellow text-center">
          <div className="mb-3">
            <svg className="w-10 h-10 mx-auto text-neo-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-brutal text-sm mb-2">CARBON FOOTPRINT</p>
          <p className="heading-brutal text-2xl">{formatCarbonAmount(metrics.totalCarbonFootprint)}</p>
        </div>
      </div>

      {/* Progress and Goals */}
      {insights.goalProgress && (
        <div className="card-brutal">
          <h3 className="heading-brutal text-2xl mb-6">SUSTAINABILITY GOAL PROGRESS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-brutal">CARBON REDUCTION TARGET</span>
                <span className="text-brutal">{Math.round(insights.goalProgress.current)}%</span>
              </div>
              <div className="bg-neo-white border-4 border-neo-black h-6 relative">
                <div 
                  className="bg-neo-lime h-full border-r-4 border-neo-black transition-all duration-500"
                  style={{ width: `${Math.min(insights.goalProgress.percentage, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-brutal mt-2">
                <span>0%</span>
                <span>{insights.goalProgress.target}% TARGET</span>
              </div>
            </div>
            <div className={`${getSustainabilityScoreColor(insights.goalProgress.percentage)} text-center p-4`}>
              <p className="text-brutal text-sm mb-2">GOAL COMPLETION</p>
              <p className="heading-brutal text-3xl">{Math.round(insights.goalProgress.percentage)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Insights and Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card-brutal">
          <h3 className="heading-brutal text-2xl mb-6">KEY INSIGHTS</h3>
          <div className="space-y-4">
            <div className="card-teal p-4">
              <p className="text-brutal text-sm mb-1">MOST SUSTAINABLE MONTH</p>
              <p className="heading-brutal text-lg">{insights.mostSustainableMonth}</p>
            </div>
            
            <div className="card-yellow p-4">
              <p className="text-brutal text-sm mb-1">AVG. TRIPS PER MONTH</p>
              <p className="heading-brutal text-lg">{insights.averageTripsPerMonth}</p>
            </div>
            
            <div className={`p-4 ${improvementIndicator.color}`}>
              <p className="text-brutal text-sm mb-1">SUSTAINABILITY TREND</p>
              <p className="heading-brutal text-lg">{improvementIndicator.text}</p>
              <p className="text-brutal text-xs mt-1">
                {insights.sustainabilityImprovement > 0 ? '+' : ''}{insights.sustainabilityImprovement} points
              </p>
            </div>
          </div>
        </div>

        <div className="card-brutal">
          <h3 className="heading-brutal text-2xl mb-6">TOP TRANSPORT MODES</h3>
          <div className="space-y-3">
            {insights.topTransportModes.slice(0, 5).map((mode, index) => (
              <div key={mode.mode} className="flex items-center justify-between p-3 bg-neo-white border-2 border-neo-black">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 flex items-center justify-center text-xs font-bold border-2 border-neo-black ${
                    index === 0 ? 'bg-neo-lime' : index === 1 ? 'bg-neo-mustard' : 'bg-neo-cyan'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-brutal uppercase">{mode.mode}</span>
                </div>
                <div className="text-right">
                  <p className="text-brutal text-sm">{formatCarbonAmount(mode.carbonSaved)} SAVED</p>
                  <p className="text-brutal text-xs">{mode.count} TRIPS</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Simple Trend Chart */}
      <div className="card-brutal">
        <h3 className="heading-brutal text-2xl mb-6">SUSTAINABILITY TRENDS</h3>
        <div className="space-y-4">
          {trends.slice(-6).map((trend, index) => (
            <div key={trend.period} className="flex items-center gap-4">
              <div className="w-24 text-brutal text-sm">{trend.period.split(' ').slice(-1)[0]}</div>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 bg-neo-white border-2 border-neo-black h-6 relative">
                  <div 
                    className="bg-neo-lime h-full border-r-2 border-neo-black"
                    style={{ width: `${Math.min(trend.sustainabilityScore, 100)}%` }}
                  ></div>
                </div>
                <div className="w-16 text-brutal text-sm text-right">
                  {Math.round(trend.sustainabilityScore)}/100
                </div>
              </div>
              <div className="w-20 text-brutal text-xs text-right">
                {formatCarbonAmount(trend.carbonSaved)} saved
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}