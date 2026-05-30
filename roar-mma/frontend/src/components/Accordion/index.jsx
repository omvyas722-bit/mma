// Accordion Component System - Collapsible content sections

import React from 'react';

// Accordion Context
const AccordionContext = React.createContext(null);

// Main Accordion Component
export function Accordion({
  children,
  defaultValue,
  value: controlledValue,
  onChange,
  allowMultiple = false,
  allowToggle = true,
  className = '',
}) {
  const [internalValue, setInternalValue] = React.useState(
    defaultValue || (allowMultiple ? [] : null)
  );
  const isControlled = controlledValue !== undefined;
  const activeItems = isControlled ? controlledValue : internalValue;

  const handleItemToggle = (itemValue) => {
    let newValue;

    if (allowMultiple) {
      const currentArray = Array.isArray(activeItems) ? activeItems : [];
      if (currentArray.includes(itemValue)) {
        newValue = allowToggle ? currentArray.filter((v) => v !== itemValue) : currentArray;
      } else {
        newValue = [...currentArray, itemValue];
      }
    } else {
      if (activeItems === itemValue && allowToggle) {
        newValue = null;
      } else {
        newValue = itemValue;
      }
    }

    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const isItemActive = (itemValue) => {
    if (allowMultiple) {
      return Array.isArray(activeItems) && activeItems.includes(itemValue);
    }
    return activeItems === itemValue;
  };

  return (
    <AccordionContext.Provider
      value={{
        activeItems,
        onItemToggle: handleItemToggle,
        isItemActive,
        allowMultiple,
      }}
    >
      <div className={`space-y-2 ${className}`}>{children}</div>
    </AccordionContext.Provider>
  );
}

// Accordion Item Component
export function AccordionItem({
  value,
  children,
  disabled = false,
  className = '',
}) {
  const accordionContext = React.useContext(AccordionContext);
  const isItemActive = accordionContext?.isItemActive;
  const isActive = isItemActive ? isItemActive(value) : false;

  return (
    <div
      className={`
        border border-gray-200 dark:border-gray-700 rounded-lg
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { value, isActive, disabled });
        }
        return child;
      })}
    </div>
  );
}

// Accordion Trigger Component
export function AccordionTrigger({
  value,
  isActive,
  disabled,
  children,
  icon,
  className = '',
}) {
  const accordionContext = React.useContext(AccordionContext);
  const onItemToggle = accordionContext?.onItemToggle;

  return (
    <button
      onClick={() => !disabled && onItemToggle(value)}
      disabled={disabled}
      className={`
        w-full flex items-center justify-between px-4 py-3
        text-left font-medium text-gray-900 dark:text-white
        hover:bg-gray-50 dark:hover:bg-gray-800
        transition-colors rounded-t-lg
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
        disabled:cursor-not-allowed
        ${isActive ? 'bg-gray-50 dark:bg-gray-800' : ''}
        ${className}
      `}
      aria-expanded={isActive}
      aria-controls={`accordion-content-${value}`}
    >
      <div className="flex items-center gap-2">
        {icon && <span>{icon}</span>}
        <span>{children}</span>
      </div>
      <svg
        className={`w-5 h-5 text-gray-500 transition-transform ${
          isActive ? 'transform rotate-180' : ''
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );
}

// Accordion Content Component
export function AccordionContent({
  value,
  isActive,
  children,
  className = '',
}) {
  if (!isActive) return null;

  return (
    <div
      id={`accordion-content-${value}`}
      className={`px-4 py-3 text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 ${className}`}
    >
      {children}
    </div>
  );
}

// Animated Accordion Content (with slide animation)
export function AnimatedAccordionContent({
  value,
  isActive,
  children,
  className = '',
}) {
  const [height, setHeight] = useState(0);
  const contentRef = React.useRef(null);

  React.useEffect(() => {
    if (isActive && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isActive]);

  return (
    <div
      style={{ height: `${height}px` }}
      className="overflow-hidden transition-all duration-300 ease-in-out"
    >
      <div
        ref={contentRef}
        id={`accordion-content-${value}`}
        className={`px-4 py-3 text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

// Simple Accordion Preset
export function SimpleAccordion({
  items,
  defaultValue,
  allowMultiple = false,
  animated = false,
  className = '',
}) {
  const ContentComponent = animated ? AnimatedAccordionContent : AccordionContent;

  return (
    <Accordion defaultValue={defaultValue} allowMultiple={allowMultiple} className={className}>
      {items.map((item) => (
        <AccordionItem key={item.value} value={item.value} disabled={item.disabled}>
          <AccordionTrigger icon={item.icon}>{item.title}</AccordionTrigger>
          <ContentComponent>{item.content}</ContentComponent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// FAQ Accordion Component
export function FAQAccordion({ faqs, className = '' }) {
  return (
    <Accordion allowToggle className={className}>
      {faqs.map((faq, index) => (
        <AccordionItem key={faq.id || `faq-${faq.question}`} value={`faq-${index}`}>
          <AccordionTrigger>
            <span className="font-semibold">{faq.question}</span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm">{faq.answer}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// Settings Accordion Component
export function SettingsAccordion({ sections, className = '' }) {
  return (
    <Accordion allowMultiple defaultValue={[sections[0]?.value]} className={className}>
      {sections.map((section) => (
        <AccordionItem key={section.value} value={section.value}>
          <AccordionTrigger icon={section.icon}>
            <div>
              <div className="font-semibold">{section.title}</div>
              {section.description && (
                <div className="text-sm text-gray-500 dark:text-gray-400 font-normal mt-1">
                  {section.description}
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AnimatedAccordionContent>
            {section.content}
          </AnimatedAccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  AnimatedAccordionContent,
  SimpleAccordion,
  FAQAccordion,
  SettingsAccordion,
};

// Usage examples:
/*
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  SimpleAccordion,
  FAQAccordion,
} from './components/Accordion';

// Basic usage
function MyComponent() {
  return (
    <Accordion defaultValue="item-1">
      <AccordionItem value="item-1">
        <AccordionTrigger>Section 1</AccordionTrigger>
        <AccordionContent>
          <p>Content for section 1</p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-2">
        <AccordionTrigger>Section 2</AccordionTrigger>
        <AccordionContent>
          <p>Content for section 2</p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-3">
        <AccordionTrigger>Section 3</AccordionTrigger>
        <AccordionContent>
          <p>Content for section 3</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

// Allow multiple items open
<Accordion allowMultiple defaultValue={['item-1', 'item-2']}>
  <AccordionItem value="item-1">
    <AccordionTrigger>Item 1</AccordionTrigger>
    <AccordionContent>Content 1</AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>Item 2</AccordionTrigger>
    <AccordionContent>Content 2</AccordionContent>
  </AccordionItem>
</Accordion>

// With icons
<Accordion defaultValue="general">
  <AccordionItem value="general">
    <AccordionTrigger icon="⚙️">General Settings</AccordionTrigger>
    <AccordionContent>
      <GeneralSettingsForm />
    </AccordionContent>
  </AccordionItem>

  <AccordionItem value="notifications">
    <AccordionTrigger icon="🔔">Notifications</AccordionTrigger>
    <AccordionContent>
      <NotificationSettings />
    </AccordionContent>
  </AccordionItem>
</Accordion>

// Animated accordion
<Accordion defaultValue="item-1">
  <AccordionItem value="item-1">
    <AccordionTrigger>Animated Section</AccordionTrigger>
    <AnimatedAccordionContent>
      <p>This content slides in smoothly</p>
    </AnimatedAccordionContent>
  </AccordionItem>
</Accordion>

// Simple accordion (quick implementation)
<SimpleAccordion
  defaultValue="section-1"
  animated
  items={[
    {
      value: 'section-1',
      title: 'Section 1',
      icon: '📋',
      content: <div>Content for section 1</div>,
    },
    {
      value: 'section-2',
      title: 'Section 2',
      icon: '📊',
      content: <div>Content for section 2</div>,
    },
    {
      value: 'section-3',
      title: 'Section 3',
      icon: '⚙️',
      content: <div>Content for section 3</div>,
      disabled: true,
    },
  ]}
/>

// FAQ accordion
<FAQAccordion
  faqs={[
    {
      question: 'What are your membership options?',
      answer: 'We offer Unlimited, 3x per week, 2x per week, and Casual memberships.',
    },
    {
      question: 'Do you offer trial classes?',
      answer: 'Yes! We offer a 7-day free trial for new members.',
    },
    {
      question: 'What should I bring to my first class?',
      answer: 'Just bring comfortable workout clothes and a water bottle. We provide all equipment.',
    },
  ]}
/>

// Settings accordion
<SettingsAccordion
  sections={[
    {
      value: 'general',
      title: 'General Settings',
      description: 'Basic gym information and preferences',
      icon: '⚙️',
      content: <GeneralSettingsForm />,
    },
    {
      value: 'membership',
      title: 'Membership Settings',
      description: 'Configure membership types and pricing',
      icon: '👥',
      content: <MembershipSettingsForm />,
    },
    {
      value: 'notifications',
      title: 'Notification Settings',
      description: 'Email and SMS notification preferences',
      icon: '🔔',
      content: <NotificationSettingsForm />,
    },
  ]}
/>

// Controlled accordion
function ControlledExample() {
  const [activeItems, setActiveItems] = useState(['item-1']);

  return (
    <Accordion
      value={activeItems}
      onChange={setActiveItems}
      allowMultiple
    >
      <AccordionItem value="item-1">
        <AccordionTrigger>Item 1</AccordionTrigger>
        <AccordionContent>Content 1</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Item 2</AccordionTrigger>
        <AccordionContent>Content 2</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

// Member profile with accordion sections
function MemberProfile({ member }) {
  return (
    <Accordion allowMultiple defaultValue={['personal', 'membership']}>
      <AccordionItem value="personal">
        <AccordionTrigger icon="👤">Personal Information</AccordionTrigger>
        <AnimatedAccordionContent>
          <div className="space-y-2">
            <p><strong>Name:</strong> {member.firstName} {member.lastName}</p>
            <p><strong>Email:</strong> {member.email}</p>
            <p><strong>Phone:</strong> {member.phone}</p>
            <p><strong>Date of Birth:</strong> {member.dateOfBirth}</p>
          </div>
        </AnimatedAccordionContent>
      </AccordionItem>

      <AccordionItem value="membership">
        <AccordionTrigger icon="🎫">Membership Details</AccordionTrigger>
        <AnimatedAccordionContent>
          <div className="space-y-2">
            <p><strong>Type:</strong> {member.membershipType}</p>
            <p><strong>Status:</strong> {member.membershipStatus}</p>
            <p><strong>Join Date:</strong> {member.joinDate}</p>
          </div>
        </AnimatedAccordionContent>
      </AccordionItem>

      <AccordionItem value="emergency">
        <AccordionTrigger icon="🚨">Emergency Contact</AccordionTrigger>
        <AnimatedAccordionContent>
          <div className="space-y-2">
            <p><strong>Name:</strong> {member.emergencyContactName}</p>
            <p><strong>Phone:</strong> {member.emergencyContactPhone}</p>
            <p><strong>Relationship:</strong> {member.emergencyContactRelationship}</p>
          </div>
        </AnimatedAccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
*/
