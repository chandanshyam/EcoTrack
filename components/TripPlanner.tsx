import React, { useState } from 'react';

interface GeolocationCoords {
  latitude: number;
  longitude: number;
}

interface TripPlannerProps {
  onPlanTrip: (origin: string, destination: string, userLocation?: GeolocationCoords) => void;
  isLoading: boolean;
}

export const TripPlanner: React.FC<TripPlannerProps> = ({ onPlanTrip, isLoading }) => {
  const [origin, setOrigin] = useState('New York, NY');
  const [destination, setDestination] = useState('Boston, MA');
  const [userLocation, setUserLocation] = useState<GeolocationCoords | undefined>(undefined);
  const [isLocating, setIsLocating] = useState(false);

  const handleUseMyLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setOrigin('My Current Location');
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Could not retrieve your location. Please ensure location services are enabled.");
        setIsLocating(false);
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (origin && destination) {
      onPlanTrip(origin, destination, origin === 'My Current Location' ? userLocation : undefined);
    }
  };

  return (
    <div className="bg-brut-white border-2 border-brut-black p-6 md:p-8 rounded-lg shadow-hard w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-4">
        <div className="w-full md:flex-1">
          <label htmlFor="origin" className="block text-sm font-bold text-brut-black mb-1">Origin</label>
          <div className="relative flex items-center">
            <input
              id="origin"
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g., San Francisco, CA"
              className="w-full p-3 bg-brut-white border-2 border-brut-black rounded-md focus:outline-none focus:ring-2 focus:ring-brut-green placeholder-gray-500"
              required
            />
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isLocating || isLoading}
              className="absolute right-2 p-1 text-brut-black hover:text-brut-green disabled:text-gray-400"
              aria-label="Use my current location"
            >
              {isLocating ? (
                <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="hidden md:block text-brut-black text-2xl font-bold mt-6">→</div>
        <div className="w-full md:flex-1">
          <label htmlFor="destination" className="block text-sm font-bold text-brut-black mb-1">Destination</label>
          <input
            id="destination"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g., Los Angeles, CA"
            className="w-full p-3 bg-brut-white border-2 border-brut-black rounded-md focus:outline-none focus:ring-2 focus:ring-brut-green placeholder-gray-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || isLocating}
          className="w-full md:w-auto mt-4 md:mt-6 px-8 py-3 bg-brut-green text-brut-white font-bold rounded-md border-2 border-brut-black shadow-hard hover:shadow-hard-hover active:shadow-hard-active active:translate-x-[2px] active:translate-y-[2px] transition-all duration-150 disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? 'Analyzing...' : 'Plan Trip'}
        </button>
      </form>
    </div>
  );
};
