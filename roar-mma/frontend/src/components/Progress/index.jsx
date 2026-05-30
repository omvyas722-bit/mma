// Progress and Loading Component System - Loading states and progress indicators

import React from 'react';
import SharedSpinner from '../Shared/Spinner';

// Linear Progress Bar
export function ProgressBar({
  value = 0,
  max = 100,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  label,
  animated = false,
  className = '',
}) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeStyles = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const variantStyles = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600',
    info: 'bg-cyan-600',
  };

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
          {showLabel && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizeStyles[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`
            ${sizeStyles[size]} ${variantStyles[variant]} rounded-full
            transition-all duration-300 ease-out
            ${animated ? 'animate-pulse' : ''}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Circular Progress
export function CircularProgress({
  value = 0,
  max = 100,
  size = 64,
  strokeWidth = 4,
  variant = 'primary',
  showLabel = true,
  className = '',
}) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    primary: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    info: 'text-cyan-600',
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${variantColors[variant]} transition-all duration-300`}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}

// Spinner imported from Shared (canonical source)
const Spinner = SharedSpinner;

// Dots Loader
export function DotsLoader({
  size = 'md',
  variant = 'primary',
  className = '',
}) {
  const sizeStyles = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const variantStyles = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600',
    white: 'bg-white',
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={`dot-${i}`}
          className={`
            ${sizeStyles[size]} ${variantStyles[variant]}
            rounded-full animate-bounce
          `}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.6s',
          }}
        />
      ))}
    </div>
  );
}

// Pulse Loader
export function PulseLoader({
  size = 'md',
  variant = 'primary',
  className = '',
}) {
  const sizeStyles = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const variantStyles = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600',
  };

  return (
    <div className={`relative ${sizeStyles[size]} ${className}`}>
      <div
        className={`
          absolute inset-0 ${variantStyles[variant]}
          rounded-full opacity-75 animate-ping
        `}
      />
      <div
        className={`
          absolute inset-0 ${variantStyles[variant]}
          rounded-full opacity-75
        `}
      />
    </div>
  );
}

// Loading Overlay
export function LoadingOverlay({
  isLoading,
  children,
  message = 'Loading...',
  spinner = <Spinner size="lg" />,
  className = '',
}) {
  if (!isLoading) return children;

  return (
    <div className={`relative ${className}`}>
      {children}
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
        {spinner}
        {message && (
          <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

// Skeleton Loader
export function Skeleton({
  width,
  height,
  circle = false,
  className = '',
}) {
  return (
    <div
      className={`
        bg-gray-200 dark:bg-gray-700 animate-pulse
        ${circle ? 'rounded-full' : 'rounded'}
        ${className}
      `}
      style={{ width, height }}
    />
  );
}

// Text Skeleton
export function TextSkeleton({
  lines = 3,
  className = '',
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={`skeleton-line-${i}`}
          height="1rem"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

// Card Skeleton
export function CardSkeleton({ className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <Skeleton circle width="3rem" height="3rem" />
        <div className="flex-1 space-y-3">
          <Skeleton height="1rem" width="60%" />
          <Skeleton height="0.875rem" width="40%" />
          <Skeleton height="0.75rem" width="80%" />
        </div>
      </div>
    </div>
  );
}

// Table Skeleton
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className = '',
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`skel-col-${i}`} height="1rem" className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`skel-cell-${colIndex}`} height="2rem" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Step Progress
export function StepProgress({
  steps,
  currentStep,
  variant = 'primary',
  className = '',
}) {
  const variantStyles = {
    primary: {
      active: 'bg-blue-600 border-blue-600 text-white',
      completed: 'bg-blue-600 border-blue-600 text-white',
      pending: 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500',
      line: 'bg-blue-600',
    },
    success: {
      active: 'bg-green-600 border-green-600 text-white',
      completed: 'bg-green-600 border-green-600 text-white',
      pending: 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500',
      line: 'bg-green-600',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isPending = index > currentStep;

          return (
            <React.Fragment key={`step-${index}`}>
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full border-2 flex items-center justify-center
                    font-semibold text-sm transition-colors
                    ${isCompleted ? styles.completed : ''}
                    ${isActive ? styles.active : ''}
                    ${isPending ? styles.pending : ''}
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300 text-center max-w-[100px]">
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 bg-gray-300 dark:bg-gray-600 relative top-[-20px]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      index < currentStep ? styles.line : ''
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default {
  ProgressBar,
  CircularProgress,
  Spinner,
  DotsLoader,
  PulseLoader,
  LoadingOverlay,
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  TableSkeleton,
  StepProgress,
};

// Usage examples:
/*
import {
  ProgressBar,
  CircularProgress,
  Spinner,
  LoadingOverlay,
  Skeleton,
  StepProgress,
} from './components/Progress';

// Progress bar
<ProgressBar value={75} max={100} showLabel />

<ProgressBar
  value={uploadProgress}
  label="Uploading..."
  variant="success"
  animated
/>

// Circular progress
<CircularProgress value={60} size={80} variant="primary" />

// Spinner
<Spinner size="md" variant="primary" />

// Different spinner sizes
<Spinner size="xs" />
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />
<Spinner size="xl" />

// Dots loader
<DotsLoader size="md" variant="primary" />

// Pulse loader
<PulseLoader size="md" variant="success" />

// Loading overlay
<LoadingOverlay isLoading={isLoading} message="Saving changes...">
  <form>
    <input type="text" />
    <button type="button">Submit</button>
  </form>
</LoadingOverlay>

// Skeleton loaders
<Skeleton width="100%" height="2rem" />
<Skeleton circle width="3rem" height="3rem" />

// Text skeleton
<TextSkeleton lines={3} />

// Card skeleton
<CardSkeleton />

// Table skeleton
<TableSkeleton rows={5} columns={4} />

// Step progress
<StepProgress
  steps={['Personal Info', 'Membership', 'Payment', 'Confirmation']}
  currentStep={1}
  variant="primary"
/>

// In a button
<button type="button" disabled={isLoading}>
  {isLoading ? (
    <span className="flex items-center gap-2">
      <Spinner size="sm" variant="white" />
      Loading...
    </span>
  ) : (
    'Submit'
  )}
</button>

// Loading state
function DataTable() {
  const { data, isLoading } = useQuery(['data'], fetchData);

  if (isLoading) {
    return <TableSkeleton rows={10} columns={5} />;
  }

  return <table>...</table>;
}

// Upload progress
function FileUpload() {
  const [progress, setProgress] = useState(0);

  return (
    <div>
      <input type="file" onChange={handleUpload} />
      {progress > 0 && (
        <ProgressBar
          value={progress}
          label="Uploading file..."
          variant="success"
          showLabel
          animated
        />
      )}
    </div>
  );
}

// Multi-step form
function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = ['Account', 'Profile', 'Preferences', 'Review'];

  return (
    <div>
      <StepProgress
        steps={steps}
        currentStep={currentStep}
        variant="primary"
      />
      <div className="mt-8">
        {currentStep === 0 && <AccountForm />}
        {currentStep === 1 && <ProfileForm />}
        {currentStep === 2 && <PreferencesForm />}
        {currentStep === 3 && <ReviewForm />}
      </div>
    </div>
  );
}

// Loading page
function LoadingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Spinner size="xl" variant="primary" />
      <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
        Loading your dashboard...
      </p>
    </div>
  );
}

// Skeleton for member card
function MemberCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-start gap-4">
        <Skeleton circle width="4rem" height="4rem" />
        <div className="flex-1 space-y-2">
          <Skeleton height="1.25rem" width="60%" />
          <Skeleton height="1rem" width="40%" />
          <div className="flex gap-2 mt-3">
            <Skeleton height="1.5rem" width="4rem" />
            <Skeleton height="1.5rem" width="5rem" />
          </div>
        </div>
      </div>
    </div>
  );
}
*/
