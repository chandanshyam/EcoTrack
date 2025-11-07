'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

type State = {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for monitoring (in production, this would go to a service)
    if (typeof window !== 'undefined') {
      // Client-side error logging
      console.error('Client Error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with neobrutalism styling
      return (
        <div className="card-brutal bg-neo-red text-neo-white p-8 m-4 max-w-2xl mx-auto">
          <div className="mb-6">
            <h2 className="heading-brutal text-2xl mb-4">OOPS! SOMETHING WENT WRONG</h2>
            <div className="card-yellow text-neo-black p-4 mb-4">
              <p className="text-brutal">
                WE ENCOUNTERED AN UNEXPECTED ERROR. DON&apos;T WORRY - YOUR DATA IS SAFE.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={this.handleRetry}
              className="btn-primary w-full"
            >
              TRY AGAIN
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary w-full"
            >
              REFRESH PAGE
            </button>

            <details className="mt-4">
              <summary className="cursor-pointer text-neo-yellow hover:text-neo-white">
                TECHNICAL DETAILS
              </summary>
              <div className="mt-2 p-4 bg-neo-black text-neo-white font-mono text-sm">
                <p><strong>Error:</strong> {this.state.error?.message}</p>
                <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Specialized error boundaries for different parts of the app
export const RouteErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="card-brutal bg-neo-red text-neo-white p-6 m-4">
        <h3 className="heading-brutal text-xl mb-4">ROUTE PLANNING ERROR</h3>
        <p className="text-brutal mb-4">
          UNABLE TO CALCULATE ROUTES. PLEASE CHECK YOUR LOCATIONS AND TRY AGAIN.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary"
        >
          REFRESH PAGE
        </button>
      </div>
    }
    onError={(error) => {
      console.error('Route planning error:', error);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const MapErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="card-brutal bg-neo-yellow text-neo-black p-6 m-4 h-64 flex items-center justify-center">
        <div className="text-center">
          <h3 className="heading-brutal text-xl mb-4">MAP UNAVAILABLE</h3>
          <p className="text-brutal">
            UNABLE TO LOAD MAP. ROUTE INFORMATION IS STILL AVAILABLE BELOW.
          </p>
        </div>
      </div>
    }
    onError={(error) => {
      console.error('Map rendering error:', error);
    }}
  >
    {children}
  </ErrorBoundary>
);