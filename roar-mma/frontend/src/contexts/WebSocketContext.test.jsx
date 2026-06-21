import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebSocketProvider, useWebSocket } from './WebSocketContext';
import { server } from '../test/mocks/server';

class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    MockWebSocket.instances.push(this);
  }
  send(data) { MockWebSocket.lastSend = data; }
  close() {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  }
  addEventListener() {}
  removeEventListener() {}
  static instances = [];
  static lastSend = null;
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
}

vi.stubGlobal('WebSocket', MockWebSocket);

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function TestComponent() {
  const { connected, addStepListener, getRecentSteps } = useWebSocket();
  return (
    <div>
      <div data-testid="connected">{connected.toString()}</div>
      <div data-testid="steps">{JSON.stringify(getRecentSteps(3))}</div>
    </div>
  );
}

function renderWithProvider(component) {
  const qc = createQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <WebSocketProvider>{component}</WebSocketProvider>
    </QueryClientProvider>
  );
}

describe('WebSocketContext', () => {
  beforeAll(() => { server.close(); });
  afterAll(() => { server.listen({ onUnhandledRequest: 'warn' }); });

  beforeEach(() => {
    MockWebSocket.instances = [];
    MockWebSocket.lastSend = null;
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    MockWebSocket.instances = [];
    MockWebSocket.lastSend = null;
    localStorage.removeItem('token');
  });

  it('provides connected false initially', () => {
    renderWithProvider(<TestComponent />);
    expect(screen.getByTestId('connected')).toHaveTextContent('false');
  });

  it('provides connected false when no token', () => {
    localStorage.removeItem('token');
    renderWithProvider(<TestComponent />);
    expect(screen.getByTestId('connected')).toHaveTextContent('false');
  });

  it('connects and sets connected true on mount with token', () => {
    renderWithProvider(<TestComponent />);
    const ws = MockWebSocket.instances[0];
    expect(ws).toBeDefined();
    act(() => { ws.onopen(); });
    expect(screen.getByTestId('connected')).toHaveTextContent('true');
  });

  it('sends auth token on connection open', () => {
    renderWithProvider(<TestComponent />);
    const ws = MockWebSocket.instances[0];
    act(() => { ws.onopen(); });
    expect(MockWebSocket.lastSend).toBe(JSON.stringify({ type: 'auth', token: 'test-token' }));
  });

  it('sets connected false on close', () => {
    renderWithProvider(<TestComponent />);
    const ws = MockWebSocket.instances[0];
    act(() => { ws.onopen(); });
    expect(screen.getByTestId('connected')).toHaveTextContent('true');
    act(() => { ws.onclose(); });
    expect(screen.getByTestId('connected')).toHaveTextContent('false');
  });

  it('addStepListener receives agent:step messages', () => {
    let received = null;
    function ListenerTest() {
      const { addStepListener, connected } = useWebSocket();
      useEffect(() => {
        if (connected) addStepListener((step) => { received = step; });
      }, [connected, addStepListener]);
      return null;
    }
    render(
      <QueryClientProvider client={createQueryClient()}>
        <WebSocketProvider><ListenerTest /></WebSocketProvider>
      </QueryClientProvider>
    );
    const ws = MockWebSocket.instances[0];
    act(() => { ws.onopen(); });
    act(() => {
      ws.onmessage({ data: JSON.stringify({ type: 'agent:step', data: { action: 'thinking' } }) });
    });
    expect(received).toEqual({ type: 'agent:step', data: { action: 'thinking' } });
  });

  it('getRecentSteps returns steps from agent:step messages', () => {
    const stepsRef = { current: null };
    function StepsTest() {
      const { addStepListener, connected, getRecentSteps } = useWebSocket();
      useEffect(() => {
        if (connected) {
          addStepListener((step) => {});
        }
      }, [connected, addStepListener]);
      useEffect(() => {
        stepsRef.current = getRecentSteps;
      });
      return <div data-testid="conn">{connected.toString()}</div>;
    }
    render(
      <QueryClientProvider client={createQueryClient()}>
        <WebSocketProvider><StepsTest /></WebSocketProvider>
      </QueryClientProvider>
    );
    const ws = MockWebSocket.instances[0];
    act(() => { ws.onopen(); });
    for (let i = 0; i < 5; i++) {
      act(() => {
        ws.onmessage({ data: JSON.stringify({ type: 'agent:step', data: { step: i } }) });
      });
    }
    const steps = stepsRef.current(3);
    expect(steps.length).toBe(3);
    expect(steps[0].data.step).toBe(4);
    expect(steps[2].data.step).toBe(2);
  });

  it('member:created invalidates member and dashboard queries', () => {
    const qc = createQueryClient();
    const spy = vi.fn();
    qc.invalidateQueries = spy;
    render(
      <QueryClientProvider client={qc}>
        <WebSocketProvider><TestComponent /></WebSocketProvider>
      </QueryClientProvider>
    );
    const ws = MockWebSocket.instances[0];
    act(() => { ws.onopen(); });
    act(() => {
      ws.onmessage({ data: JSON.stringify({ type: 'member:created' }) });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['members'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });

  it('booking:created invalidates classes, bookings, and dashboard', () => {
    const qc = createQueryClient();
    const spy = vi.fn();
    qc.invalidateQueries = spy;
    render(
      <QueryClientProvider client={qc}>
        <WebSocketProvider><TestComponent /></WebSocketProvider>
      </QueryClientProvider>
    );
    const ws = MockWebSocket.instances[0];
    act(() => { ws.onopen(); });
    act(() => {
      ws.onmessage({ data: JSON.stringify({ type: 'booking:created' }) });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['classes'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['bookings'] });
  });

  it('lead:updated invalidates leads and dashboard', () => {
    const qc = createQueryClient();
    const spy = vi.fn();
    qc.invalidateQueries = spy;
    render(
      <QueryClientProvider client={qc}>
        <WebSocketProvider><TestComponent /></WebSocketProvider>
      </QueryClientProvider>
    );
    const ws = MockWebSocket.instances[0];
    act(() => { ws.onopen(); });
    act(() => {
      ws.onmessage({ data: JSON.stringify({ type: 'lead:updated' }) });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['leads'] });
  });

  it('payment:succeeded invalidates transactions and dashboard', () => {
    const qc = createQueryClient();
    const spy = vi.fn();
    qc.invalidateQueries = spy;
    render(
      <QueryClientProvider client={qc}>
        <WebSocketProvider><TestComponent /></WebSocketProvider>
      </QueryClientProvider>
    );
    const ws = MockWebSocket.instances[0];
    act(() => { ws.onopen(); });
    act(() => {
      ws.onmessage({ data: JSON.stringify({ type: 'payment:succeeded' }) });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['transactions'] });
  });

  it('ai:action_pending invalidates ai-queue', () => {
    const qc = createQueryClient();
    const spy = vi.fn();
    qc.invalidateQueries = spy;
    render(
      <QueryClientProvider client={qc}>
        <WebSocketProvider><TestComponent /></WebSocketProvider>
      </QueryClientProvider>
    );
    const ws = MockWebSocket.instances[0];
    act(() => { ws.onopen(); });
    act(() => {
      ws.onmessage({ data: JSON.stringify({ type: 'ai:action_pending' }) });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['ai-queue'] });
  });

  it('closes WebSocket on unmount', () => {
    const spy = vi.fn();
    MockWebSocket.prototype.close = spy;
    const { unmount } = renderWithProvider(<TestComponent />);
    expect(MockWebSocket.instances[0]).toBeDefined();
    unmount();
    expect(spy).toHaveBeenCalled();
    MockWebSocket.prototype.close = function() { this.readyState = 3; if (this.onclose) this.onclose(); };
  });

  it('does not connect when no token', () => {
    localStorage.removeItem('token');
    renderWithProvider(<TestComponent />);
    expect(MockWebSocket.instances.length).toBe(0);
  });

  it('throws when useWebSocket used outside provider', () => {
    expect(() => render(<TestComponent />)).toThrow('useWebSocket must be used within');
  });
});
