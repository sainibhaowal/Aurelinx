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
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full bg-transparent text-white p-6">
          <div className="max-w-md w-full bg-[#0a1a12]/85 backdrop-blur-xl border border-rose-500/30 rounded-2xl p-8 shadow-2xl shadow-black/80">
            <div className="flex justify-center mb-6">
              <AlertCircle className="text-rose-400" size={48} />
            </div>

            <h2 className="text-xl font-bold text-center mb-4 text-white">
              Oops! Something went wrong
            </h2>

            <p className="text-slate-300 text-center mb-6 text-xs leading-relaxed">
              {error?.message || "An unexpected error occurred"}
            </p>

            {process.env.NODE_ENV === "development" && (
              <details className="mb-6 p-4 bg-black/60 rounded-xl border border-white/10 text-xs text-white/50 overflow-auto max-h-48">
                <summary className="cursor-pointer mb-2 font-mono text-slate-400">
                  Error details
                </summary>
                <pre className="font-mono text-[10px] text-slate-300">
                  {error?.toString()}
                  {"\n\n"}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleRetry}
              disabled={retryCount >= 3}
              className="w-full px-4 py-2.5 rounded-xl bg-primary hover:bg-emerald-400 disabled:bg-white/10 disabled:text-white/40 text-[#04100b] font-extrabold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              <RefreshCw size={16} />
              {retryCount >= 3 ? "Max retries reached" : "Try again"}
            </button>

            {retryCount > 0 && (
              <p className="text-xs text-slate-500 text-center mt-4">
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
