import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('a11y', () => {
  let mod;

  beforeEach(async () => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    mod = await import('./a11y');
  });

  describe('trapFocus', () => {
    it('returns a cleanup function', () => {
      const el = { querySelectorAll: vi.fn(() => []), addEventListener: vi.fn(), removeEventListener: vi.fn() };
      const cleanup = mod.trapFocus(el);
      expect(typeof cleanup).toBe('function');
      expect(el.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      cleanup();
      expect(el.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('traps Tab at last element and loops to first', () => {
      const first = { focus: vi.fn() };
      const last = { focus: vi.fn() };
      const el = {
        querySelectorAll: vi.fn(() => [first, last]),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      mod.trapFocus(el);
      const handler = el.addEventListener.mock.calls[0][1];
      Object.defineProperty(document, 'activeElement', { value: last, configurable: true, writable: true });
      handler({ key: 'Tab', shiftKey: false, preventDefault: vi.fn() });
      expect(first.focus).toHaveBeenCalled();
    });

    it('traps Shift+Tab at first element and loops to last', () => {
      const first = { focus: vi.fn() };
      const last = { focus: vi.fn() };
      const el = {
        querySelectorAll: vi.fn(() => [first, last]),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      mod.trapFocus(el);
      const handler = el.addEventListener.mock.calls[0][1];
      Object.defineProperty(document, 'activeElement', { value: first, configurable: true, writable: true });
      handler({ key: 'Tab', shiftKey: true, preventDefault: vi.fn() });
      expect(last.focus).toHaveBeenCalled();
    });
  });

  describe('announce', () => {
    it('creates announcer if not present and sets textContent', () => {
      const mockDiv = { id: '', setAttribute: vi.fn(), textContent: '', style: { cssText: '' } };
      vi.spyOn(document, 'getElementById').mockReturnValue(null);
      vi.spyOn(document, 'createElement').mockReturnValue(mockDiv);
      vi.spyOn(document.body, 'appendChild').mockReturnValue(mockDiv);
      vi.useFakeTimers();
      mod.announce('Hello');
      expect(mockDiv.textContent).toBe('Hello');
      expect(mockDiv.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
      vi.advanceTimersByTime(1000);
      expect(mockDiv.textContent).toBe('');
      vi.useRealTimers();
    });

    it('uses existing announcer element', () => {
      const existing = { id: 'a11y-announcer', setAttribute: vi.fn(), textContent: '' };
      vi.spyOn(document, 'getElementById').mockReturnValue(existing);
      vi.useFakeTimers();
      mod.announce('Test', 'assertive');
      expect(existing.textContent).toBe('Test');
      expect(existing.setAttribute).toHaveBeenCalledWith('aria-live', 'assertive');
      vi.advanceTimersByTime(1000);
      expect(existing.textContent).toBe('');
      vi.useRealTimers();
    });
  });

  describe('generateId', () => {
    it('returns incrementing ids with prefix', () => {
      expect(mod.generateId('test')).toBe('test-1');
      expect(mod.generateId('test')).toBe('test-2');
      expect(mod.generateId()).toBe('a11y-3');
    });
  });

  describe('isVisible', () => {
    it('returns false for null element', () => {
      expect(mod.isVisible(null)).toBe(false);
    });

    it('checks display, visibility, opacity, offsetParent', () => {
      const el = { offsetParent: {} };
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({ display: 'block', visibility: 'visible', opacity: '1' });
      expect(mod.isVisible(el)).toBe(true);
    });

    it('returns false when display is none', () => {
      const el = { offsetParent: {} };
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({ display: 'none', visibility: 'visible', opacity: '1' });
      expect(mod.isVisible(el)).toBe(false);
    });
  });

  describe('getFocusableElements', () => {
    it('returns array of focusable elements', () => {
      const btn = { tagName: 'BUTTON', offsetParent: {} };
      const input = { tagName: 'INPUT', offsetParent: {} };
      const container = { querySelectorAll: vi.fn(() => [btn, input]) };
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({ display: 'block', visibility: 'visible', opacity: '1' });
      const result = mod.getFocusableElements(container);
      expect(result.length).toBe(2);
    });
  });

  describe('focusFirst', () => {
    it('focuses first element and returns true', () => {
      const btn = { focus: vi.fn(), offsetParent: {} };
      const container = { querySelectorAll: vi.fn(() => [btn, {}]) };
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({ display: 'block', visibility: 'visible', opacity: '1' });
      expect(mod.focusFirst(container)).toBe(true);
      expect(btn.focus).toHaveBeenCalled();
    });

    it('returns false when no focusable elements', () => {
      const container = { querySelectorAll: vi.fn(() => []) };
      expect(mod.focusFirst(container)).toBe(false);
    });
  });

  describe('createFocusManager', () => {
    it('save and restore track previous focus', () => {
      const el = { focus: vi.fn() };
      Object.defineProperty(document, 'activeElement', { value: el, configurable: true, writable: true });
      const fm = mod.createFocusManager();
      fm.save();
      fm.restore();
      expect(el.focus).toHaveBeenCalled();
    });
  });

  describe('Keys', () => {
    it('defines common key constants', () => {
      expect(mod.Keys.ENTER).toBe('Enter');
      expect(mod.Keys.SPACE).toBe(' ');
      expect(mod.Keys.ESCAPE).toBe('Escape');
      expect(mod.Keys.TAB).toBe('Tab');
      expect(mod.Keys.HOME).toBe('Home');
      expect(mod.Keys.END).toBe('End');
    });
  });

  describe('isActionKey', () => {
    it('returns true for Enter and Space', () => {
      expect(mod.isActionKey('Enter')).toBe(true);
      expect(mod.isActionKey(' ')).toBe(true);
      expect(mod.isActionKey('Tab')).toBe(false);
    });
  });

  describe('isNavigationKey', () => {
    it('returns true for arrow keys, Home, End', () => {
      expect(mod.isNavigationKey('ArrowUp')).toBe(true);
      expect(mod.isNavigationKey('ArrowDown')).toBe(true);
      expect(mod.isNavigationKey('Home')).toBe(true);
      expect(mod.isNavigationKey('Enter')).toBe(false);
    });
  });

  describe('getAriaLabel', () => {
    it('returns aria-label or aria-labelledby or textContent', () => {
      const el = { getAttribute: vi.fn((a) => a === 'aria-label' ? 'label' : null), textContent: 'text' };
      expect(mod.getAriaLabel(el)).toBe('label');
    });

    it('falls back to textContent', () => {
      const el = { getAttribute: vi.fn(() => null), textContent: 'text' };
      expect(mod.getAriaLabel(el)).toBe('text');
    });
  });

  describe('setAriaLabel', () => {
    it('sets aria-label attribute', () => {
      const el = { setAttribute: vi.fn() };
      mod.setAriaLabel(el, 'mylabel');
      expect(el.setAttribute).toHaveBeenCalledWith('aria-label', 'mylabel');
    });
  });

  describe('createSkipLink', () => {
    it('creates an anchor element with skip link attributes', () => {
      const el = { href: '', textContent: '', className: '', style: { cssText: '' }, addEventListener: vi.fn() };
      vi.spyOn(document, 'createElement').mockReturnValue(el);
      const result = mod.createSkipLink('main', 'Skip');
      expect(result.href).toBe('#main');
      expect(result.textContent).toBe('Skip');
      expect(result.className).toBe('skip-link');
    });
  });

  describe('getContrastRatio', () => {
    it('returns a number for valid hex colors', () => {
      const ratio = mod.getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeGreaterThan(0);
      expect(typeof ratio).toBe('number');
    });

    it('returns 1 for same colors', () => {
      const ratio = mod.getContrastRatio('#FF0000', '#FF0000');
      expect(ratio).toBe(1);
    });
  });

  describe('meetsWCAGAA', () => {
    it('returns boolean based on contrast ratio and font size', () => {
      expect(mod.meetsWCAGAA(21, 16)).toBe(true);
      expect(mod.meetsWCAGAA(1, 16)).toBe(false);
    });
  });

  describe('meetsWCAGAAA', () => {
    it('returns boolean based on contrast ratio and font size', () => {
      expect(mod.meetsWCAGAAA(21, 16)).toBe(true);
      expect(mod.meetsWCAGAAA(1, 16)).toBe(false);
    });
  });

  describe('prefersReducedMotion', () => {
    it('returns result from matchMedia', () => {
      vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
      expect(mod.prefersReducedMotion()).toBe(true);
    });
  });

  describe('useReducedMotion', () => {
    it('calls callback immediately and on change, returns cleanup', () => {
      const addListener = vi.fn();
      const removeListener = vi.fn();
      vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: addListener, removeEventListener: removeListener })));
      const cb = vi.fn();
      const cleanup = mod.useReducedMotion(cb);
      expect(cb).toHaveBeenCalledWith(true);
      expect(addListener).toHaveBeenCalled();
      cleanup();
      expect(removeListener).toHaveBeenCalled();
    });
  });

  describe('prefersHighContrast', () => {
    it('checks prefers-contrast media query', () => {
      vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
      expect(mod.prefersHighContrast()).toBe(false);
    });
  });

  describe('isScreenReaderActive', () => {
    it('checks userAgent for screen reader keywords', () => {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla JAWS', configurable: true });
      expect(mod.isScreenReaderActive()).toBe(true);
    });
  });

  describe('RovingTabIndex', () => {
    it('initializes with container and items', () => {
      const items = [
        { setAttribute: vi.fn(), addEventListener: vi.fn(), focus: vi.fn() },
        { setAttribute: vi.fn(), addEventListener: vi.fn(), focus: vi.fn() },
      ];
      const container = {
        querySelectorAll: vi.fn(() => items),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      const rti = new mod.RovingTabIndex(container, 'button');
      expect(container.querySelectorAll).toHaveBeenCalledWith('button');
      expect(items[0].setAttribute).toHaveBeenCalledWith('tabindex', '0');
      expect(items[1].setAttribute).toHaveBeenCalledWith('tabindex', '-1');
    });

    it('moveNext increments currentIndex', () => {
      const items = [
        { setAttribute: vi.fn(), addEventListener: vi.fn(), focus: vi.fn() },
        { setAttribute: vi.fn(), addEventListener: vi.fn(), focus: vi.fn() },
      ];
      const container = { querySelectorAll: vi.fn(() => items), addEventListener: vi.fn(), removeEventListener: vi.fn() };
      const rti = new mod.RovingTabIndex(container, 'button');
      rti.moveNext();
      expect(items[1].focus).toHaveBeenCalled();
    });

    it('movePrevious decrements currentIndex', () => {
      const items = [
        { setAttribute: vi.fn(), addEventListener: vi.fn(), focus: vi.fn() },
        { setAttribute: vi.fn(), addEventListener: vi.fn(), focus: vi.fn() },
      ];
      const container = { querySelectorAll: vi.fn(() => items), addEventListener: vi.fn(), removeEventListener: vi.fn() };
      const rti = new mod.RovingTabIndex(container, 'button');
      rti.currentIndex = 0;
      rti.movePrevious();
      expect(items[1].focus).toHaveBeenCalled();
    });

    it('moveFirst and moveLast work correctly', () => {
      const items = [
        { setAttribute: vi.fn(), addEventListener: vi.fn(), focus: vi.fn() },
        { setAttribute: vi.fn(), addEventListener: vi.fn(), focus: vi.fn() },
      ];
      const container = { querySelectorAll: vi.fn(() => items), addEventListener: vi.fn(), removeEventListener: vi.fn() };
      const rti = new mod.RovingTabIndex(container, 'button');
      rti.moveFirst();
      expect(items[0].focus).toHaveBeenCalled();
      rti.moveLast();
      expect(items[1].focus).toHaveBeenCalled();
    });

    it('handleKeyDown dispatches to correct method', () => {
      const items = [
        { setAttribute: vi.fn(), addEventListener: vi.fn(), focus: vi.fn() },
        { setAttribute: vi.fn(), addEventListener: vi.fn(), focus: vi.fn() },
      ];
      const container = { querySelectorAll: vi.fn(() => items), addEventListener: vi.fn(), removeEventListener: vi.fn() };
      const rti = new mod.RovingTabIndex(container, 'button');
      rti.moveNext = vi.fn();
      rti.movePrevious = vi.fn();
      rti.moveFirst = vi.fn();
      rti.moveLast = vi.fn();
      rti.handleKeyDown({ key: 'ArrowDown', preventDefault: vi.fn() });
      expect(rti.moveNext).toHaveBeenCalled();
      rti.handleKeyDown({ key: 'ArrowUp', preventDefault: vi.fn() });
      expect(rti.movePrevious).toHaveBeenCalled();
      rti.handleKeyDown({ key: 'Home', preventDefault: vi.fn() });
      expect(rti.moveFirst).toHaveBeenCalled();
      rti.handleKeyDown({ key: 'End', preventDefault: vi.fn() });
      expect(rti.moveLast).toHaveBeenCalled();
    });

    it('destroy removes keydown listener', () => {
      const items = [
        { setAttribute: vi.fn(), addEventListener: vi.fn(), focus: vi.fn() },
      ];
      const container = { querySelectorAll: vi.fn(() => items), addEventListener: vi.fn(), removeEventListener: vi.fn() };
      const rti = new mod.RovingTabIndex(container, 'button');
      rti.destroy();
      expect(container.removeEventListener).toHaveBeenCalledWith('keydown', rti.handleKeyDown);
    });
  });
});
