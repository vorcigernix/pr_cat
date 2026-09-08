"use client";

import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return <DefaultErrorFallback error={this.state.error!} retry={this.retry} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div role="alert" className="flex justify-center p-8">
      <div className="max-w-md w-full">
        <div className="hover:bg-[#0f0f10] hover:border-t-[#262626] bg-[#111111] group mx-auto flex w-fit items-center gap-4 rounded-full border border-[#262626]/60 p-1 pl-4 pr-2 shadow-md shadow-black/30 transition-colors duration-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <span className="text-[#f5f5f5] text-sm">Component error</span>
          </div>
          <span className="border-[#0b0b0b] block h-4 w-0.5 border-l bg-[#3f3f46]"></span>
          <button
            onClick={retry}
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors duration-200 px-2"
          >
            Retry
          </button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-center">
            <summary className="text-xs text-gray-500 hover:text-gray-400 cursor-pointer">
              Debug Info
            </summary>
            <div className="mt-2 p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
              <code className="text-xs text-gray-400 break-all">
                {error.message || "An unexpected error occurred"}
              </code>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
