import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

const mockSentryInit = vi.fn();
const mockCaptureException = vi.fn();
const mockCaptureMessage = vi.fn();

vi.mock('@sentry/react', () => ({
  default: {
    init: (...args) => mockSentryInit(...args),
    captureException: (...args) => mockCaptureException(...args),
    captureMessage: (...args) => mockCaptureMessage(...args),
  },
  init: (...args) => mockSentryInit(...args),
  captureException: (...args) => mockCaptureException(...args),
  captureMessage: (...args) => mockCaptureMessage(...args),
  ErrorBoundary: ({ children, fallback }) => fallback({ error: new Error('Test error'), componentStack: 'at Test' }),
}));

const origConsoleError = console.error;

async function freshModule() {
  vi.resetModules();
  return await import('./monitoring');
}

describe('initFrontendMonitoring', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('skips initialization when VITE_SENTRY_DSN is not set', async () => {
    const { initFrontendMonitoring } = await freshModule();
    initFrontendMonitoring();
    expect(mockSentryInit).not.toHaveBeenCalled();
  });

  it('skips when DSN contains example placeholder', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://example@sentry.example.com');
    const { initFrontendMonitoring } = await freshModule();
    initFrontendMonitoring();
    expect(mockSentryInit).not.toHaveBeenCalled();
  });

  it('initializes Sentry with valid DSN', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://real@sentry.io/123');
    const { initFrontendMonitoring } = await freshModule();
    initFrontendMonitoring();
    expect(mockSentryInit).toHaveBeenCalledWith({
      dsn: 'https://real@sentry.io/123',
      environment: 'test',
      tracesSampleRate: 0.2,
    });
  });

  it('handles Sentry.init throwing an error', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://real@sentry.io/123');
    mockSentryInit.mockImplementationOnce(() => { throw new Error('Init failed'); });
    const { initFrontendMonitoring } = await freshModule();
    expect(() => initFrontendMonitoring()).not.toThrow();
  });
});

describe('captureError', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('captures error with Sentry when initialized', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://real@sentry.io/123');
    vi.clearAllMocks();
    const { initFrontendMonitoring, captureError } = await freshModule();
    initFrontendMonitoring();
    const error = new Error('Something broke');
    captureError(error, { userId: 42 });
    expect(mockCaptureException).toHaveBeenCalledWith(error, { extra: { userId: 42 } });
  });

  it('does nothing when not initialized', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    vi.clearAllMocks();
    const { captureError } = await freshModule();
    captureError(new Error('test'));
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('handles Sentry.captureException throwing', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://real@sentry.io/123');
    vi.clearAllMocks();
    const { initFrontendMonitoring, captureError } = await freshModule();
    initFrontendMonitoring();
    mockCaptureException.mockImplementationOnce(() => { throw new Error('Sentry down'); });
    expect(() => captureError(new Error('test'))).not.toThrow();
  });
});

describe('SentryErrorBoundary', () => {
  it('renders fallback on error', async () => {
    const { SentryErrorBoundary } = await freshModule();
    render(
      <SentryErrorBoundary>
        <div>Child content</div>
      </SentryErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});

describe('initConsoleCapture', () => {
  afterEach(() => {
    console.error = origConsoleError;
    vi.unstubAllEnvs();
    mockCaptureMessage.mockClear();
  });

  it('does nothing in dev mode', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://real@sentry.io/123');
    vi.stubEnv('PROD', false);
    const { initFrontendMonitoring, initConsoleCapture } = await freshModule();
    initFrontendMonitoring();
    initConsoleCapture();
    console.error('test message');
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('captures console.error in production when initialized', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://real@sentry.io/123');
    vi.stubEnv('PROD', true);
    const { initFrontendMonitoring, initConsoleCapture } = await freshModule();
    initFrontendMonitoring();
    initConsoleCapture();
    console.error('Something failed', { details: 'err' });
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('Something failed'),
      'error'
    );
  });

  it('does not capture when Sentry not initialized', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    vi.stubEnv('PROD', true);
    const { initFrontendMonitoring, initConsoleCapture } = await freshModule();
    initFrontendMonitoring();
    initConsoleCapture();
    console.error('test');
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });
});
