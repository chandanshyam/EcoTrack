'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { RouteOption, TransportMode, TransportSegment } from '@/lib/types';

// Declare global google maps types
declare global {
  interface Window {
    google: typeof google;
  }
}

interface InteractiveMapProps {
  routes: RouteOption[];
  selectedRouteId?: string;
  onRouteSelect?: (routeId: string) => void;
  className?: string;
  showHeader?: boolean;
}

interface MapMarker {
  marker: google.maps.marker.AdvancedMarkerElement;
  infoWindow: google.maps.InfoWindow;
}

interface RoutePolyline {
  polyline: google.maps.Polyline;
  routeId: string;
}

// Google Maps-style colors for transport modes
const TRANSPORT_MODE_COLORS: Record<TransportMode, string> = {
  [TransportMode.CAR]: '#5B8FF9', // Blue like Google Maps driving
  [TransportMode.TRAIN]: '#1E90FF', // Dodger blue for train
  [TransportMode.BUS]: '#FF6B6B', // Coral red for bus
  [TransportMode.PLANE]: '#9B59B6', // Purple for plane
};

const TRANSPORT_MODE_ICONS: Record<TransportMode, string> = {
  [TransportMode.CAR]: '🚗',
  [TransportMode.TRAIN]: '🚆',
  [TransportMode.BUS]: '🚌',
  [TransportMode.PLANE]: '✈️',
};

// Utility function to decode Google Maps encoded polyline
function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  const poly: google.maps.LatLngLiteral[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return poly;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  routes,
  selectedRouteId,
  onRouteSelect,
  className = '',
  showHeader = true
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<MapMarker[]>([]);
  const polylinesRef = useRef<RoutePolyline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createMap = useCallback(() => {
    if (!mapRef.current || !window.google || !window.google.maps) return;

    // Ensure MapTypeId is available (fixes race condition)
    if (!google.maps.MapTypeId || !google.maps.Map) {
      console.warn('Google Maps not fully loaded yet, retrying...');
      setTimeout(createMap, 100);
      return;
    }

    try {
      // Default center (will be adjusted based on routes)
      const defaultCenter = { lat: 40.7128, lng: -74.0060 }; // New York

      const map = new google.maps.Map(mapRef.current, {
        zoom: 10,
        center: defaultCenter,
        mapId: 'c038e9cde4ca08dbe20f77aa', // Google Cloud Map ID for Advanced Markers
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
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!mapRef.current) {
      return;
    }

    if (!apiKey) {
      console.error('Google Maps API key not found. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file');
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
        key: apiKey,
        v: 'weekly',
        libraries: ['geometry', 'places', 'marker']
      });

      // Load the Google Maps API
      await importLibrary('maps');
      await importLibrary('marker');

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
      marker.map = null; // AdvancedMarkerElement uses property assignment instead of setMap()
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
      </div>
    `;
  }, []);

  // Add routes to map
  const addRoutesToMap = useCallback(() => {
    if (!mapInstanceRef.current || routes.length === 0 || !window.google) return;

    clearMapElements();

    const bounds = new google.maps.LatLngBounds();
    let routeIndex = 0;

    routes.forEach((route) => {
      const isSelected = selectedRouteId === route.id;
      // Only show polyline when this route is selected
      const shouldShowPolyline = selectedRouteId === route.id;
      const zIndex = isSelected ? 1000 : 100 + routeIndex;

      // Only show markers when this route is selected
      const shouldShowMarkers = isSelected;

      if (shouldShowMarkers) {
        // Create origin marker with AdvancedMarkerElement
        const originPin = new google.maps.marker.PinElement({
          background: '#34A853', // Google green
          borderColor: '#FFFFFF',
          glyphColor: '#FFFFFF',
          scale: isSelected ? 1.2 : 1.0,
        });

        const originMarker = new google.maps.marker.AdvancedMarkerElement({
          position: route.origin.coordinates,
          map: mapInstanceRef.current,
          title: `${route.name} - Origin`,
          content: originPin.element,
          zIndex: zIndex + 10,
        });

        // Create destination marker with AdvancedMarkerElement
        const destinationPin = new google.maps.marker.PinElement({
          background: '#EA4335', // Google red
          borderColor: '#FFFFFF',
          glyphColor: '#FFFFFF',
          scale: isSelected ? 1.2 : 1.0,
        });

        const destinationMarker = new google.maps.marker.AdvancedMarkerElement({
          position: route.destination.coordinates,
          map: mapInstanceRef.current,
          title: `${route.name} - Destination`,
          content: destinationPin.element,
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
      }

      // Only show polyline when no route is selected, or this route is selected
      if (shouldShowPolyline) {
        // Create route polyline - use actual path from Google Maps if available
        const color = TRANSPORT_MODE_COLORS[route.transportModes[0]?.mode] || '#5B8FF9';

        // Decode polyline if available, otherwise use straight line
        let path: google.maps.LatLngLiteral[];
        if (route.polyline) {
          try {
            path = decodePolyline(route.polyline);
            console.log(`Decoded polyline for ${route.name}: ${path.length} points`);
          } catch (error) {
            console.warn('Failed to decode polyline, using straight line:', error);
            path = [route.origin.coordinates, route.destination.coordinates];
          }
        } else {
          // Fallback to straight line if no polyline data
          console.warn(`No polyline data for ${route.name}`);
          path = [route.origin.coordinates, route.destination.coordinates];
        }

        const polyline = new google.maps.Polyline({
          path: path,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: 0.8,
          strokeWeight: isSelected ? 5 : 4,
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

        // Extend bounds to include all points in the path
        path.forEach(point => {
          bounds.extend(point);
        });
      } else {
        // Still extend bounds even if polyline is hidden
        bounds.extend(route.origin.coordinates);
        bounds.extend(route.destination.coordinates);
      }

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
        <div className="bg-neo-coral text-center p-4">
          <p className="text-brutal text-xs">Map unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card-brutal ${className} ${!showHeader ? 'flex flex-col' : ''}`}>
      {showHeader && (
        <div className="mb-4">
          <h3 className="heading-brutal text-2xl mb-2">ROUTE MAP</h3>
          <div className="card-cyan inline-block px-4 py-2">
            <p className="text-brutal">INTERACTIVE SUSTAINABILITY VIEW</p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className={`relative ${showHeader ? 'mb-6' : 'flex-1'}`}>
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
          className={`w-full border-3 border-neo-black ${showHeader ? 'h-96 md:h-[500px]' : 'h-[400px] md:h-[500px]'}`}
          style={{ minHeight: '400px' }}
        />
      </div>
    </div>
  );
};

export default InteractiveMap;