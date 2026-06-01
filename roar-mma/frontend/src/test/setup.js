// Test setup file
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './mocks/server';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
// eslint-disable-next-line no-undef
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Mock ResizeObserver
// eslint-disable-next-line no-undef
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = vi.fn();

const originalConsoleError = console.error;
// eslint-disable-next-line no-undef
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalConsoleError(...args);
  });
});

// eslint-disable-next-line no-undef
afterAll(() => {
  try { console.error.mockRestore(); } catch (e) { /* already restored */ }
});
