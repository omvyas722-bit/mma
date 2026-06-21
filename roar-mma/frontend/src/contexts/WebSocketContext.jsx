import { createContext, useEffect, useState, useRef, useContext, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const WebSocketContext = createContext();

const MAX_STEPS = 500;

export function WebSocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef(null);
  const stepListenersRef = useRef(new Set());
  const latestStepsRef = useRef([]);

  const addStepListener = useCallback((fn) => {
    stepListenersRef.current.add(fn);
    return () => stepListenersRef.current.delete(fn);
  }, []);

  const onAgentStep = useCallback((step) => {
    latestStepsRef.current = [step, ...latestStepsRef.current].slice(0, MAX_STEPS);
    stepListenersRef.current.forEach(fn => { try { fn(step); } catch {} });
  }, []);

  const getRecentSteps = useCallback((count = 100) => {
    return latestStepsRef.current.slice(0, count);
  }, []);

  const connectWebSocket = useCallback(function connectWs() {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    const token = localStorage.getItem('token');

    if (!token) return;

    function handleWebSocketMessage(message) {
      const { type, data } = message;

      switch (type) {
        case 'agent:step':
          onAgentStep(message);
          break;

        case 'connected':
          break;

        case 'member:created':
        case 'member:updated':
          queryClient.invalidateQueries({ queryKey: ['members'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;

        case 'booking:created':
        case 'booking:cancelled':
          queryClient.invalidateQueries({ queryKey: ['classes'] });
          queryClient.invalidateQueries({ queryKey: ['bookings'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;

        case 'lead:created':
        case 'lead:updated':
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;

        case 'payment:succeeded':
        case 'payment:failed':
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;

        case 'ai:action_pending':
          queryClient.invalidateQueries({ queryKey: ['ai-queue'] });
          break;

        default:
          if (import.meta.env.DEV && !type?.startsWith('agent:')) console.log('WebSocket message:', type);
      }
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'auth', token }));
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          if (import.meta.env.DEV) console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setConnected(false);

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          if (localStorage.getItem('token')) {
            connectWs();
          }
        }, 3000);
      };

      ws.onerror = () => {};
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to create WebSocket:', error);
    }
  }, [queryClient, onAgentStep]);

  const token = localStorage.getItem('token');
  const hasToken = !!token;

  useEffect(() => {
    if (!hasToken) return;

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [hasToken, connectWebSocket]);

  const value = useMemo(() => ({ connected, addStepListener, getRecentSteps }), [connected, addStepListener, getRecentSteps]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}
