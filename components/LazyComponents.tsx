/**
 * Lazy-loaded components for better performance
 */

import React, { Suspense } from 'react';
import { createLazyComponent } from '@/lib/utils/performance';

// Loading fallback components
const MapLoadingFallback = () => (
  <div className="card-brutal bg-neo-yellow text-neo-black p-6 h-64 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin w-8 h-8 border-4 border-neo-black border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-brutal">LOADING MAP...</p>
    </div>
  </div>
);

const DashboardLoadingFallback = () => (
  <div className="card-brutal p-6">
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-neo-gray rounded w-1/3"></div>
      <div className="space-y-2">
        <div className="h-4 bg-neo-gray rounded w-full"></div>
        <div className="h-4 bg-neo-gray rounded w-3/4"></div>
        <div className="h-4 bg-neo-gray rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

const HistoryLoadingFallback = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="card-brutal p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-neo-gray rounded w-1/4"></div>
          <div className="h-4 bg-neo-gray rounded w-full"></div>
          <div className="h-4 bg-neo-gray rounded w-2/3"></div>
        </div>
      </div>
    ))}
  </div>
);

// Lazy-loaded components
export const LazyInteractiveMap = createLazyComponent(
  () => import('./InteractiveMap'),
  MapLoadingFallback
);

export const LazySustainabilityDashboard = createLazyComponent(
  () => import('./SustainabilityDashboard'),
  DashboardLoadingFallback
);

export const LazyTravelHistory = createLazyComponent(
  () => import('./TravelHistory'),
  HistoryLoadingFallback
);

// Wrapper components with Suspense
export const InteractiveMapWithSuspense: React.FC<React.ComponentProps<typeof LazyInteractiveMap>> = (props) => (
  <Suspense fallback={<MapLoadingFallback />}>
    <LazyInteractiveMap {...props} />
  </Suspense>
);

export const SustainabilityDashboardWithSuspense: React.FC<React.ComponentProps<typeof LazySustainabilityDashboard>> = (props) => (
  <Suspense fallback={<DashboardLoadingFallback />}>
    <LazySustainabilityDashboard {...props} />
  </Suspense>
);

export const TravelHistoryWithSuspense: React.FC<React.ComponentProps<typeof LazyTravelHistory>> = (props) => (
  <Suspense fallback={<HistoryLoadingFallback />}>
    <LazyTravelHistory {...props} />
  </Suspense>
);

// Generic lazy wrapper for any component
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  LoadingFallback?: React.ComponentType
) {
  const LazyComponent = React.lazy(() => Promise.resolve({ default: Component }));

  const LazyWrapper = React.forwardRef<any, P>((props, ref) => (
    <Suspense fallback={LoadingFallback ? <LoadingFallback /> : <div>Loading...</div>}>
      <LazyComponent {...props} ref={ref} />
    </Suspense>
  ));

  LazyWrapper.displayName = `LazyLoaded(${Component.displayName || Component.name || 'Component'})`;

  return LazyWrapper;
}

// Performance-optimized image component
export const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}> = ({ src, alt, width, height, className, priority = false }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  return (
    <div className={`relative ${className || ''}`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-neo-gray animate-pulse flex items-center justify-center">
          <div className="text-neo-black text-sm">LOADING...</div>
        </div>
      )}
      
      {hasError ? (
        <div className="bg-neo-red text-neo-white p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <div className="text-sm">IMAGE FAILED TO LOAD</div>
          </div>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className || ''}`}
        />
      )}
    </div>
  );
};