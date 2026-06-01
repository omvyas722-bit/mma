import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationProvider, useNotifications } from './NotificationContext';

function TestComponent() {
  const { notifications, addNotification, removeNotification, clearAll, success, error, warning, info } = useNotifications();
  return (
    <div>
      <div data-testid="count">{notifications.length}</div>
      <button type="button" onClick={() => addNotification({ message: 'Hello' })}>Add</button>
      <button type="button" onClick={() => success('Success!')}>Success</button>
      <button type="button" onClick={() => error('Error!')}>Error</button>
      <button type="button" onClick={() => warning('Warning!')}>Warning</button>
      <button type="button" onClick={() => info('Info!')}>Info</button>
      <button type="button" onClick={() => addNotification({ message: 'No dismiss', dismissible: false, duration: 0 })}>NoDismiss</button>
      <button type="button" onClick={clearAll}>Clear</button>
    </div>
  );
}

function renderWithProvider(component) {
  return render(
    <NotificationProvider>{component}</NotificationProvider>
  );
}

describe('NotificationContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no notifications', () => {
    renderWithProvider(<TestComponent />);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('adds a notification', () => {
    renderWithProvider(<TestComponent />);
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('adds multiple notifications', () => {
    renderWithProvider(<TestComponent />);
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('count')).toHaveTextContent('2');
  });

  it('success notification renders with message', () => {
    renderWithProvider(<TestComponent />);
    fireEvent.click(screen.getByText('Success'));
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('error notification renders with message', () => {
    renderWithProvider(<TestComponent />);
    fireEvent.click(screen.getByText('Error'));
    expect(screen.getByText('Error!')).toBeInTheDocument();
  });

  it('warning notification renders with message', () => {
    renderWithProvider(<TestComponent />);
    fireEvent.click(screen.getByText('Warning'));
    expect(screen.getByText('Warning!')).toBeInTheDocument();
  });

  it('info notification renders with message', () => {
    renderWithProvider(<TestComponent />);
    fireEvent.click(screen.getByText('Info'));
    expect(screen.getByText('Info!')).toBeInTheDocument();
  });

  it('dismisses notification on close button click', () => {
    renderWithProvider(<TestComponent />);
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    fireEvent.click(screen.getByLabelText('Dismiss notification'));
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('auto-dismisses after duration', () => {
    renderWithProvider(<TestComponent />);
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('notification without dismiss button when dismissible is false', () => {
    renderWithProvider(<TestComponent />);
    fireEvent.click(screen.getByText('NoDismiss'));
    expect(screen.queryByLabelText('Dismiss notification')).not.toBeInTheDocument();
  });

  it('clears all notifications', () => {
    renderWithProvider(<TestComponent />);
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('throws when useNotifications used outside provider', () => {
    expect(() => render(<TestComponent />)).toThrow('useNotifications must be used within a NotificationProvider');
  });
});
