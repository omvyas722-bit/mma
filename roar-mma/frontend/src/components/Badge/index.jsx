// Badge and Tag Components Library - Status indicators and labels

// Badge Component
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  rounded = true,
  removable = false,
  onRemove,
  className = '',
}) {
  const baseStyles = 'inline-flex items-center font-medium';

  const variantStyles = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    secondary: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  };

  const sizeStyles = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };

  const roundedStyle = rounded ? 'rounded-full' : 'rounded';

  return (
    <div
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${roundedStyle}
        ${className}
      `}
    >
      {children}
      {removable && (
        <button type="button"
          onClick={onRemove}
          className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
          aria-label="Remove"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
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

// Status Badge Component
export function StatusBadge({ status, size = 'md', className = '' }) {
  const statusConfig = {
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'danger', label: 'Inactive' },
    pending: { variant: 'warning', label: 'Pending' },
    trial: { variant: 'info', label: 'Trial' },
    paused: { variant: 'secondary', label: 'Paused' },
    cancelled: { variant: 'danger', label: 'Cancelled' },
    completed: { variant: 'success', label: 'Completed' },
    failed: { variant: 'danger', label: 'Failed' },
    processing: { variant: 'info', label: 'Processing' },
  };

  const config = statusConfig[status] || { variant: 'default', label: status };

  return (
    <Badge variant={config.variant} size={size} className={className}>
      {config.label}
    </Badge>
  );
}

// Dot Badge Component (with colored dot indicator)
export function DotBadge({
  children,
  color = 'gray',
  size = 'md',
  position = 'left',
  className = '',
}) {
  const colorStyles = {
    gray: 'bg-gray-400',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
  };

  const sizeStyles = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  const dot = (
    <span className={`${colorStyles[color]} ${sizeStyles[size]} rounded-full`} />
  );

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {position === 'left' && dot}
      <span className="text-sm text-gray-700 dark:text-gray-300">{children}</span>
      {position === 'right' && dot}
    </span>
  );
}

// Notification Badge Component (for counts)
export function NotificationBadge({
  count,
  max = 99,
  showZero = false,
  variant = 'danger',
  size = 'md',
  className = '',
}) {
  if (count === 0 && !showZero) return null;

  const displayCount = count > max ? `${max}+` : count;

  const sizeStyles = {
    sm: 'min-w-[16px] h-4 text-[10px] px-1',
    md: 'min-w-[20px] h-5 text-xs px-1.5',
    lg: 'min-w-[24px] h-6 text-sm px-2',
  };

  return (
    <Badge variant={variant} size={size} rounded className={`${sizeStyles[size]} ${className}`}>
      {displayCount}
    </Badge>
  );
}

// Tag Component (for filtering/categorization)
export function Tag({
  children,
  color = 'blue',
  size = 'md',
  removable = false,
  onRemove,
  onClick,
  selected = false,
  className = '',
}) {
  const baseStyles = 'inline-flex items-center font-medium transition-colors';

  const colorStyles = {
    blue: selected
      ? 'bg-blue-600 text-white'
      : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300',
    green: selected
      ? 'bg-green-600 text-white'
      : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300',
    red: selected
      ? 'bg-red-600 text-white'
      : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300',
    yellow: selected
      ? 'bg-yellow-600 text-white'
      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300',
    purple: selected
      ? 'bg-purple-600 text-white'
      : 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300',
    gray: selected
      ? 'bg-gray-600 text-white'
      : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`
        ${baseStyles}
        ${colorStyles[color]}
        ${sizeStyles[size]}
        rounded-full
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
      {removable && (
        <button type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
          aria-label="Remove tag"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </Component>
  );
}

// Tag Group Component
export function TagGroup({ children, className = '' }) {
  return <div className={`flex flex-wrap gap-2 ${className}`}>{children}</div>;
}

// Membership Type Badge
export function MembershipBadge({ type, size = 'md' }) {
  const typeConfig = {
    unlimited: { variant: 'purple', label: 'Unlimited' },
    '3x_week': { variant: 'blue', label: '3x/Week' },
    '2x_week': { variant: 'green', label: '2x/Week' },
    casual: { variant: 'secondary', label: 'Casual' },
  };

  const config = typeConfig[type] || { variant: 'default', label: type };

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}

// Belt Rank Badge
export function BeltBadge({ rank, size = 'md' }) {
  const rankConfig = {
    white: { variant: 'default', label: 'White Belt' },
    blue: { variant: 'primary', label: 'Blue Belt' },
    purple: { variant: 'purple', label: 'Purple Belt' },
    brown: { variant: 'warning', label: 'Brown Belt' },
    black: { variant: 'secondary', label: 'Black Belt' },
  };

  const config = rankConfig[rank] || { variant: 'default', label: rank };

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}

// Class Type Badge
export function ClassTypeBadge({ type, size = 'md' }) {
  const typeConfig = {
    bjj: { variant: 'primary', label: 'BJJ' },
    muay_thai: { variant: 'danger', label: 'Muay Thai' },
    mma: { variant: 'purple', label: 'MMA' },
    boxing: { variant: 'warning', label: 'Boxing' },
    wrestling: { variant: 'success', label: 'Wrestling' },
    fitness: { variant: 'info', label: 'Fitness' },
    kids: { variant: 'pink', label: 'Kids' },
  };

  const config = typeConfig[type] || { variant: 'default', label: type };

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}

// Payment Status Badge
export function PaymentStatusBadge({ status, size = 'md' }) {
  const statusConfig = {
    succeeded: { variant: 'success', label: 'Succeeded' },
    pending: { variant: 'warning', label: 'Pending' },
    failed: { variant: 'danger', label: 'Failed' },
    refunded: { variant: 'secondary', label: 'Refunded' },
  };

  const config = statusConfig[status] || { variant: 'default', label: status };

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}

// Lead Status Badge
export function LeadStatusBadge({ status, size = 'md' }) {
  const statusConfig = {
    new: { variant: 'info', label: 'New' },
    contacted: { variant: 'primary', label: 'Contacted' },
    qualified: { variant: 'success', label: 'Qualified' },
    trial_booked: { variant: 'purple', label: 'Trial Booked' },
    trial_completed: { variant: 'success', label: 'Trial Completed' },
    converted: { variant: 'success', label: 'Converted' },
    lost: { variant: 'danger', label: 'Lost' },
  };

  const config = statusConfig[status] || { variant: 'default', label: status };

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}

export default {
  Badge,
  StatusBadge,
  DotBadge,
  NotificationBadge,
  Tag,
  TagGroup,
  MembershipBadge,
  BeltBadge,
  ClassTypeBadge,
  PaymentStatusBadge,
  LeadStatusBadge,
};

// Usage examples:
/*
import {
  Badge,
  StatusBadge,
  DotBadge,
  NotificationBadge,
  Tag,
  TagGroup,
  MembershipBadge,
  BeltBadge,
  ClassTypeBadge,
} from './components/Badge';

// Basic badges
<Badge>Default</Badge>
<Badge variant="primary">Primary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="danger">Danger</Badge>
<Badge variant="warning">Warning</Badge>

// Sizes
<Badge size="xs">Extra Small</Badge>
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>

// Removable badge
<Badge removable onRemove={() => console.log('Removed')}>
  Removable
</Badge>

// Status badges
<StatusBadge status="active" />
<StatusBadge status="pending" />
<StatusBadge status="cancelled" />

// Dot badges
<DotBadge color="green">Online</DotBadge>
<DotBadge color="red">Offline</DotBadge>
<DotBadge color="yellow" position="right">Away</DotBadge>

// Notification badge
<div className="relative">
  <BellIcon />
  <NotificationBadge count={5} className="absolute -top-1 -right-1" />
</div>

// Tags
<Tag color="blue">React</Tag>
<Tag color="green">Node.js</Tag>
<Tag color="purple" removable onRemove={() => handleRemove()}>
  TypeScript
</Tag>

// Selectable tags
<Tag
  color="blue"
  selected={selectedTags.includes('react')}
  onClick={() => toggleTag('react')}
>
  React
</Tag>

// Tag group
<TagGroup>
  <Tag color="blue">JavaScript</Tag>
  <Tag color="green">Python</Tag>
  <Tag color="red">Ruby</Tag>
  <Tag color="purple">Go</Tag>
</TagGroup>

// Domain-specific badges
<MembershipBadge type="unlimited" />
<BeltBadge rank="blue" />
<ClassTypeBadge type="bjj" />
<PaymentStatusBadge status="succeeded" />
<LeadStatusBadge status="qualified" />

// In a member card
<div className="flex items-center gap-2">
  <span>{member.name}</span>
  <StatusBadge status={member.status} />
  <MembershipBadge type={member.membershipType} />
  <BeltBadge rank={member.beltRank} />
</div>

// In a table
<td>
  <StatusBadge status={payment.status} />
</td>

// Filter tags
<TagGroup>
  {filters.map(filter => (
    <Tag
      key={filter.id}
      color="blue"
      removable
      onRemove={() => removeFilter(filter.id)}
    >
      {filter.label}
    </Tag>
  ))}
</TagGroup>
*/
