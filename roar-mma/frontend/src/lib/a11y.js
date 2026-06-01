// Accessibility Utilities and Helpers

// Focus management
export function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}

// Announce to screen readers
export function announce(message, priority = 'polite') {
  const announcer = document.getElementById('a11y-announcer') || createAnnouncer();
  announcer.setAttribute('aria-live', priority);
  announcer.textContent = message;

  // Clear after announcement
  setTimeout(() => {
    announcer.textContent = '';
  }, 1000);
}

function createAnnouncer() {
  const announcer = document.createElement('div');
  announcer.id = 'a11y-announcer';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.style.cssText = `
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `;
  document.body.appendChild(announcer);
  return announcer;
}

// Generate unique IDs for ARIA relationships
let idCounter = 0;
export function generateId(prefix = 'a11y') {
  return `${prefix}-${++idCounter}`;
}

// Check if element is visible
export function isVisible(element) {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetParent !== null
  );
}

// Get all focusable elements
export function getFocusableElements(container = document) {
  const elements = container.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  return Array.from(elements).filter(isVisible);
}

// Focus first element
export function focusFirst(container) {
  const focusable = getFocusableElements(container);
  if (focusable.length > 0) {
    focusable[0].focus();
    return true;
  }
  return false;
}

// Restore focus to previous element
export function createFocusManager() {
  let previousFocus = null;

  return {
    save() {
      previousFocus = document.activeElement;
    },
    restore() {
      if (previousFocus && previousFocus.focus) {
        previousFocus.focus();
        previousFocus = null;
      }
    },
  };
}

// Keyboard navigation helpers
export const Keys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
};

export function isActionKey(key) {
  return key === Keys.ENTER || key === Keys.SPACE;
}

export function isNavigationKey(key) {
  return [
    Keys.ARROW_UP,
    Keys.ARROW_DOWN,
    Keys.ARROW_LEFT,
    Keys.ARROW_RIGHT,
    Keys.HOME,
    Keys.END,
  ].includes(key);
}

// ARIA label helpers
export function getAriaLabel(element) {
  return (
    element.getAttribute('aria-label') ||
    element.getAttribute('aria-labelledby') ||
    element.textContent ||
    ''
  );
}

export function setAriaLabel(element, label) {
  element.setAttribute('aria-label', label);
}

// Skip link component helper
export function createSkipLink(targetId, label = 'Skip to main content') {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = label;
  skipLink.className = 'skip-link';
  skipLink.style.cssText = `
    position: absolute;
    left: -10000px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `;

  skipLink.addEventListener('focus', () => {
    skipLink.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      background: #000;
      color: #fff;
      padding: 8px 16px;
      z-index: 10000;
      text-decoration: none;
    `;
  });

  skipLink.addEventListener('blur', () => {
    skipLink.style.cssText = `
      position: absolute;
      left: -10000px;
      top: auto;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
  });

  return skipLink;
}

// Color contrast checker
export function getContrastRatio(color1, color2) {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(color) {
  const rgb = hexToRgb(color);
  const [r, g, b] = rgb.map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

export function meetsWCAGAA(contrastRatio, fontSize = 16) {
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && isBold());
  return isLargeText ? contrastRatio >= 3 : contrastRatio >= 4.5;
}

export function meetsWCAGAAA(contrastRatio, fontSize = 16) {
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && isBold());
  return isLargeText ? contrastRatio >= 4.5 : contrastRatio >= 7;
}

function isBold() {
  // This is a simplified check
  return false;
}

// Reduced motion detection
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useReducedMotion(callback) {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const handleChange = () => {
    callback(mediaQuery.matches);
  };

  mediaQuery.addEventListener('change', handleChange);
  handleChange(); // Call immediately

  return () => mediaQuery.removeEventListener('change', handleChange);
}

// High contrast mode detection
export function prefersHighContrast() {
  return (
    window.matchMedia('(prefers-contrast: high)').matches ||
    window.matchMedia('(-ms-high-contrast: active)').matches
  );
}

// Screen reader detection (not 100% reliable)
export function isScreenReaderActive() {
  // This is a heuristic and not foolproof
  return (
    navigator.userAgent.includes('JAWS') ||
    navigator.userAgent.includes('NVDA') ||
    navigator.userAgent.includes('VoiceOver')
  );
}

// Roving tabindex manager for lists/grids
export class RovingTabIndex {
  constructor(container, itemSelector) {
    this.container = container;
    this.itemSelector = itemSelector;
    this.currentIndex = 0;
    this.items = [];
    this.init();
  }

  init() {
    this.updateItems();
    this.setTabIndex();
    this.attachListeners();
  }

  updateItems() {
    this.items = Array.from(this.container.querySelectorAll(this.itemSelector));
  }

  setTabIndex() {
    this.items.forEach((item, index) => {
      item.setAttribute('tabindex', index === this.currentIndex ? '0' : '-1');
    });
  }

  attachListeners() {
    this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.items.forEach((item, index) => {
      item.addEventListener('focus', () => {
        this.currentIndex = index;
        this.setTabIndex();
      });
    });
  }

  handleKeyDown(e) {
    const { key } = e;

    switch (key) {
      case Keys.ARROW_DOWN:
      case Keys.ARROW_RIGHT:
        e.preventDefault();
        this.moveNext();
        break;
      case Keys.ARROW_UP:
      case Keys.ARROW_LEFT:
        e.preventDefault();
        this.movePrevious();
        break;
      case Keys.HOME:
        e.preventDefault();
        this.moveFirst();
        break;
      case Keys.END:
        e.preventDefault();
        this.moveLast();
        break;
    }
  }

  moveNext() {
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
    this.focusCurrent();
  }

  movePrevious() {
    this.currentIndex =
      (this.currentIndex - 1 + this.items.length) % this.items.length;
    this.focusCurrent();
  }

  moveFirst() {
    this.currentIndex = 0;
    this.focusCurrent();
  }

  moveLast() {
    this.currentIndex = this.items.length - 1;
    this.focusCurrent();
  }

  focusCurrent() {
    this.setTabIndex();
    this.items[this.currentIndex].focus();
  }

  destroy() {
    this.container.removeEventListener('keydown', this.handleKeyDown);
  }
}

// Usage examples and documentation
/*
// Focus trap in modal
import { trapFocus, createFocusManager } from './lib/a11y';

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);
  const focusManager = createFocusManager();

  useEffect(() => {
    if (isOpen && modalRef.current) {
      focusManager.save();
      const cleanup = trapFocus(modalRef.current);
      return () => {
        cleanup();
        focusManager.restore();
      };
    }
  }, [isOpen]);

  return <div ref={modalRef}>{children}</div>;
}

// Screen reader announcements
import { announce } from './lib/a11y';

function SaveButton() {
  const handleSave = async () => {
    await saveData();
    announce('Data saved successfully');
  };

  return <button onClick={handleSave}>Save</button>;
}

// Roving tabindex for toolbar
import { RovingTabIndex } from './lib/a11y';

function Toolbar() {
  const toolbarRef = useRef(null);

  useEffect(() => {
    if (toolbarRef.current) {
      const rovingTabIndex = new RovingTabIndex(
        toolbarRef.current,
        'button'
      );
      return () => rovingTabIndex.destroy();
    }
  }, []);

  return (
    <div ref={toolbarRef} role="toolbar">
      <button>Cut</button>
      <button>Copy</button>
      <button>Paste</button>
    </div>
  );
}

// Reduced motion
import { prefersReducedMotion } from './lib/a11y';

function AnimatedComponent() {
  const shouldReduceMotion = prefersReducedMotion();

  return (
    <div
      className={shouldReduceMotion ? 'no-animation' : 'with-animation'}
    >
      Content
    </div>
  );
}
*/
