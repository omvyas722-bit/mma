// Card Components Library - Content containers and layouts

import React from 'react';

// Base Card Component
export function Card({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  clickable = false,
  onClick,
  className = '',
}) {
  const baseStyles = 'bg-white dark:bg-gray-800 rounded-lg shadow transition-shadow';

  const variantStyles = {
    default: 'border border-gray-200 dark:border-gray-700',
    elevated: 'shadow-lg',
    outlined: 'border-2 border-gray-300 dark:border-gray-600 shadow-none',
    flat: 'shadow-none',
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };

  const interactiveStyles = hoverable || clickable
    ? 'hover:shadow-lg cursor-pointer'
    : '';

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      type={Component === 'button' ? 'button' : undefined}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${interactiveStyles}
        ${className}
      `}
    >
      {children}
    </Component>
  );
}

// Card Header Component
export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
}) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div className="flex-1">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
}

// Card Body Component
export function CardBody({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

// Card Footer Component
export function CardFooter({
  children,
  align = 'right',
  className = '',
}) {
  const alignStyles = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={`flex items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 ${alignStyles[align]} ${className}`}>
      {children}
    </div>
  );
}

// Member Card Component
export function MemberCard({
  member,
  onEdit,
  onDelete,
  onClick,
  className = '',
}) {
  return (
    <Card hoverable onClick={onClick} className={className}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {member.photoUrl ? (
            <img
              src={member.photoUrl}
              alt={`${member.firstName} ${member.lastName}`}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-xl font-semibold text-gray-600 dark:text-gray-300">
                {member.firstName[0]}{member.lastName[0]}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {member.firstName} {member.lastName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {member.email}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              member.membershipStatus === 'active'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {member.membershipStatus}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {member.membershipType}
            </span>
          </div>
        </div>

        {/* Actions */}
        {(onEdit || onDelete) && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(member);
                }}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                aria-label="Edit member"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(member);
                }}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                aria-label="Delete member"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// Class Card Component
export function ClassCard({
  classData,
  onEdit,
  onDelete,
  onClick,
  className = '',
}) {
  const typeColors = {
    bjj: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    muay_thai: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    mma: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    boxing: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    wrestling: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    fitness: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    kids: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  };

  return (
    <Card hoverable onClick={onClick} className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${typeColors[classData.type] || typeColors.bjj}`}>
              {classData.type.toUpperCase()}
            </span>
            {classData.capacity && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {classData.attendance || 0}/{classData.capacity}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {classData.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {classData.instructor}
          </p>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
            <span>🕐 {classData.startTime} - {classData.endTime}</span>
            <span>📍 {classData.location}</span>
          </div>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(classData);
                }}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                aria-label="Edit class"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(classData);
                }}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                aria-label="Delete class"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// Payment Card Component
export function PaymentCard({
  payment,
  onClick,
  className = '',
}) {
  const statusColors = {
    succeeded: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <Card hoverable onClick={onClick} className={className}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[payment.status]}`}>
              {payment.status}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {payment.method}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${payment.amount.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {payment.description}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {new Date(payment.date).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Card>
  );
}

// Empty State Card Component
export function EmptyStateCard({
  icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <Card variant="outlined" className={`text-center py-12 ${className}`}>
      {icon && (
        <div className="flex justify-center mb-4">
          {typeof icon === 'string' ? (
            <span className="text-6xl">{icon}</span>
          ) : (
            <div className="text-gray-400 dark:text-gray-600">{icon}</div>
          )}
        </div>
      )}
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </Card>
  );
}

// Feature Card Component
export function FeatureCard({
  icon,
  title,
  description,
  className = '',
}) {
  return (
    <Card hoverable className={`text-center ${className}`}>
      {icon && (
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
            {typeof icon === 'string' ? (
              <span className="text-3xl">{icon}</span>
            ) : (
              <div className="text-blue-600 dark:text-blue-300">{icon}</div>
            )}
          </div>
        </div>
      )}
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </Card>
  );
}

// Pricing Card Component
export function PricingCard({
  name,
  price,
  period = 'month',
  features = [],
  highlighted = false,
  onSelect,
  className = '',
}) {
  return (
    <Card
      variant={highlighted ? 'elevated' : 'default'}
      className={`relative ${highlighted ? 'border-2 border-blue-500' : ''} ${className}`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Popular
          </span>
        </div>
      )}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {name}
        </h3>
        <div className="flex items-baseline justify-center">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            ${price}
          </span>
          <span className="text-gray-500 dark:text-gray-400 ml-2">
            /{period}
          </span>
        </div>
      </div>
      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {feature}
            </span>
          </li>
        ))}
      </ul>
      {onSelect && (
        <button
          onClick={onSelect}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            highlighted
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
          }`}
        >
          Select Plan
        </button>
      )}
    </Card>
  );
}

export default {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  MemberCard,
  ClassCard,
  PaymentCard,
  EmptyStateCard,
  FeatureCard,
  PricingCard,
};

// Usage examples:
/*
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  MemberCard,
  ClassCard,
  EmptyStateCard,
} from './components/Card';

// Basic card
<Card>
  <CardHeader title="Card Title" subtitle="Card subtitle" />
  <CardBody>
    <p>Card content goes here</p>
  </CardBody>
  <CardFooter>
    <button>Cancel</button>
    <button>Save</button>
  </CardFooter>
</Card>

// Stats card
<StatsCard
  title="Total Members"
  value="150"
  change={12}
  icon="👥"
  color="blue"
  trend="up"
/>

// Member card
<MemberCard
  member={member}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onClick={() => navigate(`/members/${member.id}`)}
/>

// Class card
<ClassCard
  classData={classData}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>

// Empty state
<EmptyStateCard
  icon="📭"
  title="No members found"
  description="Get started by adding your first member"
  action={
    <button onClick={handleAddMember}>
      Add Member
    </button>
  }
/>

// Grid of cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {members.map(member => (
    <MemberCard key={member.id} member={member} />
  ))}
</div>
*/
