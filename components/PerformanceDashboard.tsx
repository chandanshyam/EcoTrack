'use client'

import React, { useState, useEffect } from 'react';
import { performanceMonitor, PerformanceStats } from '@/lib/utils/performance';
import { logger, analytics, healthMonitor } from '@/lib/utils/logging';

type PerformanceDashboardProps = {
  className?: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ className = '' }) => {
  const [performanceData, setPerformanceData] = useState<Record<string, PerformanceStats>>({});
  const [logStats, setLogStats] = useState<Record<string, number>>({});
  const [healthStatus, setHealthStatus] = useState<Record<string, any>>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) {
      updateData();
      const interval = setInterval(updateData, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const updateData = async () => {
    // Get performance metrics
    const perfData = performanceMonitor.getSummary();
    setPerformanceData(perfData);

    // Get logging statistics
    const logData = logger.getStats();
    setLogStats(logData);

    // Get health status
    const health = await healthMonitor.runAllChecks();
    setHealthStatus(health);
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getPerformanceColor = (avg: number, threshold: number): string => {
    if (avg < threshold) return 'text-neo-green';
    if (avg < threshold * 2) return 'text-neo-yellow';
    return 'text-neo-red';
  };

  if (!isVisible) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          onClick={() => setIsVisible(true)}
          className="btn-secondary text-xs px-3 py-2"
          title="Show Performance Dashboard"
        >
          📊 PERF
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-y-auto ${className}`}>
      <div className="card-brutal bg-neo-black text-neo-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="heading-brutal text-sm">PERFORMANCE DASHBOARD</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-neo-white hover:text-neo-red text-lg"
          >
            ✕
          </button>
        </div>

        {/* Performance Metrics */}
        <div className="mb-4">
          <h4 className="text-neo-yellow text-xs mb-2">API PERFORMANCE</h4>
          <div className="space-y-1 text-xs">
            {Object.entries(performanceData).map(([name, stats]) => (
              <div key={name} className="flex justify-between">
                <span className="truncate mr-2">{name.replace('api-', '').toUpperCase()}</span>
                <span className={getPerformanceColor(stats.average, 1000)}>
                  {formatDuration(stats.average)} ({stats.count})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Health Status */}
        <div className="mb-4">
          <h4 className="text-neo-yellow text-xs mb-2">HEALTH STATUS</h4>
          <div className="space-y-1 text-xs">
            {Object.entries(healthStatus).map(([name, status]) => (
              <div key={name} className="flex justify-between">
                <span className="truncate mr-2">{name.toUpperCase()}</span>
                <span className={status.healthy ? 'text-neo-green' : 'text-neo-red'}>
                  {status.healthy ? '✅' : '❌'}
                  {status.error && ` ${status.error}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Log Statistics */}
        <div className="mb-4">
          <h4 className="text-neo-yellow text-xs mb-2">LOG STATISTICS</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Total: {logStats.total}</div>
            <div className="text-neo-red">Errors: {logStats.error}</div>
            <div className="text-neo-yellow">Warnings: {logStats.warn}</div>
            <div className="text-neo-blue">Info: {logStats.info}</div>
          </div>
        </div>

        {/* Memory Usage (if available) */}
        {typeof performance !== 'undefined' && (performance as any).memory && (
          <div className="mb-4">
            <h4 className="text-neo-yellow text-xs mb-2">MEMORY USAGE</h4>
            <div className="text-xs space-y-1">
              <div>Used: {formatBytes((performance as any).memory.usedJSHeapSize)}</div>
              <div>Total: {formatBytes((performance as any).memory.totalJSHeapSize)}</div>
              <div>Limit: {formatBytes((performance as any).memory.jsHeapSizeLimit)}</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              performanceMonitor.clear();
              logger.clearLogs();
              analytics.clearEvents();
              updateData();
            }}
            className="btn-secondary text-xs px-2 py-1 flex-1"
          >
            CLEAR
          </button>
          <button
            onClick={() => {
              const data = {
                performance: performanceData,
                logs: logStats,
                health: healthStatus,
                timestamp: new Date().toISOString()
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `ecotrack-performance-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn-secondary text-xs px-2 py-1 flex-1"
          >
            EXPORT
          </button>
        </div>
      </div>
    </div>
  );
};

// Development-only performance overlay
export const DevPerformanceOverlay: React.FC = () => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <PerformanceDashboard />;
};