// Error Boundary Component for Graceful Error Handling
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to error reporting service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          resetError: this.handleReset,
        });
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
              {this.props.title || 'Something went wrong'}
            </h2>

            <p className="text-sm text-gray-600 text-center mb-6">
              {this.props.message ||
                'An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.'}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 p-4 bg-gray-50 rounded border border-gray-200">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Error Details
                </summary>
                <div className="text-xs text-gray-600 space-y-2">
                  <div>
                    <strong>Error:</strong>
                    <pre className="mt-1 whitespace-pre-wrap break-words">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="mt-1 whitespace-pre-wrap break-words text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 btn btn-primary"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 btn btn-secondary"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Hook for functional components to trigger error boundary
export function useErrorHandler() {
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}

// Specialized error boundaries for different sections
export function PageErrorBoundary({ children, pageName }) {
  return (
    <ErrorBoundary
      title={`Error loading ${pageName}`}
      message="We encountered an error while loading this page. Please try again."
      fallback={({ error, resetError }) => (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error loading {pageName}
          </h3>
          <p className="text-sm text-gray-600 text-center max-w-md mb-6">
            We encountered an error while loading this page. Please try again.
          </p>
          <button onClick={resetError} className="btn btn-primary">
            Reload Page
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export function ComponentErrorBoundary({ children, componentName }) {
  return (
    <ErrorBoundary
      fallback={({ resetError }) => (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-900 mb-1">
                Error loading {componentName}
              </h4>
              <p className="text-sm text-red-700 mb-3">
                This component failed to load. You can try reloading it.
              </p>
              <button
                onClick={resetError}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Reload Component
              </button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// Usage examples:
/*
// Wrap your entire app
import ErrorBoundary from './components/Shared/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Send to error tracking service
        console.error('App error:', error, errorInfo);
      }}
    >
      <YourApp />
    </ErrorBoundary>
  );
}

// Wrap individual pages
import { PageErrorBoundary } from './components/Shared/ErrorBoundary';

function MembersPage() {
  return (
    <PageErrorBoundary pageName="Members">
      <MembersContent />
    </PageErrorBoundary>
  );
}

// Wrap individual components
import { ComponentErrorBoundary } from './components/Shared/ErrorBoundary';

function Dashboard() {
  return (
    <div>
      <ComponentErrorBoundary componentName="Stats Cards">
        <StatsCards />
      </ComponentErrorBoundary>

      <ComponentErrorBoundary componentName="Charts">
        <Charts />
      </ComponentErrorBoundary>
    </div>
  );
}

// Use error handler hook in functional components
import { useErrorHandler } from './components/Shared/ErrorBoundary';

function MyComponent() {
  const handleError = useErrorHandler();

  const fetchData = async () => {
    try {
      const data = await api.get('/data');
      return data;
    } catch (error) {
      handleError(error); // This will trigger the error boundary
    }
  };

  return <div>...</div>;
}
*/
