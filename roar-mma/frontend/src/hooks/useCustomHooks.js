// Custom React Hooks Library

import { useState, useEffect, useRef, useCallback } from 'react';

// useDebounce - Debounce a value
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// useThrottle - Throttle a value
export function useThrottle(value, limit = 500) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(0);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// usePrevious - Get previous value
export function usePrevious(value) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  // eslint-disable-next-line react-hooks/refs
  return ref.current;
}

// useToggle - Toggle boolean state
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((v) => !v);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  return [value, toggle, setTrue, setFalse];
}

// useLocalStorage - Sync state with localStorage
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      try {
        setStoredValue(prev => {
          const valueToStore = value instanceof Function ? value(prev) : value;
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          return valueToStore;
        });
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error writing to localStorage:', error);
      }
    },
    [key]
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error removing from localStorage:', error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// useSessionStorage - Sync state with sessionStorage
export function useSessionStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error reading from sessionStorage:', error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      try {
        setStoredValue(prev => {
          const valueToStore = value instanceof Function ? value(prev) : value;
          window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
          return valueToStore;
        });
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error writing to sessionStorage:', error);
      }
    },
    [key]
  );

  return [storedValue, setValue];
}

// useClickOutside - Detect clicks outside element
export function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// useKeyPress - Detect key press
export function useKeyPress(targetKey, handler, options = {}) {
  const { event = 'keydown', enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e) => {
      if (e.key === targetKey) {
        handler(e);
      }
    };

    window.addEventListener(event, handleKeyPress);

    return () => {
      window.removeEventListener(event, handleKeyPress);
    };
  }, [targetKey, handler, event, enabled]);
}

// useMediaQuery - Detect media query match
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);

    mediaQuery.addEventListener('change', handler);

    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
}

// useWindowSize - Get window dimensions
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowSize;
}

// useOnScreen - Detect if element is visible on screen
export function useOnScreen(ref, options = {}) {
  const [isIntersecting, setIntersecting] = useState(false);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIntersecting(entry.isIntersecting),
      optionsRef.current
    );

    const element = ref.current;
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [ref]);

  return isIntersecting;
}

// useInterval - Declarative interval
export function useInterval(callback, delay) {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const tick = () => {
      savedCallback.current();
    };

    const id = setInterval(tick, delay);

    return () => {
      clearInterval(id);
    };
  }, [delay]);
}

// useTimeout - Declarative timeout
export function useTimeout(callback, delay) {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setTimeout(() => {
      savedCallback.current();
    }, delay);

    return () => {
      clearTimeout(id);
    };
  }, [delay]);
}

// useCopyToClipboard - Copy text to clipboard
export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState(null);

  const copy = useCallback(async (text) => {
    if (!navigator?.clipboard) {
      if (import.meta.env.DEV) console.warn('Clipboard not supported');
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to copy:', error);
      setCopiedText(null);
      return false;
    }
  }, []);

  return [copiedText, copy];
}

// useAsync - Handle async operations
export function useAsync(asyncFunction, immediate = true) {
  const [status, setStatus] = useState('idle');
  const [value, setValue] = useState(null);
  const [error, setError] = useState(null);
  const asyncFnRef = useRef(asyncFunction);

  useEffect(() => {
    asyncFnRef.current = asyncFunction;
  }, [asyncFunction]);

  const execute = useCallback(
    async (...params) => {
      setStatus('pending');
      setValue(null);
      setError(null);

      try {
        const response = await asyncFnRef.current(...params);
        setValue(response);
        setStatus('success');
        return response;
      } catch (error) {
        setError(error);
        setStatus('error');
        throw error;
      }
    },
    []
  );

  useEffect(() => {
    if (immediate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      execute();
    }
  }, [execute, immediate]);

  return {
    execute,
    status,
    value,
    error,
    isIdle: status === 'idle',
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error',
  };
}

// useForm - Form state management
export function useForm(initialValues = {}, onSubmit) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const valuesRef = useRef(values);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    valuesRef.current = values;
    onSubmitRef.current = onSubmit;
  }, [values, onSubmit]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  }, []);

  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const setFieldError = useCallback((name, error) => {
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  }, []);

  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched((prev) => ({
      ...prev,
      [name]: isTouched,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const handleSubmit = useCallback(
    async (e) => {
      if (e) {
        e.preventDefault();
      }

      setIsSubmitting(true);

      try {
        await onSubmitRef.current(valuesRef.current);
        resetForm();
      } catch (error) {
        if (import.meta.env.DEV) console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [resetForm]
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    resetForm,
  };
}

// useArray - Array state helpers
export function useArray(initialArray = []) {
  const [array, setArray] = useState(initialArray);

  const push = useCallback((element) => {
    setArray((a) => [...a, element]);
  }, []);

  const filter = useCallback((callback) => {
    setArray((a) => a.filter(callback));
  }, []);

  const update = useCallback((index, newElement) => {
    setArray((a) => [
      ...a.slice(0, index),
      newElement,
      ...a.slice(index + 1),
    ]);
  }, []);

  const remove = useCallback((index) => {
    setArray((a) => [...a.slice(0, index), ...a.slice(index + 1)]);
  }, []);

  const clear = useCallback(() => {
    setArray([]);
  }, []);

  return {
    array,
    set: setArray,
    push,
    filter,
    update,
    remove,
    clear,
  };
}

// useCounter - Counter state helpers
export function useCounter(initialValue = 0, options = {}) {
  const { min, max } = options;
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount((c) => {
      const newCount = c + 1;
      return max !== undefined ? Math.min(newCount, max) : newCount;
    });
  }, [max]);

  const decrement = useCallback(() => {
    setCount((c) => {
      const newCount = c - 1;
      return min !== undefined ? Math.max(newCount, min) : newCount;
    });
  }, [min]);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  const set = useCallback((value) => {
    setCount((c) => {
      let newCount = typeof value === 'function' ? value(c) : value;
      if (min !== undefined) newCount = Math.max(newCount, min);
      if (max !== undefined) newCount = Math.min(newCount, max);
      return newCount;
    });
  }, [min, max]);

  return {
    count,
    increment,
    decrement,
    reset,
    set,
  };
}

// useDisclosure - Modal/Drawer state management
export function useDisclosure(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

// useFocus - Focus management
export function useFocus() {
  const ref = useRef(null);

  const setFocus = useCallback(() => {
    ref.current?.focus();
  }, []);

  return [ref, setFocus];
}

// useHover - Detect hover state
export function useHover() {
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef(null);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  useEffect(() => {
    const node = ref.current;
    if (node) {
      node.addEventListener('mouseenter', handleMouseEnter);
      node.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        node.removeEventListener('mouseenter', handleMouseEnter);
        node.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [handleMouseEnter, handleMouseLeave]);

  return [ref, isHovered];
}

// useIdle - Detect user idle state
export function useIdle(timeout = 60000) {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let timeoutId;

    const handleActivity = () => {
      setIsIdle(false);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setIsIdle(true), timeout);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    timeoutId = setTimeout(() => setIsIdle(true), timeout);

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      clearTimeout(timeoutId);
    };
  }, [timeout]);

  return isIdle;
}

// useScrollPosition - Get scroll position
export function useScrollPosition() {
  const [scrollPosition, setScrollPosition] = useState({
    x: window.pageXOffset,
    y: window.pageYOffset,
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition({
        x: window.pageXOffset,
        y: window.pageYOffset,
      });
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return scrollPosition;
}

// useDocumentTitle - Update document title
export function useDocumentTitle(title) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}

// useFavicon - Update favicon
export function useFavicon(href) {
  useEffect(() => {
    const head = document.getElementsByTagName('head')[0];
    const existingLinks = head.querySelectorAll("link[rel*='icon']");
    existingLinks.forEach(link => link.remove());
    const link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = href;
    head.appendChild(link);
  }, [href]);
}

export default {
  useDebounce,
  useThrottle,
  usePrevious,
  useToggle,
  useLocalStorage,
  useSessionStorage,
  useClickOutside,
  useKeyPress,
  useMediaQuery,
  useWindowSize,
  useOnScreen,
  useInterval,
  useTimeout,
  useCopyToClipboard,
  useAsync,
  useForm,
  useArray,
  useCounter,
  useDisclosure,
  useFocus,
  useHover,
  useIdle,
  useScrollPosition,
  useDocumentTitle,
  useFavicon,
};
