'use client'

import React, { useState, useEffect, useRef } from 'react';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  id: string;
  disabled?: boolean;
  onLocationSelect?: (location: { address: string; coordinates?: { lat: number; lng: number } }) => void;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  placeholder,
  label,
  id,
  disabled = false,
  onLocationSelect
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [hasInteracted, setHasInteracted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const isSelectingRef = useRef(false); // Track if we're selecting from dropdown

  useEffect(() => {
    // Don't fetch suggestions if we're selecting from dropdown
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    // Don't fetch suggestions until user has interacted with the input
    if (!hasInteracted) {
      return;
    }

    // Clear suggestions when value is empty
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Skip API call for "My Current Location"
    if (value === 'My Current Location') {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (value.length >= 3) {
        setIsLoading(true);
        try {
          // Call API route instead of service directly to avoid CORS issues
          const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(value)}`);
          if (!response.ok) {
            throw new Error('Failed to fetch suggestions');
          }
          const data = await response.json();
          const results = data.suggestions || [];
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
          setSelectedIndex(-1);
        } catch (error) {
          console.error('Error fetching place suggestions:', error);
          setSuggestions([]);
          setShowSuggestions(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, hasInteracted]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHasInteracted(true);
    onChange(newValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    isSelectingRef.current = true; // Mark that we're selecting from dropdown
    onChange(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);

    if (onLocationSelect) {
      onLocationSelect({ address: suggestion });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          isSelectingRef.current = true; // Mark that we're selecting
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 150);
  };

  const handleFocus = () => {
    setHasInteracted(true);
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-brutal text-sm mb-2 uppercase">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="input-brutal w-full uppercase placeholder:text-neo-gray pr-12 py-2 px-3 text-sm"
          disabled={disabled}
          autoComplete="off"
          aria-expanded={showSuggestions}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={showSuggestions ? `${id}-suggestions` : undefined}
          role="combobox"
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="w-6 h-6 animate-spin" fill="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          id={`${id}-suggestions`}
          className="absolute z-50 w-full mt-2 bg-neo-white border-4 border-neo-black shadow-brutal max-h-60 overflow-y-auto"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`px-4 py-3 cursor-pointer border-b-2 border-neo-black last:border-b-0 font-mono text-sm uppercase transition-colors ${
                index === selectedIndex
                  ? 'bg-neo-yellow text-neo-black'
                  : 'hover:bg-neo-cyan hover:text-neo-black'
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              role="option"
              aria-selected={index === selectedIndex}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};