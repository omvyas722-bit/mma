// Breadcrumb Navigation Component System - Hierarchical page navigation

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// Main Breadcrumb Component
export function Breadcrumb({
  items,
  separator = '/',
  className = '',
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 text-gray-400 dark:text-gray-600">
                  {separator}
                </span>
              )}
              {isLast ? (
                <span className="font-medium text-gray-900 dark:text-white" aria-current="page">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-600 dark:text-gray-400">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Breadcrumb with Icons
export function BreadcrumbWithIcons({
  items,
  separator,
  className = '',
}) {
  const defaultSeparator = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 text-gray-400 dark:text-gray-600">
                  {separator || defaultSeparator}
                </span>
              )}
                <div className="flex items-center gap-1.5">
                {item.icon && (
                  <span className={isLast ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}>
                    {item.icon}
                  </span>
                )}
                {isLast ? (
                  <span className="font-medium text-gray-900 dark:text-white" aria-current="page">
                    {item.label}
                  </span>
                ) : item.href ? (
                  <Link
                    to={item.href}
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-gray-600 dark:text-gray-400">
                    {item.label}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Auto Breadcrumb (generates from route)
export function AutoBreadcrumb({
  homeLabel = 'Home',
  homeHref = '/',
  separator = '/',
  className = '',
}) {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const items = [
    { label: homeLabel, href: homeHref },
    ...pathnames.map((name, index) => {
      const href = `/${pathnames.slice(0, index + 1).join('/')}`;
      const label = name
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return { label, href };
    }),
  ];

  return <Breadcrumb items={items} separator={separator} className={className} />;
}

// Breadcrumb with Dropdown (for collapsed items)
export function CollapsibleBreadcrumb({
  items,
  maxItems = 3,
  separator = '/',
  className = '',
}) {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (items.length <= maxItems) {
    return <Breadcrumb items={items} separator={separator} className={className} />;
  }

  const firstItem = items[0];
  const lastItems = items.slice(-2);
  const collapsedItems = items.slice(1, -2);

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center space-x-2 text-sm">
        {/* First item */}
        <li className="flex items-center">
          <Link
            to={firstItem.href}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            {firstItem.label}
          </Link>
        </li>

        {/* Separator */}
        <span className="text-gray-400 dark:text-gray-600">{separator}</span>

        {/* Dropdown for collapsed items */}
        <li className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            ...
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[200px] z-10">
              {collapsedItems.map((item, index) => (
                <Link
                  key={index}
                  to={item.href}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => setShowDropdown(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </li>

        {/* Last items */}
        {lastItems.map((item, index) => {
          const isLast = index === lastItems.length - 1;

          return (
            <React.Fragment key={index}>
              <span className="text-gray-400 dark:text-gray-600">{separator}</span>
              <li>
                {isLast ? (
                  <span className="font-medium text-gray-900 dark:text-white" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

// Breadcrumb with Back Button
export function BreadcrumbWithBack({
  items,
  onBack,
  separator = '/',
  className = '',
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <button
        onClick={onBack}
        className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        aria-label="Go back"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <Breadcrumb items={items} separator={separator} />
    </div>
  );
}

// Page Header with Breadcrumb
export function PageHeaderWithBreadcrumb({
  title,
  subtitle,
  breadcrumbItems,
  actions,
  className = '',
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      <Breadcrumb items={breadcrumbItems} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export default {
  Breadcrumb,
  BreadcrumbWithIcons,
  AutoBreadcrumb,
  CollapsibleBreadcrumb,
  BreadcrumbWithBack,
  PageHeaderWithBreadcrumb,
};
