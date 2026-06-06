const Sentry = require('@sentry/node');

let sentryInitialized = false;

function initMonitoring() {
  try {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn || dsn.includes('example@sentry.example.com')) {
      console.log('[monitoring] Sentry DSN not configured — skipping initialization');
      return;
    }

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.2,
      integrations: [Sentry.expressIntegration()],
    });

    sentryInitialized = true;
    console.log('[monitoring] Sentry initialized successfully');
  } catch (err) {
    console.error('[monitoring] Failed to initialize Sentry:', err.message);
  }
}

function getRequestHandler() {
  if (!sentryInitialized) return (req, res, next) => next();
  return Sentry.Handlers?.requestHandler?.() || ((req, res, next) => next());
}

function getErrorHandler() {
  if (!sentryInitialized) return (err, req, res, next) => next(err);
  return (err, req, res, next) => {
    Sentry.captureException(err);
    next(err);
  };
}

function getHealth() {
  const dsn = process.env.SENTRY_DSN;
  return {
    sentry_initialized: sentryInitialized,
    sentry_dsn_configured: !!(dsn && !dsn.includes('example@sentry.example.com')),
  };
}

function trackMetric(name, value, tags = {}) {
  try {
    if (!sentryInitialized) return;
    Sentry.metrics?.distribution?.(name, value, { tags });
  } catch (err) {
    console.error('[monitoring] Failed to track metric:', err.message);
  }
}

module.exports = { initMonitoring, getHealth, trackMetric, getRequestHandler, getErrorHandler, Sentry };
