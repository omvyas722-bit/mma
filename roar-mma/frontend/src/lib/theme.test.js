import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('theme', () => {
  let theme;
  let colors, typography, spacing, borderRadius, shadows, breakpoints, zIndex, transitions, components;

  beforeEach(async () => {
    const mod = await import('./theme');
    theme = mod.theme;
    colors = mod.colors;
    typography = mod.typography;
    spacing = mod.spacing;
    borderRadius = mod.borderRadius;
    shadows = mod.shadows;
    breakpoints = mod.breakpoints;
    zIndex = mod.zIndex;
    transitions = mod.transitions;
    components = mod.components;
  });

  describe('colors', () => {
    it('has all color scales with 50-900 shades', () => {
      const scales = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'gray'];
      scales.forEach(scale => {
        [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].forEach(shade => {
          expect(colors[scale][shade]).toEqual(expect.any(String));
        });
      });
    });

    it('has special colors', () => {
      expect(colors.white).toBe('#ffffff');
      expect(colors.black).toBe('#000000');
      expect(colors.transparent).toBe('transparent');
    });
  });

  describe('typography', () => {
    it('has fontFamily with sans and mono', () => {
      expect(typography.fontFamily.sans).toEqual(expect.any(String));
      expect(typography.fontFamily.mono).toEqual(expect.any(String));
    });

    it('has fontSize with expected keys', () => {
      const keys = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'];
      keys.forEach(k => expect(typography.fontSize[k]).toEqual(expect.any(String)));
    });

    it('has fontWeight with numeric values', () => {
      Object.values(typography.fontWeight).forEach(v => expect(typeof v).toBe('number'));
    });

    it('has lineHeight values', () => {
      Object.values(typography.lineHeight).forEach(v => expect(typeof v).toBe('number'));
    });

    it('has letterSpacing values', () => {
      Object.values(typography.letterSpacing).forEach(v => expect(typeof v).toBe('string'));
    });
  });

  describe('spacing', () => {
    it('has expected spacing values', () => {
      expect(spacing[0]).toBe('0');
      expect(spacing[4]).toBe('1rem');
      expect(spacing[64]).toBe('16rem');
    });

    it('all values are strings', () => {
      Object.values(spacing).forEach(v => expect(typeof v).toBe('string'));
    });
  });

  describe('borderRadius', () => {
    it('has expected radius values', () => {
      expect(borderRadius.none).toBe('0');
      expect(borderRadius.full).toBe('9999px');
    });

    it('all values are strings', () => {
      Object.values(borderRadius).forEach(v => expect(typeof v).toBe('string'));
    });
  });

  describe('shadows', () => {
    it('has expected shadow keys', () => {
      const keys = ['sm', 'base', 'md', 'lg', 'xl', '2xl', 'inner', 'none'];
      keys.forEach(k => expect(shadows[k]).toEqual(expect.any(String)));
    });
  });

  describe('breakpoints', () => {
    it('has expected breakpoint values', () => {
      expect(breakpoints.xs).toBe('320px');
      expect(breakpoints['2xl']).toBe('1536px');
    });

    it('all values are strings ending in px', () => {
      Object.values(breakpoints).forEach(v => expect(v).toMatch(/^\d+px$/));
    });
  });

  describe('zIndex', () => {
    it('has base at 0 and increasing layers', () => {
      expect(zIndex.base).toBe(0);
      expect(zIndex.dropdown).toBeGreaterThan(zIndex.base);
      expect(zIndex.modal).toBeGreaterThan(zIndex.modalBackdrop);
    });

    it('all values are numbers', () => {
      Object.values(zIndex).forEach(v => expect(typeof v).toBe('number'));
    });
  });

  describe('transitions', () => {
    it('has expected transition durations', () => {
      expect(transitions.fast).toBe('150ms');
      expect(transitions.base).toBe('300ms');
      expect(transitions.slow).toBe('500ms');
      expect(transitions.verySlow).toBe('1000ms');
    });
  });

  describe('components', () => {
    it('has button component config', () => {
      expect(components.button).toBeDefined();
      expect(components.button.padding).toBeDefined();
      expect(components.button.fontSize).toBeDefined();
      expect(components.button.borderRadius).toBeDefined();
    });

    it('has input component config', () => {
      expect(components.input.padding).toEqual(expect.any(String));
      expect(components.input.borderColor).toEqual(expect.any(String));
    });

    it('has card component config', () => {
      expect(components.card.padding).toEqual(expect.any(String));
      expect(components.card.shadow).toEqual(expect.any(String));
    });

    it('has modal component config', () => {
      expect(components.modal.backdropColor).toBe('rgba(0, 0, 0, 0.5)');
      expect(components.modal.maxWidth).toBeDefined();
    });

    it('has badge component config', () => {
      expect(components.badge.fontSize).toEqual(expect.any(String));
    });

    it('has table component config', () => {
      expect(components.table.headerBackground).toEqual(expect.any(String));
    });
  });

  describe('theme aggregate', () => {
    it('includes all sections', () => {
      expect(theme.colors).toBe(colors);
      expect(theme.typography).toBe(typography);
      expect(theme.spacing).toBe(spacing);
      expect(theme.borderRadius).toBe(borderRadius);
      expect(theme.shadows).toBe(shadows);
      expect(theme.breakpoints).toBe(breakpoints);
      expect(theme.zIndex).toBe(zIndex);
      expect(theme.transitions).toBe(transitions);
      expect(theme.components).toBe(components);
    });
  });

  describe('generateCSSVariables', () => {
    it('returns flat CSS variable object', async () => {
      const { generateCSSVariables } = await import('./theme');
      const vars = generateCSSVariables(theme);
      expect(vars['--color-primary-500']).toBe('#3b82f6');
      expect(vars['--color-white']).toBe('#ffffff');
      expect(vars['--spacing-4']).toBe('1rem');
      expect(vars['--radius-md']).toBe('0.375rem');
      expect(vars['--shadow-base']).toEqual(expect.any(String));
      expect(vars['--z-modal']).toBe(1050);
    });

    it('handles color objects and simple values', async () => {
      const { generateCSSVariables } = await import('./theme');
      const vars = generateCSSVariables(theme);
      expect(vars['--color-primary-50']).toBe('#eff6ff');
      expect(vars['--color-black']).toBe('#000000');
    });
  });

  describe('applyTheme', () => {
    beforeEach(() => {
      document.documentElement.style.setProperty = vi.fn();
    });

    it('sets CSS custom properties on documentElement', async () => {
      const { applyTheme } = await import('./theme');
      applyTheme();
      expect(document.documentElement.style.setProperty).toHaveBeenCalled();
    });

    it('calls setProperty with correct args', async () => {
      const { applyTheme } = await import('./theme');
      applyTheme();
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--color-primary-500',
        '#3b82f6'
      );
    });

    it('merges custom theme overrides', async () => {
      const { applyTheme, generateCSSVariables } = await import('./theme');
      applyTheme({ colors: { primary: { 500: '#ff0000' } } });
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--color-primary-500',
        '#ff0000'
      );
    });
  });

  describe('getThemeValue', () => {
    it('retrieves nested value by dot path', async () => {
      const { getThemeValue } = await import('./theme');
      expect(getThemeValue('colors.primary.500')).toBe('#3b82f6');
    });

    it('retrieves top-level key', async () => {
      const { getThemeValue } = await import('./theme');
      expect(getThemeValue('colors')).toBeDefined();
    });

    it('returns null for non-existent path', async () => {
      const { getThemeValue } = await import('./theme');
      expect(getThemeValue('colors.nonexistent')).toBeNull();
    });

    it('returns null for deeply non-existent path', async () => {
      const { getThemeValue } = await import('./theme');
      expect(getThemeValue('a.b.c.d')).toBeNull();
    });
  });

  describe('mediaQuery', () => {
    it('returns correct media query string', async () => {
      const { mediaQuery } = await import('./theme');
      expect(mediaQuery('md')).toBe('@media (min-width: 768px)');
    });

    it('works for all breakpoints', async () => {
      const { mediaQuery, breakpoints } = await import('./theme');
      Object.keys(breakpoints).forEach(bp => {
        expect(mediaQuery(bp)).toBe(`@media (min-width: ${breakpoints[bp]})`);
      });
    });
  });

  describe('darkTheme', () => {
    it('is a partial override with colors and components', async () => {
      const { darkTheme } = await import('./theme');
      expect(darkTheme.colors).toBeDefined();
      expect(darkTheme.components).toBeDefined();
    });

    it('overrides gray scale colors', async () => {
      const { darkTheme, colors } = await import('./theme');
      expect(darkTheme.colors.gray[50]).not.toBe(colors.gray[50]);
    });

    it('keeps other colors unchanged', async () => {
      const { darkTheme, colors } = await import('./theme');
      expect(darkTheme.colors.primary).toBe(colors.primary);
    });

    it('overrides card background', async () => {
      const { darkTheme, colors } = await import('./theme');
      expect(darkTheme.components.card.backgroundColor).toBe(colors.gray[800]);
    });
  });
});
