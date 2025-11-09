'use client'

import React from 'react';

interface DateSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  id: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  value,
  onChange,
  label,
  id,
  disabled = false,
  minDate,
  maxDate
}) => {
  const today = new Date().toISOString().split('T')[0];
  const defaultMinDate = minDate || today;
  
  // Set max date to 1 year from today if not specified
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  const defaultMaxDate = maxDate || oneYearFromNow.toISOString().split('T')[0];

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).toUpperCase();
  };

  return (
    <div>
      <label htmlFor={id} className="block text-brutal text-sm mb-2 uppercase">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="date"
          value={value}
          onChange={handleDateChange}
          min={defaultMinDate}
          max={defaultMaxDate}
          disabled={disabled}
          className="input-brutal w-full font-mono text-sm uppercase py-2 px-3"
          aria-describedby={`${id}-help`}
        />
      </div>

      <div id={`${id}-help`} className="mt-1 text-xs font-mono text-gray-600">
        SELECT YOUR TRAVEL DATE
      </div>
    </div>
  );
};