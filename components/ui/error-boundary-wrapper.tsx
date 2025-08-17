"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // In production, send error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, LogRocket, etc.
      // logErrorToService(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return <ErrorFallback 
        error={this.state.error} 
        resetError={this.handleReset}
        errorInfo={this.state.errorInfo}
      />;
    }

    return this.props.children;
  }
}

// Functional component wrapper for easier use
export function ErrorBoundary({ children, ...props }: Props) {
  return <ErrorBoundaryClass {...props}>{children}</ErrorBoundaryClass>;
}

// Default error fallback UI component
function ErrorFallback({ 
  error, 
  resetError, 
  errorInfo 
}: { 
  error: Error | null; 
  resetError: () => void;
  errorInfo: ErrorInfo | null;
}) {
  const [showDetails, setShowDetails] = React.useState(false);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="max-w-2xl w-full space-y-6">
        {/* Main error pill */}
        <div className="hover:bg-[#0f0f10] hover:border-t-[#262626] bg-[#111111] group mx-auto flex w-fit items-center gap-4 rounded-full border border-[#262626]/60 p-1 pl-4 shadow-md shadow-black/30 transition-colors duration-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <span className="text-[#f5f5f5] text-sm">Something went wrong</span>
          </div>
          <span className="border-[#0b0b0b] block h-4 w-0.5 border-l bg-[#3f3f46]"></span>
          <button
            onClick={resetError}
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors duration-200 px-2"
          >
            <RefreshCw className="h-3 w-3 inline mr-1" />
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200 px-2 mr-2"
          >
            <Home className="h-3 w-3 inline mr-1" />
            Dashboard
          </button>
        </div>

        {/* Subtle message */}
        <p className="text-center text-sm text-gray-400">
          Don't worry, we've logged this issue and will look into it
        </p>

        {/* Development details */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mx-auto max-w-lg">
            <details className="group">
              <summary className="flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-400 cursor-pointer transition-colors">
                <AlertTriangle className="w-3 h-3" />
                <span>{showDetails ? 'Hide' : 'Show'} Debug Info</span>
              </summary>
              
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
                  <div className="text-xs text-gray-400 mb-2">Error Message:</div>
                  <code className="text-xs text-red-400 break-all">
                    {error.message}
                  </code>
                </div>
                
                {errorInfo && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-400 mb-2">
                      Component Stack
                    </summary>
                    <div className="p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
                      <pre className="text-xs text-gray-400 overflow-auto max-h-32 whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  </details>
                )}
                
                {error.stack && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-400 mb-2">
                      Error Stack
                    </summary>
                    <div className="p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
                      <pre className="text-xs text-gray-400 overflow-auto max-h-32 whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for error handling in functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // logErrorToService(error, errorInfo);
    }
  };
}