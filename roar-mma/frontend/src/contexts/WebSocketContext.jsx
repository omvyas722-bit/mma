// WebSocket context for real-time updates
import { createContext, useEffect, useState, useRef, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const WebSocketContext = createContext();

export function WebSocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  function connectWebSocket() {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    const token = localStorage.getItem('token');

    if (!token) return;

    try {
      const ws = new WebSocket(`${wsUrl}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (localStorage.getItem('token')) {
            console.log('Attempting to reconnect WebSocket...');
            connectWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  function handleWebSocketMessage(message) {
    const { type, data } = message;

    console.log('WebSocket message received:', type);

    switch (type) {
      case 'connected':
        console.log('WebSocket connection confirmed:', data);
        break;

      case 'member:created':
      case 'member:updated':
        queryClient.invalidateQueries(['members']);
        queryClient.invalidateQueries(['dashboard']);
        break;

      case 'booking:created':
      case 'booking:cancelled':
        queryClient.invalidateQueries(['classes']);
        queryClient.invalidateQueries(['bookings']);
        queryClient.invalidateQueries(['dashboard']);
        break;

      case 'lead:created':
      case 'lead:updated':
        queryClient.invalidateQueries(['leads']);
        queryClient.invalidateQueries(['dashboard']);
        break;

      case 'payment:succeeded':
      case 'payment:failed':
        queryClient.invalidateQueries(['transactions']);
        queryClient.invalidateQueries(['dashboard']);
        break;

      case 'ai:action_pending':
        queryClient.invalidateQueries(['ai-queue']);
        break;

      default:
        console.log('Unknown WebSocket message type:', type);
    }
  }

  const value = {
    connected
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}
