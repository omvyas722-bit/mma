// Theme Configuration System

// Color palette
export const colors = {
  // Primary colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Secondary colors
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Success
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Warning
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Info
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Grayscale
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Special colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
};

// Typography
export const typography = {
  fontFamily: {
    sans: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ].join(', '),
    mono: [
      'Menlo',
      'Monaco',
      'Consolas',
      'Liberation Mono',
      'Courier New',
      'monospace',
    ].join(', '),
  },

  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem',  // 60px
  },

  fontWeight: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// Spacing
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
  40: '10rem',    // 160px
  48: '12rem',    // 192px
  56: '14rem',    // 224px
  64: '16rem',    // 256px
};

// Border radius
export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
};

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  none: 'none',
};

// Breakpoints
export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Z-index layers
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 1080,
  commandPalette: 1090,
};

// Transitions
export const transitions = {
  fast: '150ms',
  base: '300ms',
  slow: '500ms',
  verySlow: '1000ms',
};

// Component-specific theme tokens
export const components = {
  button: {
    padding: {
      sm: `${spacing[2]} ${spacing[3]}`,
      md: `${spacing[3]} ${spacing[4]}`,
      lg: `${spacing[4]} ${spacing[6]}`,
    },
    fontSize: {
      sm: typography.fontSize.sm,
      md: typography.fontSize.base,
      lg: typography.fontSize.lg,
    },
    borderRadius: borderRadius.md,
  },

  input: {
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.base,
    borderRadius: borderRadius.md,
    borderColor: colors.gray[300],
    focusBorderColor: colors.primary[500],
  },

  card: {
    padding: spacing[6],
    borderRadius: borderRadius.lg,
    shadow: shadows.base,
    backgroundColor: colors.white,
  },

  modal: {
    backdropColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.lg,
    shadow: shadows['2xl'],
    maxWidth: {
      sm: '400px',
      md: '600px',
      lg: '800px',
      xl: '1000px',
    },
  },

  badge: {
    padding: `${spacing[1]} ${spacing[2]}`,
    fontSize: typography.fontSize.xs,
    borderRadius: borderRadius.base,
    fontWeight: typography.fontWeight.medium,
  },

  table: {
    headerBackground: colors.gray[50],
    borderColor: colors.gray[200],
    hoverBackground: colors.gray[50],
  },
};

// Theme object
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  zIndex,
  transitions,
  components,
};

// CSS custom properties generator
export function generateCSSVariables(theme) {
  const cssVars = {};

  // Colors
  Object.entries(theme.colors).forEach(([colorName, colorValue]) => {
    if (typeof colorValue === 'object') {
      Object.entries(colorValue).forEach(([shade, value]) => {
        cssVars[`--color-${colorName}-${shade}`] = value;
      });
    } else {
      cssVars[`--color-${colorName}`] = colorValue;
    }
  });

  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    cssVars[`--spacing-${key}`] = value;
  });

  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    cssVars[`--radius-${key}`] = value;
  });

  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    cssVars[`--shadow-${key}`] = value;
  });

  // Z-index
  Object.entries(theme.zIndex).forEach(([key, value]) => {
    cssVars[`--z-${key}`] = value;
  });

  return cssVars;
}

// Apply theme to document
export function applyTheme(customTheme = {}) {
  const mergedTheme = { ...theme, ...customTheme };
  const cssVars = generateCSSVariables(mergedTheme);

  Object.entries(cssVars).forEach(([property, value]) => {
    document.documentElement.style.setProperty(property, value);
  });
}

// Get theme value helper
export function getThemeValue(path) {
  const keys = path.split('.');
  let value = theme;

  for (const key of keys) {
    value = value[key];
    if (value === undefined) return null;
  }

  return value;
}

// Responsive helper
export function mediaQuery(breakpoint) {
  return `@media (min-width: ${breakpoints[breakpoint]})`;
}

// Dark mode theme (optional)
export const darkTheme = {
  colors: {
    ...colors,
    gray: {
      50: '#1f2937',
      100: '#374151',
      200: '#4b5563',
      300: '#6b7280',
      400: '#9ca3af',
      500: '#d1d5db',
      600: '#e5e7eb',
      700: '#f3f4f6',
      800: '#f9fafb',
      900: '#ffffff',
    },
  },
  components: {
    ...components,
    card: {
      ...components.card,
      backgroundColor: colors.gray[800],
    },
  },
};

export default theme;

// Usage examples:
/*
// Apply theme on app initialization
import { applyTheme, theme } from './lib/theme';

applyTheme();

// Use theme values in components
import { theme } from './lib/theme';

const Button = styled.button`
  padding: ${theme.components.button.padding.md};
  font-size: ${theme.components.button.fontSize.md};
  border-radius: ${theme.components.button.borderRadius};
  background-color: ${theme.colors.primary[500]};
  color: ${theme.colors.white};
`;

// Use CSS variables in styles
.button {
  background-color: var(--color-primary-500);
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-base);
}

// Get theme value
import { getThemeValue } from './lib/theme';

const primaryColor = getThemeValue('colors.primary.500');

// Responsive styles
import { mediaQuery } from './lib/theme';

const Container = styled.div`
  padding: ${theme.spacing[4]};

  ${mediaQuery('md')} {
    padding: ${theme.spacing[8]};
  }
`;
*/
