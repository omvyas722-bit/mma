// Notification Context Provider - Toast notifications and alerts

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { NOTIFICATION_TYPES } from '../lib/constants';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const notificationIdRef = useRef(0);
  const timersRef = useRef({});

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Add notification
  const addNotification = useCallback((notification) => {
    const id = ++notificationIdRef.current;
    const newNotification = {
      id,
      type: notification.type || NOTIFICATION_TYPES.INFO,
      title: notification.title,
      message: notification.message,
      duration: notification.duration ?? 5000,
      action: notification.action,
      onAction: notification.onAction,
      dismissible: notification.dismissible !== false,
      timestamp: Date.now(),
    };

    setNotifications((prev) => [...prev, newNotification]);

    // Auto-dismiss if duration is set
    if (newNotification.duration > 0) {
      timersRef.current[id] = setTimeout(() => {
        delete timersRef.current[id];
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, [removeNotification]);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods for different notification types
  const success = useCallback((message, options = {}) => {
    return addNotification({
      ...options,
      type: NOTIFICATION_TYPES.SUCCESS,
      message,
    });
  }, [addNotification]);

  const error = useCallback((message, options = {}) => {
    return addNotification({
      ...options,
      type: NOTIFICATION_TYPES.ERROR,
      message,
      duration: options.duration ?? 7000,
    });
  }, [addNotification]);

  const warning = useCallback((message, options = {}) => {
    return addNotification({
      ...options,
      type: NOTIFICATION_TYPES.WARNING,
      message,
    });
  }, [addNotification]);

  const info = useCallback((message, options = {}) => {
    return addNotification({
      ...options,
      type: NOTIFICATION_TYPES.INFO,
      message,
    });
  }, [addNotification]);

  // Promise-based notification for async operations
  const promise = useCallback(async (promise, messages) => {
    const loadingId = addNotification({
      type: NOTIFICATION_TYPES.INFO,
      message: messages.loading || 'Loading...',
      duration: 0, // Don't auto-dismiss
      dismissible: false,
    });

    try {
      const result = await promise;
      removeNotification(loadingId);
      success(messages.success || 'Success!');
      return result;
    } catch (err) {
      removeNotification(loadingId);
      error(messages.error || 'An error occurred');
      throw err;
    }
  }, [addNotification, removeNotification, success, error]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info,
    promise,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

// Notification container component
function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

// Individual notification item
function NotificationItem({ notification, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);
  const exitTimerRef = useRef(null);

  const handleDismiss = () => {
    setIsExiting(true);
    exitTimerRef.current = setTimeout(onDismiss, 300);
  };

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const handleAction = () => {
    if (notification.onAction) {
      notification.onAction();
    }
    handleDismiss();
  };

  const typeStyles = {
    [NOTIFICATION_TYPES.SUCCESS]: {
      bg: 'bg-green-50 dark:bg-green-900',
      border: 'border-green-200 dark:border-green-700',
      text: 'text-green-800 dark:text-green-200',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    [NOTIFICATION_TYPES.ERROR]: {
      bg: 'bg-red-50 dark:bg-red-900',
      border: 'border-red-200 dark:border-red-700',
      text: 'text-red-800 dark:text-red-200',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    [NOTIFICATION_TYPES.WARNING]: {
      bg: 'bg-yellow-50 dark:bg-yellow-900',
      border: 'border-yellow-200 dark:border-yellow-700',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    [NOTIFICATION_TYPES.INFO]: {
      bg: 'bg-blue-50 dark:bg-blue-900',
      border: 'border-blue-200 dark:border-blue-700',
      text: 'text-blue-800 dark:text-blue-200',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  };

  const style = typeStyles[notification.type] || typeStyles[NOTIFICATION_TYPES.INFO];

  return (
    <div
      className={`
        ${style.bg} ${style.border} ${style.text}
        border rounded-lg shadow-lg p-4 min-w-[320px] max-w-md
        transform transition-all duration-300 ease-in-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{style.icon}</div>

        <div className="flex-1 min-w-0">
          {notification.title && (
            <h3 className="font-semibold mb-1">{notification.title}</h3>
          )}
          <p className="text-sm">{notification.message}</p>

          {notification.action && (
            <button
              onClick={handleAction}
              className="mt-2 text-sm font-medium underline hover:no-underline"
            >
              {notification.action}
            </button>
          )}
        </div>

        {notification.dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
            aria-label="Dismiss notification"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Custom hook to use notifications
export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }

  return context;
}

export default NotificationContext;

// Usage examples:
/*
// Wrap app with NotificationProvider
import { NotificationProvider } from './contexts/NotificationContext';

function App() {
  return (
    <NotificationProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </NotificationProvider>
  );
}

// Use notifications in components
import { useNotifications } from './contexts/NotificationContext';

function MemberForm() {
  const { success, error } = useNotifications();

  const handleSubmit = async (data) => {
    try {
      await createMember(data);
      success('Member created successfully!');
    } catch (err) {
      error('Failed to create member. Please try again.');
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}

// Different notification types
const { success, error, warning, info } = useNotifications();

success('Operation completed successfully!');
error('Something went wrong!');
warning('Please review your input');
info('New feature available');

// With title and custom duration
success('Member Added', {
  title: 'Success',
  duration: 3000,
});

// With action button
info('New message received', {
  action: 'View',
  onAction: () => navigate('/messages'),
});

// Non-dismissible notification
warning('System maintenance in progress', {
  dismissible: false,
  duration: 0, // Won't auto-dismiss
});

// Promise-based notification for async operations
const { promise } = useNotifications();

const handleSave = async () => {
  await promise(
    saveMember(data),
    {
      loading: 'Saving member...',
      success: 'Member saved successfully!',
      error: 'Failed to save member',
    }
  );
};

// Manual control
const { addNotification, removeNotification } = useNotifications();

const notificationId = addNotification({
  type: 'info',
  message: 'Processing...',
  duration: 0,
});

// Later...
removeNotification(notificationId);

// Clear all notifications
const { clearAll } = useNotifications();
clearAll();
*/
