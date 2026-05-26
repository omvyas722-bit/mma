// Empty State Component for Better UX
export default function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  secondaryAction,
  secondaryActionLabel,
  illustration = 'default',
}) {
  const illustrations = {
    default: (
      <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
    ),
    members: (
      <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    classes: (
      <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    payments: (
      <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
    search: (
      <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
    messages: (
      <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    reports: (
      <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Icon or Illustration */}
      <div className="mb-4">
        {icon || illustrations[illustration] || illustrations.default}
      </div>

      {/* Title */}
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
      )}

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-500 max-w-md mb-6">
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex gap-3">
          {action && (
            <button onClick={action} className="btn btn-primary">
              {actionLabel || 'Get Started'}
            </button>
          )}
          {secondaryAction && (
            <button onClick={secondaryAction} className="btn btn-secondary">
              {secondaryActionLabel || 'Learn More'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Specialized Empty State Components
export function NoMembersState({ onAddMember }) {
  return (
    <EmptyState
      illustration="members"
      title="No members yet"
      description="Get started by adding your first member to the system. You can import members from a CSV file or add them manually."
      action={onAddMember}
      actionLabel="Add Member"
    />
  );
}

export function NoClassesState({ onAddClass }) {
  return (
    <EmptyState
      illustration="classes"
      title="No classes scheduled"
      description="Create your first class to start building your schedule. You can set up recurring classes for different disciplines."
      action={onAddClass}
      actionLabel="Add Class"
    />
  );
}

export function NoPaymentsState({ onProcessPayment }) {
  return (
    <EmptyState
      illustration="payments"
      title="No payments recorded"
      description="Start tracking payments by processing your first transaction. You can record manual payments or set up automatic billing."
      action={onProcessPayment}
      actionLabel="Process Payment"
    />
  );
}

export function NoSearchResultsState({ onClearSearch }) {
  return (
    <EmptyState
      illustration="search"
      title="No results found"
      description="We couldn't find any matches for your search. Try adjusting your filters or search terms."
      action={onClearSearch}
      actionLabel="Clear Search"
    />
  );
}

export function NoMessagesState({ onCompose }) {
  return (
    <EmptyState
      illustration="messages"
      title="No messages sent"
      description="Start communicating with your members by sending your first message. You can send emails, SMS, or both."
      action={onCompose}
      actionLabel="Compose Message"
    />
  );
}

export function NoReportsState() {
  return (
    <EmptyState
      illustration="reports"
      title="No data available"
      description="There isn't enough data yet to generate reports. As you add members, classes, and payments, reports will become available."
    />
  );
}

export function ErrorState({ onRetry, error }) {
  return (
    <EmptyState
      icon={
        <svg className="w-24 h-24 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      }
      title="Something went wrong"
      description={error || "We encountered an error while loading this data. Please try again."}
      action={onRetry}
      actionLabel="Try Again"
    />
  );
}

export function MaintenanceState() {
  return (
    <EmptyState
      icon={
        <svg className="w-24 h-24 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      }
      title="Under Maintenance"
      description="This feature is currently undergoing maintenance. We'll be back shortly. Thank you for your patience."
    />
  );
}

// Usage example:
/*
import EmptyState, { NoMembersState, NoSearchResultsState, ErrorState } from './components/Shared/EmptyState';

// In your component:
{members.length === 0 && !isLoading && (
  <NoMembersState onAddMember={() => setShowAddModal(true)} />
)}

{searchResults.length === 0 && searchQuery && (
  <NoSearchResultsState onClearSearch={() => setSearchQuery('')} />
)}

{error && (
  <ErrorState onRetry={refetch} error={error.message} />
)}

// Custom empty state
<EmptyState
  illustration="custom"
  title="Custom Title"
  description="Custom description"
  action={() => console.log('Action')}
  actionLabel="Custom Action"
/>
*/
