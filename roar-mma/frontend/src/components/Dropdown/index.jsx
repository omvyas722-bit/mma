// Dropdown and Menu Component System - Navigation and action menus

import React, { useState, useRef, useEffect, createContext, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Dropdown Context
const DropdownContext = createContext(null);

// Main Dropdown Component
export function Dropdown({
  children,
  isOpen: controlledIsOpen,
  onOpenChange,
  defaultOpen = false,
  closeOnSelect = true,
  placement = 'bottom-start',
  offset = 8,
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const triggerRef = useRef(null);
  const contentRef = useRef(null);

  const handleOpenChange = useCallback((newIsOpen) => {
    if (!isControlled) {
      setInternalIsOpen(newIsOpen);
    }
    onOpenChange?.(newIsOpen);
  }, [isControlled, onOpenChange]);

  const open = useCallback(() => handleOpenChange(true), [handleOpenChange]);
  const close = useCallback(() => handleOpenChange(false), [handleOpenChange]);
  const toggle = useCallback(() => handleOpenChange(!isOpen), [handleOpenChange, isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, close]);

  return (
    <DropdownContext.Provider
      value={{
        isOpen,
        open,
        close,
        toggle,
        closeOnSelect,
        triggerRef,
        contentRef,
        placement,
        offset,
      }}
    >
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
}

// Dropdown Trigger Component
export function DropdownTrigger({ children, asChild = false }) {
  const { toggle, triggerRef } = useContext(DropdownContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: triggerRef,
      onClick: (e) => {
        children.props.onClick?.(e);
        toggle();
      },
    });
  }

  return (
    <button type="button"
      ref={triggerRef}
      onClick={toggle}
      className="inline-flex items-center justify-center"
    >
      {children}
    </button>
  );
}

// Dropdown Content Component
export function DropdownContent({
  children,
  className = '',
  align = 'start',
  sideOffset = 8,
}) {
  const { isOpen, contentRef, triggerRef } = useContext(DropdownContext);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const contentWidth = contentRef.current?.offsetWidth || 200;

      let left = triggerRect.left;
      if (align === 'end') {
        left = triggerRect.right - contentWidth;
      } else if (align === 'center') {
        left = triggerRect.left + triggerRect.width / 2 - contentWidth / 2;
      }

      setPosition({
        top: triggerRect.bottom + sideOffset,
        left: Math.max(8, left),
      });
    }
  }, [isOpen, align, sideOffset]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={contentRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 50,
      }}
      className={`
        min-w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-lg
        border border-gray-200 dark:border-gray-700
        py-1 animate-in fade-in-0 zoom-in-95
        ${className}
      `}
    >
      {children}
    </div>,
    document.body
  );
}

// Dropdown Item Component
export function DropdownItem({
  children,
  onClick,
  disabled = false,
  destructive = false,
  icon,
  shortcut,
  className = '',
}) {
  const { close, closeOnSelect } = useContext(DropdownContext);

  const handleClick = (e) => {
    if (disabled) return;
    onClick?.(e);
    if (closeOnSelect) {
      close();
    }
  };

  return (
    <button type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full flex items-center justify-between px-3 py-2 text-sm
        text-left transition-colors
        ${
          destructive
            ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-500 dark:text-gray-400">{icon}</span>}
        <span>{children}</span>
      </div>
      {shortcut && (
        <span className="text-xs text-gray-400 dark:text-gray-500">{shortcut}</span>
      )}
    </button>
  );
}

// Dropdown Separator Component
export function DropdownSeparator({ className = '' }) {
  return (
    <div
      className={`my-1 h-px bg-gray-200 dark:bg-gray-700 ${className}`}
      role="separator"
    />
  );
}

// Dropdown Label Component
export function DropdownLabel({ children, className = '' }) {
  return (
    <div
      className={`px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 ${className}`}
    >
      {children}
    </div>
  );
}

// Dropdown Checkbox Item Component
export function DropdownCheckboxItem({
  children,
  checked,
  onCheckedChange,
  disabled = false,
  className = '',
}) {
  // closeOnSelect not needed for checkbox items
  const handleClick = () => {
    if (disabled) return;
    onCheckedChange?.(!checked);
  };

  return (
    <button type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-2 px-3 py-2 text-sm text-left
        text-gray-700 hover:bg-gray-100
        dark:text-gray-300 dark:hover:bg-gray-700
        transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <div className="w-4 h-4 flex items-center justify-center">
        {checked && (
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <span>{children}</span>
    </button>
  );
}

// Context Menu Component (Right-click menu)
export function ContextMenu({ children, items, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef(null);

  const handleContextMenu = (e) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <>
      <div onContextMenu={handleContextMenu}>{children}</div>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${position.y}px`,
              left: `${position.x}px`,
              zIndex: 50,
            }}
            className={`
              min-w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-lg
              border border-gray-200 dark:border-gray-700 py-1
              ${className}
            `}
          >
            {items.map((item, index) => {
              if (item.separator) {
                return <DropdownSeparator key={`sep-${index}`} />;
              }
              return (
                <button type="button"
                  key={item.label || `item-${index}`}
                  onClick={() => {
                    item.onClick?.();
                    setIsOpen(false);
                  }}
                  disabled={item.disabled}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                    ${
                      item.destructive
                        ? 'text-red-600 hover:bg-red-50 dark:text-red-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }
                    transition-colors
                    ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

// Simple Dropdown Preset
export function SimpleDropdown({
  trigger,
  items,
  align = 'start',
  className = '',
}) {
  return (
    <Dropdown>
      <DropdownTrigger asChild>{trigger}</DropdownTrigger>
      <DropdownContent align={align} className={className}>
        {items.map((item, index) => {
          if (item.separator) {
            return <DropdownSeparator key={`sep-${index}`} />;
          }
          if (item.label) {
            return <DropdownLabel key={item.label || `label-${index}`}>{item.label}</DropdownLabel>;
          }
          return (
            <DropdownItem
              key={item.label || `item-${index}`}
              onClick={item.onClick}
              disabled={item.disabled}
              destructive={item.destructive}
              icon={item.icon}
              shortcut={item.shortcut}
            >
              {item.text}
            </DropdownItem>
          );
        })}
      </DropdownContent>
    </Dropdown>
  );
}

export default {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
  DropdownCheckboxItem,
  ContextMenu,
  SimpleDropdown,
};

