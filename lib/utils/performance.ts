/**
 * Performance monitoring and optimization utilities
 */

export type PerformanceMetric = {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export type PerformanceStats = {
  average: number;
  min: number;
  max: number;
  count: number;
  total: number;
}

/**
 * Performance monitor for tracking function execution times
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private readonly maxMetricsPerName: number;

  constructor(maxMetricsPerName = 100) {
    this.maxMetricsPerName = maxMetricsPerName;
  }

  /**
   * Start timing a function
   */
  startTiming(name: string): () => void {
    const startTime = performance.now();
    
    return (metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, metadata);
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    // Keep only the most recent metrics
    if (metrics.length > this.maxMetricsPerName) {
      metrics.shift();
    }
  }

  /**
   * Get statistics for a metric
   */
  getStats(name: string): PerformanceStats | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration);
    const total = durations.reduce((sum, d) => sum + d, 0);

    return {
      average: total / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      count: durations.length,
      total
    };
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get recent metrics for a name
   */
  getRecentMetrics(name: string, count = 10): PerformanceMetric[] {
    const metrics = this.metrics.get(name);
    if (!metrics) {
      return [];
    }

    return metrics.slice(-count);
  }

  /**
   * Clear metrics for a name or all metrics
   */
  clear(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, PerformanceStats> {
    const summary: Record<string, PerformanceStats> = {};
    
    const metricNames = Array.from(this.metrics.keys());
    for (const name of metricNames) {
      const stats = this.getStats(name);
      if (stats) {
        summary[name] = stats;
      }
    }

    return summary;
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for timing function execution
 */
export function timed(name?: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (this: any, ...args: any[]) {
      const endTiming: (metadata?: Record<string, any>) => void = performanceMonitor.startTiming(metricName);

      try {
        const result = originalMethod.apply(this, args);
        
        // Handle async functions
        if (result && typeof result.then === 'function') {
          return result.finally(() => endTiming());
        }
        
        endTiming();
        return result;
      } catch (error: unknown) {
        endTiming({ error: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
      }
    } as T;

    return descriptor;
  };
}

/**
 * Higher-order function for timing async functions
 */
export function withTiming<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  name: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const endTiming: (metadata?: Record<string, any>) => void = performanceMonitor.startTiming(name);

    try {
      const result = await fn(...args);
      endTiming({ success: true });
      return result;
    } catch (error) {
      endTiming({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  };
}

/**
 * Debounce function to limit function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function to limit function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memoization with TTL support
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  ttl = 5 * 60 * 1000, // 5 minutes default
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    const now = Date.now();
    
    const cached = cache.get(key);
    if (cached && (now - cached.timestamp) < ttl) {
      return cached.value;
    }

    const result = fn(...args);
    cache.set(key, { value: result, timestamp: now });
    
    // Clean up expired entries periodically
    if (cache.size > 100) {
      const keysToDelete: string[] = [];
      cache.forEach((v, k) => {
        if (now - v.timestamp > ttl) {
          keysToDelete.push(k);
        }
      });
      keysToDelete.forEach(key => cache.delete(key));
    }

    return result;
  }) as T;
}

/**
 * Lazy loading utility for components
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
): React.LazyExoticComponent<T> {
  const LazyComponent = React.lazy(importFn);
  
  if (fallback) {
    return React.lazy(async () => {
      try {
        return await importFn();
      } catch (error) {
        console.warn('Lazy component loading failed, using fallback:', error);
        return { default: fallback as T };
      }
    });
  }
  
  return LazyComponent;
}

/**
 * Performance observer for Web Vitals (client-side only)
 */
export class WebVitalsMonitor {
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window === 'undefined') return;

    this.observeLCP();
    this.observeFID();
    this.observeCLS();
  }

  private observeLCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        performanceMonitor.recordMetric('web-vitals-lcp', lastEntry.startTime, {
          type: 'Largest Contentful Paint',
          element: (lastEntry as any).element?.tagName
        });
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('LCP observation not supported:', error);
    }
  }

  private observeFID() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fidEntry = entry as any;
          performanceMonitor.recordMetric('web-vitals-fid', fidEntry.processingStart - entry.startTime, {
            type: 'First Input Delay',
            eventType: fidEntry.name
          });
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('FID observation not supported:', error);
    }
  }

  private observeCLS() {
    try {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });

        performanceMonitor.recordMetric('web-vitals-cls', clsValue, {
          type: 'Cumulative Layout Shift'
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('CLS observation not supported:', error);
    }
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Initialize Web Vitals monitoring on client side
let webVitalsMonitor: WebVitalsMonitor | null = null;
if (typeof window !== 'undefined') {
  webVitalsMonitor = new WebVitalsMonitor();
}

export { webVitalsMonitor };

// React import for lazy loading
import React from 'react';