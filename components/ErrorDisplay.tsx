'use client'

import React, { useState } from 'react';
import { AppError } from '@/lib/utils/errorHandling';

type ErrorDisplayProps = {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getErrorStyle = () => {
    if (error.retryable) {
      return 'status-warning'; // Yellow for retryable errors
    }
    return 'status-error'; // Red for non-retryable errors
  };

  return (
    <div className={`${getErrorStyle()} p-4 rounded-none ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <svg 
              className="w-5 h-5 flex-shrink-0" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                clipRule="evenodd" 
              />
            </svg>
            <h3 className="heading-brutal text-sm">
              {error.retryable ? 'TEMPORARY ISSUE' : 'ERROR'}
            </h3>
          </div>
          
          <p className="text-brutal text-sm mb-3">
            {error.userMessage}
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {error.retryable && onRetry && (
              <button
                onClick={onRetry}
                className="btn-secondary text-xs px-3 py-1"
              >
                TRY AGAIN
              </button>
            )}
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="btn-secondary text-xs px-3 py-1"
              >
                DISMISS
              </button>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="btn-secondary text-xs px-3 py-1"
            >
              {isExpanded ? 'HIDE DETAILS' : 'SHOW DETAILS'}
            </button>
          </div>

          {/* Technical details (expandable) */}
          {isExpanded && (
            <div className="mt-4 p-3 bg-neo-black text-neo-white font-mono text-xs">
              <div className="space-y-1">
                <div><strong>Code:</strong> {error.code}</div>
                <div><strong>Time:</strong> {new Date(error.timestamp).toLocaleString()}</div>
                <div><strong>Message:</strong> {error.message}</div>
                {error.details && (
                  <div>
                    <strong>Details:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">
                      {typeof error.details === 'string' 
                        ? error.details 
                        : JSON.stringify(error.details, null, 2)
                      }
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Close button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-current hover:opacity-75 flex-shrink-0"
            aria-label="Dismiss error"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path 
                fillRule="evenodd" 
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                clipRule="evenodd" 
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

// Specialized error displays for different contexts
export const RouteErrorDisplay: React.FC<{
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
}> = ({ error, onRetry, onDismiss }) => (
  <ErrorDisplay
    error={error}
    onRetry={onRetry}
    onDismiss={onDismiss}
    className="mb-4"
  />
);

export const MapErrorDisplay: React.FC<{
  error: AppError;
  onRetry?: () => void;
}> = ({ error, onRetry }) => (
  <div className="card-brutal bg-neo-yellow text-neo-black p-6 h-64 flex items-center justify-center">
    <div className="text-center max-w-md">
      <svg className="w-12 h-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
        <path 
          fillRule="evenodd" 
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
          clipRule="evenodd" 
        />
      </svg>
      <h3 className="heading-brutal text-lg mb-2">MAP UNAVAILABLE</h3>
      <p className="text-brutal text-sm mb-4">{error.userMessage}</p>
      {error.retryable && onRetry && (
        <button onClick={onRetry} className="btn-primary text-sm">
          RETRY MAP
        </button>
      )}
    </div>
  </div>
);

// Toast-style error notification
export const ErrorToast: React.FC<{
  error: AppError;
  onDismiss: () => void;
  duration?: number;
}> = ({ error, onDismiss, duration = 5000 }) => {
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <ErrorDisplay
        error={error}
        onDismiss={onDismiss}
        className="shadow-brutal"
      />
    </div>
  );
};