'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { RouteOption, TransportMode, TransportSegment } from '@/lib/types';
import { env } from '@/lib/env';

// Declare global google maps types
declare global {
  interface Window {
    google: typeof google;
    selectRoute: (routeId: string) => void;
  }
}

interface InteractiveMapProps {
  routes: RouteOption[];
  selectedRouteId?: string;
  onRouteSelect?: (routeId: string) => void;
  className?: string;
}

interface MapMarker {
  marker: google.maps.Marker;
  infoWindow: google.maps.InfoWindow;
}

interface RoutePolyline {
  polyline: google.maps.Polyline;
  routeId: string;
}

const TRANSPORT_MODE_COLORS: Record<TransportMode, string> = {
  [TransportMode.CAR]: '#b59595', // dull red
  [TransportMode.TRAIN]: '#a5b5a5', // dull green
  [TransportMode.BUS]: '#d4b896', // dull amber
  [TransportMode.PLANE]: '#a595b5', // dull violet
  [TransportMode.BIKE]: '#9bb5b5', // dull cyan
  [TransportMode.WALK]: '#a5b5a5', // dull lime
  [TransportMode.METRO]: '#8a9bb5', // dull blue
};

const TRANSPORT_MODE_ICONS: Record<TransportMode, string> = {
  [TransportMode.CAR]: '🚗',
  [TransportMode.TRAIN]: '🚆',
  [TransportMode.BUS]: '🚌',
  [TransportMode.PLANE]: '✈️',
  [TransportMode.BIKE]: '🚴',
  [TransportMode.WALK]: '🚶',
  [TransportMode.METRO]: '🚇',
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  routes,
  selectedRouteId,
  onRouteSelect,
  className = ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<MapMarker[]>([]);
  const polylinesRef = useRef<RoutePolyline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    try {
      // Default center (will be adjusted based on routes)
      const defaultCenter = { lat: 40.7128, lng: -74.0060 }; // New York

      const map = new google.maps.Map(mapRef.current, {
        zoom: 10,
        center: defaultCenter,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: 'all',
            elementType: 'geometry.fill',
            stylers: [{ color: '#f0f0eb' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry.fill',
            stylers: [{ color: '#9bb5b5' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#2a2a2a' }, { weight: 1 }]
          },
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'simplified' }]
          }
        ],
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });

      mapInstanceRef.current = map;
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to create Google Maps:', err);
      setError('Failed to create Google Maps');
      setIsLoading(false);
    }
  }, []);

  // Initialize Google Maps
  const initializeMap = useCallback(async () => {
    if (!mapRef.current || !env.GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key is required');
      setIsLoading(false);
      return;
    }

    try {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        createMap();
        return;
      }

      // Set Google Maps API options
      setOptions({
        key: env.GOOGLE_MAPS_API_KEY,
        v: 'weekly',
        libraries: ['geometry', 'places']
      });

      // Load the Google Maps API
      await importLibrary('maps');

      createMap();
    } catch (err) {
      console.error('Failed to initialize Google Maps:', err);
      setError('Failed to load Google Maps');
      setIsLoading(false);
    }
  }, [createMap]);

  // Clear all map elements
  const clearMapElements = useCallback(() => {
    // Clear markers
    markersRef.current.forEach(({ marker, infoWindow }) => {
      marker.setMap(null);
      infoWindow.close();
    });
    markersRef.current = [];

    // Clear polylines
    polylinesRef.current.forEach(({ polyline }) => {
      polyline.setMap(null);
    });
    polylinesRef.current = [];
  }, []);

  // Create sustainability info window content
  const createSustainabilityInfoContent = useCallback((route: RouteOption): string => {
    const sustainabilityColor = route.sustainabilityScore >= 80 ? '#a5b5a5' :
      route.sustainabilityScore >= 60 ? '#d4b896' : '#b59595';

    return `
      <div style="font-family: 'Courier New', monospace; max-width: 300px; padding: 8px;">
        <div style="background: #2a2a2a; color: #f5f5f0; padding: 8px; margin: -8px -8px 8px -8px; font-weight: 600; text-transform: uppercase;">
          ${route.name}
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-weight: bold;">Sustainability Score:</span>
          <span style="color: ${sustainabilityColor}; font-weight: bold;">${route.sustainabilityScore}/100</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span>Carbon Footprint:</span>
          <span style="font-weight: bold;">${route.totalCarbonFootprint.toFixed(2)} kg CO₂</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span>Duration:</span>
          <span>${Math.round(route.totalDuration / 60)}h ${route.totalDuration % 60}m</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span>Cost:</span>
          <span>$${route.totalCost.toFixed(2)}</span>
        </div>
        
        <div style="border-top: 2px solid #2a2a2a; padding-top: 8px;">
          <div style="font-weight: 600; margin-bottom: 4px;">Transport Modes:</div>
          ${route.transportModes.map(segment => `
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <span style="margin-right: 8px; font-size: 16px;">${TRANSPORT_MODE_ICONS[segment.mode]}</span>
              <span style="text-transform: capitalize; margin-right: 8px;">${segment.mode}</span>
              <span style="color: #8a8a8a; font-size: 12px;">${segment.carbonEmission.toFixed(2)} kg CO₂</span>
            </div>
          `).join('')}
        </div>
        
        ${onRouteSelect ? `
          <button 
            onclick="window.selectRoute('${route.id}')" 
            style="
              background: #2a2a2a; 
              color: #f5f5f0; 
              border: none; 
              padding: 8px 16px; 
              margin-top: 8px; 
              cursor: pointer; 
              font-family: 'Courier New', monospace;
              text-transform: uppercase;
              font-weight: 600;
              width: 100%;
            "
          >
            Select This Route
          </button>
        ` : ''}
      </div>
    `;
  }, [onRouteSelect]);

  // Add routes to map
  const addRoutesToMap = useCallback(() => {
    if (!mapInstanceRef.current || routes.length === 0 || !window.google) return;

    clearMapElements();

    const bounds = new google.maps.LatLngBounds();
    let routeIndex = 0;

    routes.forEach((route) => {
      const isSelected = selectedRouteId === route.id;
      const opacity = selectedRouteId && !isSelected ? 0.3 : 1.0;
      const zIndex = isSelected ? 1000 : 100 + routeIndex;

      // Create origin marker
      const originMarker = new google.maps.Marker({
        position: route.origin.coordinates,
        map: mapInstanceRef.current,
        title: `${route.name} - Origin`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#a5b5a5',
          fillOpacity: opacity,
          strokeColor: '#2a2a2a',
          strokeWeight: 2,
        },
        zIndex: zIndex + 10,
      });

      // Create destination marker
      const destinationMarker = new google.maps.Marker({
        position: route.destination.coordinates,
        map: mapInstanceRef.current,
        title: `${route.name} - Destination`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#b59595',
          fillOpacity: opacity,
          strokeColor: '#2a2a2a',
          strokeWeight: 2,
        },
        zIndex: zIndex + 10,
      });

      // Create info windows
      const originInfoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family: 'Courier New', monospace; padding: 8px;">
            <div style="font-weight: bold; text-transform: uppercase;">Origin</div>
            <div>${route.origin.address}</div>
          </div>
        `
      });

      const destinationInfoWindow = new google.maps.InfoWindow({
        content: createSustainabilityInfoContent(route)
      });

      // Add click listeners
      originMarker.addListener('click', () => {
        originInfoWindow.open(mapInstanceRef.current, originMarker);
      });

      destinationMarker.addListener('click', () => {
        destinationInfoWindow.open(mapInstanceRef.current, destinationMarker);
      });

      // Store markers
      markersRef.current.push(
        { marker: originMarker, infoWindow: originInfoWindow },
        { marker: destinationMarker, infoWindow: destinationInfoWindow }
      );

      // Create route polyline with transport mode segments
      route.transportModes.forEach((segment, segmentIndex) => {
        const color = TRANSPORT_MODE_COLORS[segment.mode] || '#666666';

        // For simplicity, we'll create a straight line between origin and destination
        // In a real implementation, you'd use the actual route geometry from Google Maps Directions API
        const path = [route.origin.coordinates, route.destination.coordinates];

        const polyline = new google.maps.Polyline({
          path: path,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: opacity,
          strokeWeight: isSelected ? 6 : 4,
          zIndex: zIndex,
        });

        polyline.setMap(mapInstanceRef.current);

        // Add click listener to polyline
        polyline.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (onRouteSelect) {
            onRouteSelect(route.id);
          }

          // Show route info at click position
          const infoWindow = new google.maps.InfoWindow({
            content: createSustainabilityInfoContent(route),
            position: event.latLng,
          });

          infoWindow.open(mapInstanceRef.current);
        });

        polylinesRef.current.push({ polyline, routeId: route.id });
      });

      // Extend bounds
      bounds.extend(route.origin.coordinates);
      bounds.extend(route.destination.coordinates);

      routeIndex++;
    });

    // Fit map to show all routes
    if (!bounds.isEmpty()) {
      mapInstanceRef.current.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50
      });
    }
  }, [routes, selectedRouteId, onRouteSelect, createSustainabilityInfoContent, clearMapElements]);

  // Set up global route selection function for info window buttons
  useEffect(() => {
    if (onRouteSelect) {
      (window as any).selectRoute = (routeId: string) => {
        onRouteSelect(routeId);
      };
    }

    return () => {
      if ((window as any).selectRoute) {
        delete (window as any).selectRoute;
      }
    };
  }, [onRouteSelect]);

  // Initialize map on component mount
  useEffect(() => {
    initializeMap();

    return () => {
      clearMapElements();
    };
  }, [initializeMap, clearMapElements]);

  // Update routes when they change
  useEffect(() => {
    if (!isLoading && !error) {
      addRoutesToMap();
    }
  }, [routes, selectedRouteId, isLoading, error, addRoutesToMap]);

  if (error) {
    return (
      <div className={`card-brutal ${className}`}>
        <div className="status-error text-center p-8">
          <h3 className="text-2xl mb-4">MAP ERROR!</h3>
          <p className="text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card-brutal ${className}`}>
      <div className="mb-4">
        <h3 className="heading-brutal text-2xl mb-2">ROUTE MAP</h3>
        <div className="card-cyan inline-block px-4 py-2">
          <p className="text-brutal">INTERACTIVE SUSTAINABILITY VIEW</p>
        </div>
      </div>

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-neo-white bg-opacity-90 flex items-center justify-center z-10">
            <div className="card-yellow p-6">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 animate-spin" fill="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-brutal">LOADING MAP...</span>
              </div>
            </div>
          </div>
        )}

        <div
          ref={mapRef}
          className="w-full h-96 md:h-[500px] border-3 border-neo-black"
          style={{ minHeight: '400px' }}
        />

        {routes.length > 0 && (
          <div className="mt-4 card-pink p-4">
            <h4 className="heading-brutal text-lg mb-2">MAP LEGEND</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {Object.entries(TRANSPORT_MODE_ICONS).map(([mode, icon]) => (
                <div key={mode} className="flex items-center space-x-2">
                  <span className="text-lg">{icon}</span>
                  <span className="text-brutal capitalize">{mode}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t-2 border-neo-black">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-neo-green border-2 border-neo-black"></div>
                  <span className="text-brutal">Origin</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-neo-red border-2 border-neo-black"></div>
                  <span className="text-brutal">Destination</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};