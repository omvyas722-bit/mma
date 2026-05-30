// Tooltip Component System - Display helpful hints and information

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Main Tooltip Component
export function Tooltip({
  children,
  content,
  placement = 'top',
  delay = 200,
  offset = 8,
  disabled = false,
  className = '',
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - offset;
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + offset;
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'left':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.left - tooltipRect.width - offset;
          break;
        case 'right':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.right + offset;
          break;
        default:
          break;
      }

      // Keep tooltip within viewport
      const padding = 8;
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

      setPosition({ top, left });
    }
  }, [isVisible, placement, offset]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const arrowStyles = {
    top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-700',
    bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-700',
    left: 'right-[-4px] top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-700',
    right: 'left-[-4px] top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-700',
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible &&
        content &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
              zIndex: 9999,
            }}
            className={`
              px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700
              rounded-lg shadow-lg max-w-xs
              animate-in fade-in-0 zoom-in-95 duration-200
              ${className}
            `}
          >
            {content}
            <div
              className={`
                absolute w-0 h-0 border-4 border-transparent
                ${arrowStyles[placement]}
              `}
            />
          </div>,
          document.body
        )}
    </>
  );
}

// Icon with Tooltip
export function TooltipIcon({
  icon = '?',
  content,
  placement = 'top',
  className = '',
}) {
  return (
    <Tooltip content={content} placement={placement}>
      <span
        className={`
          inline-flex items-center justify-center w-4 h-4
          text-xs text-gray-500 dark:text-gray-400
          border border-gray-300 dark:border-gray-600
          rounded-full cursor-help
          hover:bg-gray-100 dark:hover:bg-gray-800
          transition-colors
          ${className}
        `}
      >
        {icon}
      </span>
    </Tooltip>
  );
}

// Help Text with Tooltip
export function HelpText({ children, tooltip, className = '' }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-sm text-gray-600 dark:text-gray-400">{children}</span>
      <TooltipIcon content={tooltip} />
    </div>
  );
}

// Truncated Text with Tooltip
export function TruncatedText({
  children,
  maxLength = 50,
  className = '',
}) {
  const text = String(children);
  const isTruncated = text.length > maxLength;
  const displayText = isTruncated ? `${text.slice(0, maxLength)}...` : text;

  if (!isTruncated) {
    return <span className={className}>{text}</span>;
  }

  return (
    <Tooltip content={text}>
      <span className={`cursor-help ${className}`}>{displayText}</span>
    </Tooltip>
  );
}

// Button with Tooltip
export function TooltipButton({
  children,
  tooltip,
  placement = 'top',
  onClick,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <Tooltip content={tooltip} placement={placement} disabled={disabled}>
      <button type="button"
        onClick={onClick}
        disabled={disabled}
        className={className}
        {...props}
      >
        {children}
      </button>
    </Tooltip>
  );
}

// Icon Button with Tooltip
export function TooltipIconButton({
  icon,
  tooltip,
  placement = 'top',
  onClick,
  disabled = false,
  variant = 'ghost',
  className = '',
  ...props
}) {
  const variantStyles = {
    ghost: 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
    primary: 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20',
    danger: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
  };

  return (
    <Tooltip content={tooltip} placement={placement} disabled={disabled}>
      <button type="button"
        onClick={onClick}
        disabled={disabled}
        className={`
          p-2 rounded-lg transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${className}
        `}
        aria-label={typeof tooltip === 'string' ? tooltip : undefined}
        {...props}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

// Rich Tooltip (with title and description)
export function RichTooltip({
  children,
  title,
  description,
  placement = 'top',
  className = '',
}) {
  const content = (
    <div className="space-y-1">
      {title && <div className="font-semibold">{title}</div>}
      {description && <div className="text-xs opacity-90">{description}</div>}
    </div>
  );

  return (
    <Tooltip content={content} placement={placement} className={className}>
      {children}
    </Tooltip>
  );
}

// Keyboard Shortcut Tooltip
export function KeyboardShortcutTooltip({
  children,
  shortcut,
  description,
  placement = 'bottom',
  className = '',
}) {
  const content = (
    <div className="flex items-center gap-2">
      <span>{description}</span>
      <kbd className="px-2 py-0.5 text-xs bg-gray-800 dark:bg-gray-600 rounded border border-gray-700 dark:border-gray-500">
        {shortcut}
      </kbd>
    </div>
  );

  return (
    <Tooltip content={content} placement={placement} className={className}>
      {children}
    </Tooltip>
  );
}

export default {
  Tooltip,
  TooltipIcon,
  HelpText,
  TruncatedText,
  TooltipButton,
  TooltipIconButton,
  RichTooltip,
  KeyboardShortcutTooltip,
};

// Usage examples:
/*
import {
  Tooltip,
  TooltipIcon,
  HelpText,
  TruncatedText,
  TooltipIconButton,
  RichTooltip,
  KeyboardShortcutTooltip,
} from './components/Tooltip';

// Basic tooltip
<Tooltip content="This is a helpful tooltip">
  <button type="button">Hover me</button>
</Tooltip>

// Different placements
<Tooltip content="Top tooltip" placement="top">
  <button type="button">Top</button>
</Tooltip>

<Tooltip content="Bottom tooltip" placement="bottom">
  <button type="button">Bottom</button>
</Tooltip>

<Tooltip content="Left tooltip" placement="left">
  <button type="button">Left</button>
</Tooltip>

<Tooltip content="Right tooltip" placement="right">
  <button type="button">Right</button>
</Tooltip>

// Custom delay
<Tooltip content="Appears after 500ms" delay={500}>
  <button type="button">Slow tooltip</button>
</Tooltip>

// Tooltip icon (help icon)
<div className="flex items-center gap-2">
  <label>Membership Type</label>
  <TooltipIcon content="Choose the membership plan that best fits your needs" />
</div>

// Help text with tooltip
<HelpText tooltip="This field is required and must be a valid email address">
  Email Address
</HelpText>

// Truncated text with tooltip
<TruncatedText maxLength={30}>
  This is a very long text that will be truncated and show full text on hover
</TruncatedText>

// Icon button with tooltip
<TooltipIconButton
  icon={<EditIcon />}
  tooltip="Edit member"
  onClick={handleEdit}
/>

<TooltipIconButton
  icon={<TrashIcon />}
  tooltip="Delete member"
  variant="danger"
  onClick={handleDelete}
/>

// Rich tooltip (with title and description)
<RichTooltip
  title="Premium Feature"
  description="Upgrade to access advanced analytics and reporting"
  placement="right"
>
  <button type="button" className="opacity-50 cursor-not-allowed">
    Advanced Reports
  </button>
</RichTooltip>

// Keyboard shortcut tooltip
<KeyboardShortcutTooltip
  shortcut="⌘K"
  description="Open command palette"
>
  <button type="button">Search</button>
</KeyboardShortcutTooltip>

// In a table
<table>
  <thead>
    <tr>
      <th>
        <div className="flex items-center gap-1">
          Name
          <TooltipIcon content="Member's full name as registered" />
        </div>
      </th>
    </tr>
  </thead>
</table>

// In a form
<div>
  <label className="flex items-center gap-2">
    Password
    <TooltipIcon content="Must be at least 8 characters with uppercase, lowercase, and numbers" />
  </label>
  <input type="password" />
</div>

// Action buttons with tooltips
<div className="flex gap-2">
  <TooltipIconButton
    icon={<EyeIcon />}
    tooltip="View details"
    onClick={() => handleView(item)}
  />
  <TooltipIconButton
    icon={<EditIcon />}
    tooltip="Edit"
    onClick={() => handleEdit(item)}
  />
  <TooltipIconButton
    icon={<CopyIcon />}
    tooltip="Duplicate"
    onClick={() => handleDuplicate(item)}
  />
  <TooltipIconButton
    icon={<TrashIcon />}
    tooltip="Delete"
    variant="danger"
    onClick={() => handleDelete(item)}
  />
</div>

// Disabled state
<Tooltip content="This feature is coming soon" disabled={false}>
  <button type="button" disabled>Coming Soon</button>
</Tooltip>

// Long content
<Tooltip
  content="This is a longer tooltip with more detailed information that might span multiple lines"
  placement="top"
>
  <button type="button">Detailed Info</button>
</Tooltip>

// With custom styling
<Tooltip
  content="Custom styled tooltip"
  className="bg-blue-600 text-white"
>
  <button type="button">Custom Style</button>
</Tooltip>

// Status indicator with tooltip
<Tooltip content="Active membership - Next billing on Jan 15, 2024">
  <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
</Tooltip>

// Badge with tooltip
<Tooltip content="This member has been with us for over 2 years">
  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
    Veteran
  </span>
</Tooltip>
*/
