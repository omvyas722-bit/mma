// Tabs Component System - Tabbed navigation and content organization

import React, { useState, createContext, useContext } from 'react';

// Tabs Context
const TabsContext = createContext(null);

// Main Tabs Component
export function Tabs({
  children,
  defaultValue,
  value: controlledValue,
  onChange,
  variant = 'default',
  orientation = 'horizontal',
  className = '',
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const activeTab = isControlled ? controlledValue : internalValue;

  const handleTabChange = (value) => {
    if (!isControlled) {
      setInternalValue(value);
    }
    onChange?.(value);
  };

  return (
    <TabsContext.Provider
      value={{
        activeTab,
        onTabChange: handleTabChange,
        variant,
        orientation,
      }}
    >
      <div
        className={`
          ${orientation === 'vertical' ? 'flex gap-6' : ''}
          ${className}
        `}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// Tab List Component
export function TabList({ children, className = '', ...props }) {
  const tabsContext = React.useContext(TabsContext);
  const { variant, orientation } = tabsContext || {};

  const variantStyles = {
    default: 'border-b border-gray-200 dark:border-gray-700',
    pills: '',
    enclosed: 'border-b border-gray-200 dark:border-gray-700',
  };

  const orientationStyles = {
    horizontal: 'flex space-x-1',
    vertical: 'flex flex-col space-y-1 min-w-[200px]',
  };

  return (
    <div
      className={`
        ${variantStyles[variant]}
        ${orientationStyles[orientation]}
        ${className}
      `}
      role="tablist"
      aria-orientation={orientation}
      {...props}
    >
      {children}
    </div>
  );
}

// Tab Component
export function Tab({
  value,
  children,
  disabled = false,
  icon,
  badge,
  className = '',
}) {
  const { activeTab, onTabChange, variant } = useContext(TabsContext);
  const isActive = activeTab === value;

  const baseStyles = 'inline-flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    default: isActive
      ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
      : 'border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200',
    pills: isActive
      ? 'bg-blue-600 text-white rounded-lg'
      : 'text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-800',
    enclosed: isActive
      ? 'border border-gray-200 border-b-white bg-white rounded-t-lg -mb-px dark:border-gray-700 dark:border-b-gray-800 dark:bg-gray-800'
      : 'border border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
  };

  return (
    <button type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      disabled={disabled}
      onClick={() => onTabChange(value)}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {icon && <span>{icon}</span>}
      <span>{children}</span>
      {badge && (
        <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700">
          {badge}
        </span>
      )}
    </button>
  );
}

// Tab Panels Container
export function TabPanels({ children, className = '' }) {
  return <div className={`mt-4 ${className}`}>{children}</div>;
}

// Tab Panel Component
export function TabPanel({ value, children, className = '' }) {
  const { activeTab } = useContext(TabsContext);
  const isActive = activeTab === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={className}
    >
      {children}
    </div>
  );
}

// Lazy Tab Panel (only renders when active)
export function LazyTabPanel({ value, children, className = '' }) {
  const { activeTab } = useContext(TabsContext);
  const [hasBeenActive, setHasBeenActive] = useState(false);
  const isActive = activeTab === value;

  React.useEffect(() => {
    if (isActive && !hasBeenActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  if (!hasBeenActive) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={`${!isActive ? 'hidden' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// Vertical Tabs Preset
export function VerticalTabs({
  tabs,
  defaultValue,
  className = '',
}) {
  return (
    <Tabs defaultValue={defaultValue} orientation="vertical" className={className}>
      <TabList>
        {tabs.map((tab) => (
          <Tab key={tab.value} value={tab.value} icon={tab.icon} badge={tab.badge}>
            {tab.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels className="flex-1">
        {tabs.map((tab) => (
          <TabPanel key={tab.value} value={tab.value}>
            {tab.content}
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
}

// Simple Tabs Preset (for quick implementation)
export function SimpleTabs({
  tabs,
  defaultValue,
  variant = 'default',
  onChange,
  className = '',
}) {
  return (
    <Tabs defaultValue={defaultValue} variant={variant} onChange={onChange} className={className}>
      <TabList>
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            icon={tab.icon}
            badge={tab.badge}
            disabled={tab.disabled}
          >
            {tab.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels>
        {tabs.map((tab) => (
          <TabPanel key={tab.value} value={tab.value}>
            {tab.content}
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
}

// Controlled Tabs Example Component
export function ControlledTabs({
  tabs,
  value,
  onChange,
  variant = 'default',
  className = '',
}) {
  return (
    <Tabs value={value} onChange={onChange} variant={variant} className={className}>
      <TabList>
        {tabs.map((tab) => (
          <Tab key={tab.value} value={tab.value} icon={tab.icon}>
            {tab.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels>
        {tabs.map((tab) => (
          <TabPanel key={tab.value} value={tab.value}>
            {tab.content}
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
}

export default {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  LazyTabPanel,
  VerticalTabs,
  SimpleTabs,
  ControlledTabs,
};

// Usage examples:
/*
import { Tabs, TabList, Tab, TabPanels, TabPanel, SimpleTabs } from './components/Tabs';

// Basic usage
function MyComponent() {
  return (
    <Tabs defaultValue="overview">
      <TabList>
        <Tab value="overview">Overview</Tab>
        <Tab value="details">Details</Tab>
        <Tab value="settings">Settings</Tab>
      </TabList>

      <TabPanels>
        <TabPanel value="overview">
          <h2>Overview Content</h2>
        </TabPanel>
        <TabPanel value="details">
          <h2>Details Content</h2>
        </TabPanel>
        <TabPanel value="settings">
          <h2>Settings Content</h2>
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}

// With icons and badges
<Tabs defaultValue="members">
  <TabList>
    <Tab value="members" icon="👥" badge="150">
      Members
    </Tab>
    <Tab value="classes" icon="📅" badge="25">
      Classes
    </Tab>
    <Tab value="payments" icon="💰">
      Payments
    </Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="members">Members content</TabPanel>
    <TabPanel value="classes">Classes content</TabPanel>
    <TabPanel value="payments">Payments content</TabPanel>
  </TabPanels>
</Tabs>

// Pills variant
<Tabs defaultValue="tab1" variant="pills">
  <TabList>
    <Tab value="tab1">Tab 1</Tab>
    <Tab value="tab2">Tab 2</Tab>
    <Tab value="tab3">Tab 3</Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="tab1">Content 1</TabPanel>
    <TabPanel value="tab2">Content 2</TabPanel>
    <TabPanel value="tab3">Content 3</TabPanel>
  </TabPanels>
</Tabs>

// Vertical tabs
<Tabs defaultValue="general" orientation="vertical">
  <TabList>
    <Tab value="general">General</Tab>
    <Tab value="security">Security</Tab>
    <Tab value="notifications">Notifications</Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="general">General settings</TabPanel>
    <TabPanel value="security">Security settings</TabPanel>
    <TabPanel value="notifications">Notification settings</TabPanel>
  </TabPanels>
</Tabs>

// Controlled tabs
function ControlledExample() {
  const [activeTab, setActiveTab] = useState('tab1');

  return (
    <Tabs value={activeTab} onChange={setActiveTab}>
      <TabList>
        <Tab value="tab1">Tab 1</Tab>
        <Tab value="tab2">Tab 2</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="tab1">Content 1</TabPanel>
        <TabPanel value="tab2">Content 2</TabPanel>
      </TabPanels>
    </Tabs>
  );
}

// Simple tabs (quick implementation)
<SimpleTabs
  defaultValue="overview"
  tabs={[
    { value: 'overview', label: 'Overview', content: <OverviewContent /> },
    { value: 'details', label: 'Details', content: <DetailsContent /> },
    { value: 'settings', label: 'Settings', content: <SettingsContent />, disabled: true },
  ]}
/>

// Lazy loading tabs (only render when active)
<Tabs defaultValue="tab1">
  <TabList>
    <Tab value="tab1">Tab 1</Tab>
    <Tab value="tab2">Tab 2 (Lazy)</Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="tab1">Always rendered</TabPanel>
    <LazyTabPanel value="tab2">
      <ExpensiveComponent />
    </LazyTabPanel>
  </TabPanels>
</Tabs>

// Member profile with tabs
function MemberProfile({ member }) {
  return (
    <Tabs defaultValue="overview">
      <TabList>
        <Tab value="overview" icon="📋">Overview</Tab>
        <Tab value="attendance" icon="📅">Attendance</Tab>
        <Tab value="payments" icon="💰">Payments</Tab>
        <Tab value="notes" icon="📝">Notes</Tab>
      </TabList>

      <TabPanels>
        <TabPanel value="overview">
          <MemberOverview member={member} />
        </TabPanel>
        <TabPanel value="attendance">
          <AttendanceHistory memberId={member.id} />
        </TabPanel>
        <TabPanel value="payments">
          <PaymentHistory memberId={member.id} />
        </TabPanel>
        <TabPanel value="notes">
          <MemberNotes memberId={member.id} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}

// Settings page with vertical tabs
function SettingsPage() {
  return (
    <VerticalTabs
      defaultValue="general"
      tabs={[
        {
          value: 'general',
          label: 'General',
          icon: '⚙️',
          content: <GeneralSettings />,
        },
        {
          value: 'locations',
          label: 'Locations',
          icon: '📍',
          content: <LocationSettings />,
        },
        {
          value: 'membership',
          label: 'Membership',
          icon: '👥',
          content: <MembershipSettings />,
        },
        {
          value: 'notifications',
          label: 'Notifications',
          icon: '🔔',
          badge: '3',
          content: <NotificationSettings />,
        },
      ]}
    />
  );
}
*/
