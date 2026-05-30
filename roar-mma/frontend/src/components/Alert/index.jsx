// Alert Component System - Display important messages and notifications

// Base Alert Component

export function Alert({
  children,
  variant = 'info',
  title,
  icon,
  dismissible = false,
  onDismiss,
  className = '',
}) {
  const variantStyles = {
    info: {
      container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-800 dark:text-blue-300',
      text: 'text-blue-700 dark:text-blue-400',
    },
    success: {
      container: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      title: 'text-green-800 dark:text-green-300',
      text: 'text-green-700 dark:text-green-400',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      title: 'text-yellow-800 dark:text-yellow-300',
      text: 'text-yellow-700 dark:text-yellow-400',
    },
    error: {
      container: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      title: 'text-red-800 dark:text-red-300',
      text: 'text-red-700 dark:text-red-400',
    },
  };

  const defaultIcons = {
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  const styles = variantStyles[variant] || variantStyles.info;
  const displayIcon = icon || defaultIcons[variant] || defaultIcons.info;

  return (
    <div
      className={`
        relative flex gap-3 p-4 border rounded-lg
        ${styles.container}
        ${className}
      `}
      role="alert"
    >
      {/* Icon */}
      {displayIcon && (
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {displayIcon}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className={`font-semibold mb-1 ${styles.title}`}>
            {title}
          </h3>
        )}
        <div className={`text-sm ${styles.text}`}>
          {children}
        </div>
      </div>

      {/* Dismiss Button */}
      {dismissible && (
        <button type="button"
          onClick={onDismiss}
          className={`flex-shrink-0 ${styles.icon} hover:opacity-70 transition-opacity`}
          aria-label="Dismiss alert"
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
  );
}

// Alert with Action Button
export function AlertWithAction({
  children,
  variant = 'info',
  title,
  actionLabel,
  onAction,
  dismissible = false,
  onDismiss,
  className = '',
}) {
  return (
    <Alert
      variant={variant}
      title={title}
      dismissible={dismissible}
      onDismiss={onDismiss}
      className={className}
    >
      <div className="space-y-3">
        <div>{children}</div>
        {actionLabel && onAction && (
          <button type="button"
            onClick={onAction}
            className={`
              text-sm font-medium underline hover:no-underline
              ${variant === 'info' && 'text-blue-700 dark:text-blue-400'}
              ${variant === 'success' && 'text-green-700 dark:text-green-400'}
              ${variant === 'warning' && 'text-yellow-700 dark:text-yellow-400'}
              ${variant === 'error' && 'text-red-700 dark:text-red-400'}
            `}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </Alert>
  );
}

// Banner Alert (full-width, typically at top of page)
export function BannerAlert({
  children,
  variant = 'info',
  dismissible = false,
  onDismiss,
  className = '',
}) {
  const variantStyles = {
    info: 'bg-blue-600 text-white',
    success: 'bg-green-600 text-white',
    warning: 'bg-yellow-500 text-gray-900',
    error: 'bg-red-600 text-white',
  };

  return (
    <div
      className={`
        flex items-center justify-between px-4 py-3
        ${variantStyles[variant]}
        ${className}
      `}
      role="alert"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="text-sm font-medium">{children}</div>
      </div>
      {dismissible && (
        <button type="button"
          onClick={onDismiss}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Dismiss banner"
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
  );
}

// Inline Alert (compact, for forms)
export function InlineAlert({
  children,
  variant = 'error',
  className = '',
}) {
  const variantStyles = {
    info: 'text-blue-600 dark:text-blue-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className={`flex items-start gap-2 text-sm ${variantStyles[variant]} ${className}`}>
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <span>{children}</span>
    </div>
  );
}

// Alert List (for multiple alerts)
export function AlertList({ alerts, onDismiss, className = '' }) {
  const handleDismiss = (alertId, alertIndex) => () => onDismiss?.(alertId || alertIndex);

  return (
    <div className={`space-y-3 ${className}`}>
      {alerts.map((alert, index) => (
        <Alert
          key={alert.id || index}
          variant={alert.variant}
          title={alert.title}
          dismissible={alert.dismissible}
          onDismiss={handleDismiss(alert.id, index)}
        >
          {alert.message}
        </Alert>
      ))}
    </div>
  );
}

// Callout (highlighted content block)
export function Callout({
  children,
  variant = 'info',
  title,
  icon,
  className = '',
}) {
  const variantStyles = {
    info: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
    success: 'border-l-green-500 bg-green-50 dark:bg-green-900/20',
    warning: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    error: 'border-l-red-500 bg-red-50 dark:bg-red-900/20',
  };

  return (
    <div
      className={`
        border-l-4 p-4 rounded-r-lg
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-2">
          {icon && <span>{icon}</span>}
          {title && (
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {title}
            </h4>
          )}
        </div>
      )}
      <div className="text-sm text-gray-700 dark:text-gray-300">
        {children}
      </div>
    </div>
  );
}

export default {
  Alert,
  AlertWithAction,
  BannerAlert,
  InlineAlert,
  AlertList,
  Callout,
};

// Usage examples:
/*
import { Alert, AlertWithAction, BannerAlert, InlineAlert, Callout } from './components/Alert';

// Basic alerts
<Alert variant="info">
  This is an informational message.
</Alert>

<Alert variant="success" title="Success!">
  Your changes have been saved successfully.
</Alert>

<Alert variant="warning" title="Warning">
  Please review your input before submitting.
</Alert>

<Alert variant="error" title="Error">
  An error occurred while processing your request.
</Alert>

// Dismissible alert
<Alert
  variant="info"
  title="New Feature"
  dismissible
  onDismiss={() => console.log('Dismissed')}
>
  Check out our new member portal!
</Alert>

// Alert with action
<AlertWithAction
  variant="warning"
  title="Payment Failed"
  actionLabel="Update Payment Method"
  onAction={() => navigate('/settings/billing')}
  dismissible
  onDismiss={handleDismiss}
>
  Your last payment attempt failed. Please update your payment method.
</AlertWithAction>

// Banner alert (full-width)
<BannerAlert
  variant="info"
  dismissible
  onDismiss={handleDismiss}
>
  🎉 New classes added! Check out our updated schedule.
</BannerAlert>

// Inline alert (for forms)
<div>
  <input type="email" />
  <InlineAlert variant="error">
    Please enter a valid email address
  </InlineAlert>
</div>

// Alert list
<AlertList
  alerts={[
    { id: 1, variant: 'error', title: 'Error', message: 'Failed to save' },
    { id: 2, variant: 'warning', title: 'Warning', message: 'Check your input' },
  ]}
  onDismiss={(id) => removeAlert(id)}
/>

// Callout
<Callout variant="info" title="Pro Tip" icon="💡">
  You can use keyboard shortcuts to navigate faster!
</Callout>

// Custom icon
<Alert
  variant="info"
  icon={<CustomIcon />}
  title="Custom Alert"
>
  This alert uses a custom icon.
</Alert>

// In a form
function MyForm() {
  const [error, setError] = useState(null);

  return (
    <form>
      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      <input type="text" />
      <button type="submit">Submit</button>
    </form>
  );
}

// Page-level alerts
function MyPage() {
  const [showBanner, setShowBanner] = useState(true);

  return (
    <div>
      {showBanner && (
        <BannerAlert
          variant="warning"
          dismissible
          onDismiss={() => setShowBanner(false)}
        >
          System maintenance scheduled for tonight at 10 PM
        </BannerAlert>
      )}
      <div className="p-6">
        <Alert variant="success" title="Welcome!">
          Your account has been created successfully.
        </Alert>
      </div>
    </div>
  );
}

// Validation errors
function ValidationErrors({ errors }) {
  if (!errors || errors.length === 0) return null;

  return (
    <Alert variant="error" title="Please fix the following errors:">
      <ul className="list-disc list-inside space-y-1">
        {errors.map((error, index) => (
          <li key={`error-${index}`}>{error}</li>
        ))}
      </ul>
    </Alert>
  );
}
*/
