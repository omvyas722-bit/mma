import * as Sentry from '@sentry/react';

let initialized = false;

export function initFrontendMonitoring() {
  try {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn || dsn.includes('example@sentry.example.com')) {
      console.log('[monitoring] Sentry DSN not configured — skipping');
      return;
    }

    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.2,
    });

    initialized = true;
    console.log('[monitoring] Frontend Sentry initialized');
  } catch (err) {
    console.error('[monitoring] Failed to init frontend Sentry:', err);
  }
}

export function captureError(error, context = {}) {
  if (!initialized) return;
  try {
    Sentry.captureException(error, { extra: context });
  } catch (err) {
    console.error('[monitoring] Failed to capture error:', err);
  }
}

export function SentryErrorBoundary({ children }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, componentStack }) => (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#666' }}>{error.message}</p>
          {import.meta.env.DEV && (
            <pre style={{ textAlign: 'left', background: '#f5f5f5', padding: '1rem', marginTop: '1rem', fontSize: '0.8rem', overflow: 'auto' }}>
              {componentStack}
            </pre>
          )}
        </div>
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

export function initConsoleCapture() {
  if (!import.meta.env.PROD) return;
  if (!initialized) return;

  const origError = console.error;
  console.error = (...args) => {
    origError.apply(console, args);
    try {
      const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      Sentry.captureMessage(`console.error: ${message}`, 'error');
    } catch {}
  };
}
