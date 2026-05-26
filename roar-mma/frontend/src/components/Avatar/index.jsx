// Avatar Component System - Display user and member profile images

import React from 'react';

// Base Avatar Component
export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  shape = 'circle',
  fallback,
  status,
  className = '',
}) {
  const [imageError, setImageError] = React.useState(false);

  const sizeStyles = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
    '3xl': 'w-24 h-24 text-3xl',
  };

  const shapeStyles = {
    circle: 'rounded-full',
    square: 'rounded-lg',
  };

  const statusSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
    '2xl': 'w-4 h-4',
    '3xl': 'w-5 h-5',
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const showFallback = !src || imageError;

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`
          ${sizeStyles[size]} ${shapeStyles[shape]}
          flex items-center justify-center
          overflow-hidden bg-gray-200 dark:bg-gray-700
          text-gray-600 dark:text-gray-300 font-semibold
        `}
      >
        {showFallback ? (
          <span>{fallback || getInitials(name || alt || '')}</span>
        ) : (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Status indicator */}
      {status && (
        <span
          className={`
            absolute bottom-0 right-0 block ${statusSizes[size]}
            ${statusColors[status]} ${shapeStyles[shape]}
            ring-2 ring-white dark:ring-gray-800
          `}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}

// Avatar Group Component
export function AvatarGroup({
  avatars = [],
  max = 3,
  size = 'md',
  shape = 'circle',
  className = '',
}) {
  const displayAvatars = avatars.slice(0, max);
  const remainingCount = Math.max(0, avatars.length - max);

  const sizeStyles = {
    xs: 'w-6 h-6 text-xs -ml-2',
    sm: 'w-8 h-8 text-sm -ml-2',
    md: 'w-10 h-10 text-base -ml-3',
    lg: 'w-12 h-12 text-lg -ml-3',
    xl: 'w-16 h-16 text-xl -ml-4',
  };

  return (
    <div className={`flex items-center ${className}`}>
      {displayAvatars.map((avatar, index) => (
        <div
          key={avatar.id || index}
          className={`
            ${index > 0 ? sizeStyles[size] : ''}
            ring-2 ring-white dark:ring-gray-800
          `}
          style={{ zIndex: displayAvatars.length - index }}
        >
          <Avatar
            src={avatar.src}
            alt={avatar.alt}
            name={avatar.name}
            size={size}
            shape={shape}
          />
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={`
            ${sizeStyles[size]}
            flex items-center justify-center
            bg-gray-200 dark:bg-gray-700
            text-gray-600 dark:text-gray-300
            font-semibold
            ring-2 ring-white dark:ring-gray-800
            ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'}
          `}
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

// Avatar with Name
export function AvatarWithName({
  src,
  name,
  subtitle,
  size = 'md',
  shape = 'circle',
  status,
  className = '',
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Avatar src={src} name={name} size={size} shape={shape} status={status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {name}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// Avatar Upload Component
export function AvatarUpload({
  src,
  name,
  size = 'xl',
  shape = 'circle',
  onUpload,
  onRemove,
  className = '',
}) {
  const fileInputRef = React.useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload?.(file);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <Avatar src={src} name={name} size={size} shape={shape} />

      {/* Upload button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
        aria-label="Upload photo"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Remove button */}
      {src && onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-0 right-0 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          aria-label="Remove photo"
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

// Avatar Badge (with notification count)
export function AvatarBadge({
  src,
  name,
  size = 'md',
  shape = 'circle',
  badge,
  badgeColor = 'red',
  className = '',
}) {
  const badgeColors = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <Avatar src={src} name={name} size={size} shape={shape} />
      {badge !== undefined && badge !== null && (
        <span
          className={`
            absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold
            text-white ${badgeColors[badgeColor]} rounded-full
            ring-2 ring-white dark:ring-gray-800
          `}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

// Clickable Avatar
export function ClickableAvatar({
  src,
  name,
  size = 'md',
  shape = 'circle',
  onClick,
  className = '',
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative inline-block transition-transform hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        rounded-full
        ${className}
      `}
    >
      <Avatar src={src} name={name} size={size} shape={shape} />
    </button>
  );
}

// Avatar Placeholder (for empty state)
export function AvatarPlaceholder({
  size = 'md',
  shape = 'circle',
  icon,
  className = '',
}) {
  const sizeStyles = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20',
    '3xl': 'w-24 h-24',
  };

  const shapeStyles = {
    circle: 'rounded-full',
    square: 'rounded-lg',
  };

  const defaultIcon = (
    <svg className="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
        clipRule="evenodd"
      />
    </svg>
  );

  return (
    <div
      className={`
        ${sizeStyles[size]} ${shapeStyles[shape]}
        flex items-center justify-center
        bg-gray-200 dark:bg-gray-700
        text-gray-400 dark:text-gray-500
        ${className}
      `}
    >
      {icon || defaultIcon}
    </div>
  );
}

export default {
  Avatar,
  AvatarGroup,
  AvatarWithName,
  AvatarUpload,
  AvatarBadge,
  ClickableAvatar,
  AvatarPlaceholder,
};

// Usage examples:
/*
import {
  Avatar,
  AvatarGroup,
  AvatarWithName,
  AvatarUpload,
  AvatarBadge,
} from './components/Avatar';

// Basic avatar
<Avatar
  src="https://example.com/avatar.jpg"
  alt="John Doe"
  name="John Doe"
  size="md"
/>

// Different sizes
<Avatar src={user.avatar} name={user.name} size="xs" />
<Avatar src={user.avatar} name={user.name} size="sm" />
<Avatar src={user.avatar} name={user.name} size="md" />
<Avatar src={user.avatar} name={user.name} size="lg" />
<Avatar src={user.avatar} name={user.name} size="xl" />
<Avatar src={user.avatar} name={user.name} size="2xl" />
<Avatar src={user.avatar} name={user.name} size="3xl" />

// Different shapes
<Avatar src={user.avatar} name={user.name} shape="circle" />
<Avatar src={user.avatar} name={user.name} shape="square" />

// With status indicator
<Avatar
  src={user.avatar}
  name={user.name}
  status="online"
/>

<Avatar
  src={user.avatar}
  name={user.name}
  status="away"
/>

// Fallback to initials (when no image)
<Avatar name="John Doe" />
<Avatar name="Jane Smith" />

// Custom fallback
<Avatar name="John Doe" fallback="JD" />

// Avatar group
<AvatarGroup
  avatars={[
    { id: 1, src: '/avatar1.jpg', name: 'John Doe' },
    { id: 2, src: '/avatar2.jpg', name: 'Jane Smith' },
    { id: 3, src: '/avatar3.jpg', name: 'Bob Johnson' },
    { id: 4, src: '/avatar4.jpg', name: 'Alice Brown' },
    { id: 5, src: '/avatar5.jpg', name: 'Charlie Wilson' },
  ]}
  max={3}
  size="md"
/>

// Avatar with name
<AvatarWithName
  src={member.photoUrl}
  name={`${member.firstName} ${member.lastName}`}
  subtitle={member.email}
  status="online"
/>

// Avatar upload
<AvatarUpload
  src={member.photoUrl}
  name={member.name}
  size="2xl"
  onUpload={handleUpload}
  onRemove={handleRemove}
/>

// Avatar with badge (notification count)
<AvatarBadge
  src={user.avatar}
  name={user.name}
  badge={5}
  badgeColor="red"
/>

// Clickable avatar
<ClickableAvatar
  src={user.avatar}
  name={user.name}
  onClick={() => navigate(`/profile/${user.id}`)}
/>

// Avatar placeholder
<AvatarPlaceholder size="lg" />

// In a member list
{members.map(member => (
  <div key={member.id} className="flex items-center gap-3 p-3">
    <Avatar
      src={member.photoUrl}
      name={`${member.firstName} ${member.lastName}`}
      size="md"
    />
    <div>
      <p className="font-medium">{member.firstName} {member.lastName}</p>
      <p className="text-sm text-gray-500">{member.email}</p>
    </div>
  </div>
))}

// In a header/navbar
<div className="flex items-center gap-4">
  <span>Welcome, {user.name}</span>
  <ClickableAvatar
    src={user.avatar}
    name={user.name}
    size="sm"
    onClick={() => setShowUserMenu(true)}
  />
</div>

// Class attendees
<div>
  <h3>Attendees ({attendees.length})</h3>
  <AvatarGroup
    avatars={attendees.map(a => ({
      id: a.id,
      src: a.photoUrl,
      name: a.name,
    }))}
    max={5}
  />
</div>

// Member card
<div className="bg-white rounded-lg shadow p-4">
  <AvatarWithName
    src={member.photoUrl}
    name={member.name}
    subtitle={member.membershipType}
    status={member.isActive ? 'online' : 'offline'}
    size="lg"
  />
</div>

// Profile page
<div className="flex flex-col items-center">
  <AvatarUpload
    src={profile.photoUrl}
    name={profile.name}
    size="3xl"
    onUpload={handlePhotoUpload}
    onRemove={handlePhotoRemove}
  />
  <h1 className="mt-4 text-2xl font-bold">{profile.name}</h1>
</div>

// Chat/messaging
<div className="flex items-start gap-3">
  <AvatarBadge
    src={user.avatar}
    name={user.name}
    badge={unreadCount}
    badgeColor="red"
  />
  <div>
    <p className="font-medium">{user.name}</p>
    <p className="text-sm text-gray-500">{lastMessage}</p>
  </div>
</div>
*/
