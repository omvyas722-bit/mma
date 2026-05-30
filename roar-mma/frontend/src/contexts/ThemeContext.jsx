// Theme Context Provider - Manage theme preferences

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { theme as defaultTheme, darkTheme, applyTheme } from '../lib/theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('theme-mode');
    if (savedMode) {
      return savedMode;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  });

  const [customTheme, setCustomTheme] = useState(null);
  const [isSystem, setIsSystem] = useState(() => !localStorage.getItem('theme-mode'));

  // Apply theme when mode changes
  useEffect(() => {
    const themeToApply = mode === 'dark' ? darkTheme : defaultTheme;
    const finalTheme = customTheme ? { ...themeToApply, ...customTheme } : themeToApply;

    applyTheme(finalTheme);

    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (!isSystem) {
      localStorage.setItem('theme-mode', mode);
    }
  }, [mode, customTheme, isSystem]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      // Only auto-switch if user hasn't manually set a preference
      const savedMode = localStorage.getItem('theme-mode');
      if (!savedMode) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  }, []);

  const setLightMode = useCallback(() => {
    setMode('light');
  }, []);

  const setDarkMode = useCallback(() => {
    setMode('dark');
  }, []);

  const setSystemMode = useCallback(() => {
    localStorage.removeItem('theme-mode');
    setIsSystem(true);
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setMode(systemPreference);
  }, []);

  const updateCustomTheme = useCallback((updates) => {
    setCustomTheme((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const resetCustomTheme = useCallback(() => {
    setCustomTheme(null);
  }, []);

  const value = useMemo(() => ({
    mode,
    isDark: mode === 'dark',
    isLight: mode === 'light',
    isSystem,
    theme: mode === 'dark' ? darkTheme : defaultTheme,
    toggleTheme,
    setLightMode,
    setDarkMode,
    setSystemMode,
    updateCustomTheme,
    resetCustomTheme,
  }), [mode, isSystem, toggleTheme, setLightMode, setDarkMode, setSystemMode, updateCustomTheme, resetCustomTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

// Theme toggle button component
export function ThemeToggle({ className = '' }) {
  const { mode, toggleTheme } = useTheme();

  return (
    <button type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
      aria-label="Toggle theme"
    >
      {mode === 'light' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}
    </button>
  );
}

// Theme selector component
export function ThemeSelector() {
  const { mode, isSystem, setLightMode, setDarkMode, setSystemMode } = useTheme();

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Theme
      </label>
      <div className="flex gap-2" role="radiogroup" aria-label="Theme selection">
        <button type="button"
          onClick={setLightMode}
          aria-pressed={mode === 'light'}
          className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
            mode === 'light'
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'
          }`}
        >
          <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <span className="text-sm">Light</span>
        </button>

        <button type="button"
          onClick={setDarkMode}
          aria-pressed={mode === 'dark'}
          className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
            mode === 'dark'
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'
          }`}
        >
          <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
          <span className="text-sm">Dark</span>
        </button>

        <button type="button"
          onClick={setSystemMode}
          aria-pressed={isSystem}
          className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
            isSystem
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'
          }`}
        >
          <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm">System</span>
        </button>
      </div>
    </div>
  );
}

export default ThemeContext;

// Usage examples:
/*
// Wrap app with ThemeProvider
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

// Use theme in components
import { useTheme } from './contexts/ThemeContext';

function Header() {
  const { mode, toggleTheme, isDark } = useTheme();

  return (
    <header>
      <h1>My App</h1>
      <button type="button" onClick={toggleTheme}>
        {isDark ? 'Switch to Light' : 'Switch to Dark'}
      </button>
    </header>
  );
}

// Use ThemeToggle component
import { ThemeToggle } from './contexts/ThemeContext';

function Navbar() {
  return (
    <nav>
      <div>Logo</div>
      <ThemeToggle />
    </nav>
  );
}

// Use ThemeSelector in settings
import { ThemeSelector } from './contexts/ThemeContext';

function SettingsPage() {
  return (
    <div>
      <h2>Settings</h2>
      <ThemeSelector />
    </div>
  );
}

// Access theme values
import { useTheme } from './contexts/ThemeContext';

function CustomComponent() {
  const { theme } = useTheme();

  return (
    <div style={{ color: theme.colors.primary[500] }}>
      Styled with theme
    </div>
  );
}
*/
