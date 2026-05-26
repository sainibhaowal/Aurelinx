/**
 * Error Boundary Component
 * Catches errors and displays user-friendly error messages with retry capability
 */

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    if (retryCount < 3) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
      });
    }
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback({ error, retry: this.handleRetry });
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] text-white p-6">
          <div className="max-w-md w-full bg-slate-900/40 border border-risk/30 rounded-2xl p-8">
            <div className="flex justify-center mb-6">
              <AlertCircle className="text-risk" size={48} />
            </div>

            <h2 className="text-xl font-bold text-center mb-4">
              Oops! Something went wrong
            </h2>

            <p className="text-white/60 text-center mb-6">
              {error?.message || "An unexpected error occurred"}
            </p>

            {process.env.NODE_ENV === "development" && (
              <details className="mb-6 p-4 bg-black/40 rounded border border-white/5 text-xs text-white/50 overflow-auto max-h-48">
                <summary className="cursor-pointer mb-2 font-mono">
                  Error details
                </summary>
                <pre className="font-mono">
                  {error?.toString()}
                  {"\n\n"}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleRetry}
              disabled={retryCount >= 3}
              className="w-full px-4 py-2 rounded-lg bg-primary hover:bg-primary/80 disabled:bg-white/10 disabled:text-white/40 text-white font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              {retryCount >= 3 ? "Max retries reached" : "Try again"}
            </button>

            {retryCount > 0 && (
              <p className="text-xs text-white/30 text-center mt-4">
                Attempt {retryCount}/3
              </p>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
