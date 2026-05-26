// Dropdown and Menu Component System - Navigation and action menus

import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
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

  const handleOpenChange = (newIsOpen) => {
    if (!isControlled) {
      setInternalIsOpen(newIsOpen);
    }
    onOpenChange?.(newIsOpen);
  };

  const open = () => handleOpenChange(true);
  const close = () => handleOpenChange(false);
  const toggle = () => handleOpenChange(!isOpen);

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
  }, [isOpen]);

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
  }, [isOpen]);

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
    <button
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
      const contentWidth = 200; // Approximate width

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
    <button
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
    <button
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
                return <DropdownSeparator key={index} />;
              }
              return (
                <button
                  key={index}
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
            return <DropdownSeparator key={index} />;
          }
          if (item.label) {
            return <DropdownLabel key={index}>{item.label}</DropdownLabel>;
          }
          return (
            <DropdownItem
              key={index}
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

// Usage examples:
/*
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  SimpleDropdown,
  ContextMenu,
} from './components/Dropdown';

// Basic dropdown
<Dropdown>
  <DropdownTrigger>
    <button>Open Menu</button>
  </DropdownTrigger>
  <DropdownContent>
    <DropdownItem onClick={() => console.log('Edit')}>Edit</DropdownItem>
    <DropdownItem onClick={() => console.log('Duplicate')}>Duplicate</DropdownItem>
    <DropdownSeparator />
    <DropdownItem destructive onClick={() => console.log('Delete')}>
      Delete
    </DropdownItem>
  </DropdownContent>
</Dropdown>

// With icons and shortcuts
<Dropdown>
  <DropdownTrigger>
    <button>Actions</button>
  </DropdownTrigger>
  <DropdownContent>
    <DropdownItem icon="✏️" shortcut="⌘E" onClick={handleEdit}>
      Edit
    </DropdownItem>
    <DropdownItem icon="📋" shortcut="⌘D" onClick={handleDuplicate}>
      Duplicate
    </DropdownItem>
    <DropdownSeparator />
    <DropdownItem icon="🗑️" destructive onClick={handleDelete}>
      Delete
    </DropdownItem>
  </DropdownContent>
</Dropdown>

// Simple dropdown (quick implementation)
<SimpleDropdown
  trigger={<button>Menu</button>}
  items={[
    { text: 'Edit', icon: '✏️', onClick: handleEdit },
    { text: 'Duplicate', icon: '📋', onClick: handleDuplicate },
    { separator: true },
    { text: 'Delete', icon: '🗑️', destructive: true, onClick: handleDelete },
  ]}
/>

// User menu dropdown
<Dropdown>
  <DropdownTrigger asChild>
    <button className="flex items-center gap-2">
      <img src={user.avatar} className="w-8 h-8 rounded-full" />
      <span>{user.name}</span>
    </button>
  </DropdownTrigger>
  <DropdownContent align="end">
    <DropdownLabel>My Account</DropdownLabel>
    <DropdownItem icon="👤" onClick={() => navigate('/profile')}>
      Profile
    </DropdownItem>
    <DropdownItem icon="⚙️" onClick={() => navigate('/settings')}>
      Settings
    </DropdownItem>
    <DropdownSeparator />
    <DropdownItem icon="🚪" onClick={handleLogout}>
      Logout
    </DropdownItem>
  </DropdownContent>
</Dropdown>

// Context menu (right-click)
<ContextMenu
  items={[
    { label: 'Edit', icon: '✏️', onClick: handleEdit },
    { label: 'Copy', icon: '📋', onClick: handleCopy },
    { separator: true },
    { label: 'Delete', icon: '🗑️', destructive: true, onClick: handleDelete },
  ]}
>
  <div className="p-4 border rounded">
    Right-click me
  </div>
</ContextMenu>

// Table row actions
<Dropdown>
  <DropdownTrigger>
    <button className="p-2 hover:bg-gray-100 rounded">
      <DotsVerticalIcon />
    </button>
  </DropdownTrigger>
  <DropdownContent align="end">
    <DropdownItem onClick={() => handleView(row)}>View Details</DropdownItem>
    <DropdownItem onClick={() => handleEdit(row)}>Edit</DropdownItem>
    <DropdownItem onClick={() => handleDuplicate(row)}>Duplicate</DropdownItem>
    <DropdownSeparator />
    <DropdownItem destructive onClick={() => handleDelete(row)}>
      Delete
    </DropdownItem>
  </DropdownContent>
</Dropdown>

// Checkbox items
<Dropdown closeOnSelect={false}>
  <DropdownTrigger>
    <button>Filter</button>
  </DropdownTrigger>
  <DropdownContent>
    <DropdownLabel>Status</DropdownLabel>
    <DropdownCheckboxItem
      checked={filters.active}
      onCheckedChange={(checked) => setFilters({ ...filters, active: checked })}
    >
      Active
    </DropdownCheckboxItem>
    <DropdownCheckboxItem
      checked={filters.inactive}
      onCheckedChange={(checked) => setFilters({ ...filters, inactive: checked })}
    >
      Inactive
    </DropdownCheckboxItem>
  </DropdownContent>
</Dropdown>

// Controlled dropdown
function ControlledExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <DropdownTrigger>
        <button>Controlled Menu</button>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem onClick={() => console.log('Item clicked')}>
          Item
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
*/
