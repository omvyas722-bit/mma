import { renderHook, act, render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useDebounce,
  useThrottle,
  usePrevious,
  useToggle,
  useLocalStorage,
  useSessionStorage,
  useCounter,
  useDisclosure,
  useArray,
  useHover,
  useInterval,
  useTimeout,
  useDocumentTitle,
  useFocus,
  useCopyToClipboard,
  useClickOutside,
  useKeyPress,
  useAsync,
  useForm,
  useMediaQuery,
  useIdle,
  useOnScreen,
} from './useCustomHooks';

describe('useToggle', () => {
  it('starts with default false', () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current[0]).toBe(false);
  });

  it('starts with initial value', () => {
    const { result } = renderHook(() => useToggle(true));
    expect(result.current[0]).toBe(true);
  });

  it('toggle flips value', () => {
    const { result } = renderHook(() => useToggle(false));
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
  });

  it('setTrue and setFalse work', () => {
    const { result } = renderHook(() => useToggle(false));
    act(() => result.current[2]());
    expect(result.current[0]).toBe(true);
    act(() => result.current[3]());
    expect(result.current[0]).toBe(false);
  });
});

describe('useCounter', () => {
  it('starts at initial value', () => {
    const { result } = renderHook(() => useCounter(5));
    expect(result.current.count).toBe(5);
  });

  it('increments', () => {
    const { result } = renderHook(() => useCounter(0));
    act(() => result.current.increment());
    expect(result.current.count).toBe(1);
  });

  it('decrements', () => {
    const { result } = renderHook(() => useCounter(5));
    act(() => result.current.decrement());
    expect(result.current.count).toBe(4);
  });

  it('respects max', () => {
    const { result } = renderHook(() => useCounter(8, { max: 10 }));
    act(() => result.current.increment());
    act(() => result.current.increment());
    act(() => result.current.increment());
    expect(result.current.count).toBe(10);
  });

  it('respects min', () => {
    const { result } = renderHook(() => useCounter(2, { min: 0 }));
    act(() => result.current.decrement());
    act(() => result.current.decrement());
    act(() => result.current.decrement());
    expect(result.current.count).toBe(0);
  });

  it('resets to initial', () => {
    const { result } = renderHook(() => useCounter(10));
    act(() => result.current.increment());
    act(() => result.current.reset());
    expect(result.current.count).toBe(10);
  });

  it('set with function updater', () => {
    const { result } = renderHook(() => useCounter(0));
    act(() => result.current.set(c => c + 5));
    expect(result.current.count).toBe(5);
  });
});

describe('useDisclosure', () => {
  it('starts closed by default', () => {
    const { result } = renderHook(() => useDisclosure());
    expect(result.current.isOpen).toBe(false);
  });

  it('open sets isOpen true', () => {
    const { result } = renderHook(() => useDisclosure());
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
  });

  it('close sets isOpen false', () => {
    const { result } = renderHook(() => useDisclosure(true));
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it('toggle flips', () => {
    const { result } = renderHook(() => useDisclosure());
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(false);
  });
});

describe('useArray', () => {
  it('starts with initial array', () => {
    const { result } = renderHook(() => useArray([1, 2, 3]));
    expect(result.current.array).toEqual([1, 2, 3]);
  });

  it('push adds element', () => {
    const { result } = renderHook(() => useArray([1]));
    act(() => result.current.push(2));
    expect(result.current.array).toEqual([1, 2]);
  });

  it('filter removes matching elements', () => {
    const { result } = renderHook(() => useArray([1, 2, 3, 4]));
    act(() => result.current.filter(n => n % 2 === 0));
    expect(result.current.array).toEqual([2, 4]);
  });

  it('update replaces at index', () => {
    const { result } = renderHook(() => useArray([1, 2, 3]));
    act(() => result.current.update(1, 99));
    expect(result.current.array).toEqual([1, 99, 3]);
  });

  it('remove deletes at index', () => {
    const { result } = renderHook(() => useArray([1, 2, 3]));
    act(() => result.current.remove(0));
    expect(result.current.array).toEqual([2, 3]);
  });

  it('clear empties', () => {
    const { result } = renderHook(() => useArray([1, 2, 3]));
    act(() => result.current.clear());
    expect(result.current.array).toEqual([]);
  });
});

describe('usePrevious', () => {
  it('returns current value on first render', () => {
    const { result } = renderHook(() => usePrevious(1));
    expect(result.current).toBe(1);
  });

  it('returns previous value after update', () => {
    const { result, rerender } = renderHook(({ val }) => usePrevious(val), { initialProps: { val: 1 } });
    rerender({ val: 2 });
    expect(result.current).toBe(1);
    rerender({ val: 3 });
    expect(result.current).toBe(2);
  });
});

describe('useDebounce', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('updates after delay', () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 300), { initialProps: { val: 'a' } });
    rerender({ val: 'b' });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('b');
  });
});

describe('useLocalStorage', () => {
  beforeEach(() => localStorage.clear());

  it('returns initial value when key missing', () => {
    const { result } = renderHook(() => useLocalStorage('missing', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('stores and retrieves value', () => {
    const { result } = renderHook(() => useLocalStorage('key', ''));
    act(() => result.current[1]('stored'));
    expect(result.current[0]).toBe('stored');
    expect(localStorage.getItem('key')).toBe('"stored"');
  });

  it('removes value and resets to initial', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    act(() => result.current[1]('stored'));
    act(() => result.current[2]());
    expect(result.current[0]).toBe('default');
    expect(localStorage.getItem('key')).toBeNull();
  });

  it('reads existing value from localStorage', () => {
    localStorage.setItem('key', '"existing"');
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    expect(result.current[0]).toBe('existing');
  });

  it('uses function updater', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));
    act(() => result.current[1](prev => prev + 1));
    expect(result.current[0]).toBe(1);
  });
});

describe('useSessionStorage', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns initial value when key missing', () => {
    const { result } = renderHook(() => useSessionStorage('missing', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('stores value', () => {
    const { result } = renderHook(() => useSessionStorage('key', ''));
    act(() => result.current[1]('stored'));
    expect(result.current[0]).toBe('stored');
  });
});

describe('useInterval', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('calls callback on interval', () => {
    const fn = vi.fn();
    renderHook(() => useInterval(fn, 1000));
    expect(fn).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(fn).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not call when delay is null', () => {
    const fn = vi.fn();
    renderHook(() => useInterval(fn, null));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('useTimeout', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('calls callback after delay', () => {
    const fn = vi.fn();
    renderHook(() => useTimeout(fn, 1000));
    expect(fn).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not call when delay is null', () => {
    const fn = vi.fn();
    renderHook(() => useTimeout(fn, null));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('useHover', () => {
  it('returns ref and hover state', () => {
    const { result } = renderHook(() => useHover());
    expect(result.current[1]).toBe(false);
    expect(result.current[0]).toHaveProperty('current');
  });
});

describe('useThrottle', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns initial value', () => {
    const { result } = renderHook(() => useThrottle('hello', 500));
    expect(result.current).toBe('hello');
  });

  it('updates after throttle limit', () => {
    const { result, rerender } = renderHook(({ val }) => useThrottle(val, 500), { initialProps: { val: 'a' } });
    rerender({ val: 'b' });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe('b');
  });
});

describe('useDocumentTitle', () => {
  it('sets document title', () => {
    const prevTitle = document.title;
    renderHook(() => useDocumentTitle('New Title'));
    expect(document.title).toBe('New Title');
    document.title = prevTitle;
  });

  it('restores previous title on unmount', () => {
    document.title = 'Original';
    const { unmount } = renderHook(() => useDocumentTitle('Temp'));
    expect(document.title).toBe('Temp');
    unmount();
    expect(document.title).toBe('Original');
  });
});

describe('useFocus', () => {
  it('returns ref and setFocus function', () => {
    const { result } = renderHook(() => useFocus());
    expect(result.current[0]).toHaveProperty('current');
    expect(result.current[1]).toBeInstanceOf(Function);
  });

  it('focuses the ref element when called', () => {
    const { result } = renderHook(() => useFocus());
    const input = document.createElement('input');
    const focusSpy = vi.spyOn(input, 'focus');
    result.current[0].current = input;
    act(() => result.current[1]());
    expect(focusSpy).toHaveBeenCalled();
  });
});

describe('useCopyToClipboard', () => {
  it('returns copy function', () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current[1]).toBeInstanceOf(Function);
  });

  it('copies text and sets copiedText', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } });
    const { result } = renderHook(() => useCopyToClipboard());
    let success;
    await act(async () => { success = await result.current[1]('hello'); });
    expect(success).toBe(true);
    expect(result.current[0]).toBe('hello');
  });

  it('returns false when clipboard unavailable', async () => {
    delete navigator.clipboard;
    const { result } = renderHook(() => useCopyToClipboard());
    let success;
    await act(async () => { success = await result.current[1]('hello'); });
    expect(success).toBe(false);
  });
});

describe('useClickOutside', () => {
  it('calls handler when clicking outside', () => {
    const handler = vi.fn();
    const ref = { current: document.createElement('div') };
    renderHook(() => useClickOutside(ref, handler));
    act(() => { document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(handler).toHaveBeenCalled();
  });

  it('does not call handler when clicking inside', () => {
    const handler = vi.fn();
    const div = document.createElement('div');
    const ref = { current: div };
    renderHook(() => useClickOutside(ref, handler));
    act(() => { div.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('useKeyPress', () => {
  it('calls handler on matching key', () => {
    const handler = vi.fn();
    renderHook(() => useKeyPress('Enter', handler));
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); });
    expect(handler).toHaveBeenCalled();
  });

  it('does not call handler on non-matching key', () => {
    const handler = vi.fn();
    renderHook(() => useKeyPress('Enter', handler));
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not call handler when disabled', () => {
    const handler = vi.fn();
    renderHook(() => useKeyPress('Enter', handler, { enabled: false }));
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('useAsync', () => {
  it('executes async function immediately', async () => {
    const asyncFn = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useAsync(asyncFn, true));
    await vi.waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.value).toBe('data');
  });

  it('returns idle status when not immediate', () => {
    const asyncFn = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useAsync(asyncFn, false));
    expect(result.current.isIdle).toBe(true);
  });

  it('executes on demand', async () => {
    const asyncFn = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useAsync(asyncFn, false));
    await act(async () => { await result.current.execute(); });
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.value).toBe('data');
  });

  it('handles errors', async () => {
    const error = new Error('fail');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const handler = vi.fn();
    if (typeof process !== 'undefined' && process.on) {
      process.on('unhandledRejection', handler);
    }
    const { result } = renderHook(() => useAsync(asyncFn, true));
    await vi.waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toBe(error);
    if (typeof process !== 'undefined' && process.off) {
      process.off('unhandledRejection', handler);
    }
  });
});

describe('useForm', () => {
  const initialValues = { name: '', email: '', agree: false };

  it('returns initial values', () => {
    const { result } = renderHook(() => useForm(initialValues));
    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });

  it('handleChange updates text field', () => {
    const { result } = renderHook(() => useForm(initialValues));
    act(() => result.current.handleChange({ target: { name: 'name', value: 'John', type: 'text', checked: false } }));
    expect(result.current.values.name).toBe('John');
  });

  it('handleChange updates checkbox', () => {
    const { result } = renderHook(() => useForm(initialValues));
    act(() => result.current.handleChange({ target: { name: 'agree', value: 'false', type: 'checkbox', checked: true } }));
    expect(result.current.values.agree).toBe(true);
  });

  it('handleBlur marks field touched', () => {
    const { result } = renderHook(() => useForm(initialValues));
    act(() => result.current.handleBlur({ target: { name: 'email' } }));
    expect(result.current.touched.email).toBe(true);
  });

  it('setFieldValue updates field', () => {
    const { result } = renderHook(() => useForm(initialValues));
    act(() => result.current.setFieldValue('name', 'Jane'));
    expect(result.current.values.name).toBe('Jane');
  });

  it('setFieldError and setFieldTouched work', () => {
    const { result } = renderHook(() => useForm(initialValues));
    act(() => result.current.setFieldError('name', 'Required'));
    expect(result.current.errors.name).toBe('Required');
    act(() => result.current.setFieldTouched('email', true));
    expect(result.current.touched.email).toBe(true);
  });

  it('resetForm resets all state', () => {
    const { result } = renderHook(() => useForm({ name: 'test' }));
    act(() => result.current.handleChange({ target: { name: 'name', value: 'changed', type: 'text', checked: false } }));
    act(() => result.current.setFieldError('name', 'err'));
    act(() => result.current.resetForm());
    expect(result.current.values.name).toBe('test');
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });

  it('handleSubmit calls onSubmit and resets', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const { result } = renderHook(() => useForm(initialValues, onSubmit));
    act(() => result.current.handleChange({ target: { name: 'name', value: 'John', type: 'text', checked: false } }));
    await act(async () => await result.current.handleSubmit({ preventDefault: vi.fn() }));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'John', email: '', agree: false });
    expect(result.current.isSubmitting).toBe(false);
  });
});

describe('useMediaQuery', () => {
  it('returns matches based on query', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(typeof result.current).toBe('boolean');
  });

  it('calls matchMedia with query', () => {
    const spy = vi.spyOn(window, 'matchMedia');
    renderHook(() => useMediaQuery('(max-width: 480px)'));
    expect(spy).toHaveBeenCalledWith('(max-width: 480px)');
  });
});

describe('useIdle', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts as not idle', () => {
    const { result } = renderHook(() => useIdle(1000));
    expect(result.current).toBe(false);
  });

  it('becomes idle after timeout', () => {
    const { result } = renderHook(() => useIdle(1000));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe(true);
  });

  it('resets idle on activity event', () => {
    const { result } = renderHook(() => useIdle(1000));
    act(() => { vi.advanceTimersByTime(500); });
    act(() => { document.dispatchEvent(new Event('mousedown')); });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe(true);
  });
});

describe('useOnScreen', () => {
  it('returns intersection state', () => {
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() => useOnScreen(ref));
    expect(typeof result.current).toBe('boolean');
  });

  it('handles null ref', () => {
    const ref = { current: null };
    const { result } = renderHook(() => useOnScreen(ref));
    expect(result.current).toBe(false);
  });
});
