// Form Components Library - Reusable form inputs and controls

import React, { forwardRef, useId } from 'react';

// Text Input Component
export const Input = forwardRef(({
  label,
  error,
  helperText,
  required,
  className = '',
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = props.id || generatedId;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`
          w-full px-3 py-2 border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          dark:bg-gray-700 dark:border-gray-600 dark:text-white
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        {...props}
      />  
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// Textarea Component
export const Textarea = forwardRef(({
  label,
  error,
  helperText,
  required,
  rows = 4,
  className = '',
  ...props
}, ref) => {
  const generatedId = useId();
  const textareaId = props.id || generatedId;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={`
          w-full px-3 py-2 border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          dark:bg-gray-700 dark:border-gray-600 dark:text-white
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
        {...props}
      />
      {error && (
        <p id={`${textareaId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${textareaId}-helper`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

// Select Component
export const Select = forwardRef(({
  label,
  error,
  helperText,
  required,
  options = [],
  placeholder,
  className = '',
  ...props
}, ref) => {
  const generatedId = useId();
  const selectId = props.id || generatedId;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`
          w-full px-3 py-2 border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          dark:bg-gray-700 dark:border-gray-600 dark:text-white
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${selectId}-helper`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

// Checkbox Component
export const Checkbox = forwardRef(({
  label,
  error,
  helperText,
  className = '',
  ...props
}, ref) => {
  const generatedId = useId();
  const checkboxId = props.id || generatedId;

  return (
    <div className={className}>
      <div className="flex items-start">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className={`
            w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded
            focus:ring-2 focus:ring-blue-500
            disabled:cursor-not-allowed
            dark:bg-gray-700 dark:border-gray-600
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${checkboxId}-error` : helperText ? `${checkboxId}-helper` : undefined}
          {...props}
        />
        {label && (
          <label
            htmlFor={checkboxId}
            className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            {label}
          </label>
        )}
      </div>
      {error && (
        <p id={`${checkboxId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${checkboxId}-helper`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

// Radio Group Component
export function RadioGroup({
  label,
  error,
  helperText,
  required,
  options = [],
  value,
  onChange,
  name,
  className = '',
}) {
  const generatedId = useId();
  const groupId = `radio-group-${generatedId}`;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="space-y-2" role="radiogroup" aria-labelledby={groupId}>
        {options.map((option) => {
          const radioId = `${groupId}-${option.value}`;
          return (
            <div key={option.value} className="flex items-start">
              <input
                type="radio"
                id={radioId}
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value)}
                disabled={option.disabled}
                className="w-4 h-4 mt-1 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
              />
              <label
                htmlFor={radioId}
                className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                {option.label}
                {option.description && (
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {option.description}
                  </span>
                )}
              </label>
            </div>
          );
        })}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
}

// Switch/Toggle Component
export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
  className = '',
}) {
  const generatedId = useId();
  const switchId = `switch-${generatedId}`;

  return (
    <div className={`flex items-start justify-between ${className}`}>
      <div className="flex-1">
        {label && (
          <label
            htmlFor={switchId}
            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            {label}
          </label>
        )}
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}

// File Input Component
export function FileInput({
  label,
  error,
  helperText,
  required,
  accept,
  multiple,
  onChange,
  className = '',
}) {
  const generatedId = useId();
  const inputId = `file-${generatedId}`;

  const handleChange = (e) => {
    const files = Array.from(e.target.files || []);
    onChange(files);
  };

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type="file"
        id={inputId}
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className={`
          block w-full text-sm text-gray-500 dark:text-gray-400
          file:mr-4 file:py-2 file:px-4
          file:rounded-lg file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100
          dark:file:bg-blue-900 dark:file:text-blue-300
          ${error ? 'border-red-500' : ''}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
}

// Form Group Component
export function FormGroup({ children, className = '' }) {
  return <div className={`space-y-4 ${className}`}>{children}</div>;
}

// Form Row Component (for horizontal layouts)
export function FormRow({ children, className = '' }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {children}
    </div>
  );
}

// Form Actions Component (for submit/cancel buttons)
export function FormActions({ children, align = 'right', className = '' }) {
  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[align];

  return (
    <div className={`flex gap-3 ${alignClass} ${className}`}>
      {children}
    </div>
  );
}

// Field Error Component
export function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>;
}

// Field Helper Text Component
export function FieldHelper({ text }) {
  if (!text) return null;
  return <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{text}</p>;
}

export default {
  Input,
  Textarea,
  Select,
  Checkbox,
  RadioGroup,
  Switch,
  FileInput,
  FormGroup,
  FormRow,
  FormActions,
  FieldError,
  FieldHelper,
};

// Usage examples:
/*
import { Input, Select, Checkbox, RadioGroup, Switch, FormGroup, FormRow, FormActions } from './components/Forms';

function MyForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    membershipType: '',
    agreeToTerms: false,
    notifications: true,
    gender: '',
  });

  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormGroup>
        <Input
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
          required
        />

        <Input
          type="email"
          label="Email Address"
          name="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
          helperText="We'll never share your email"
          required
        />

        <Select
          label="Membership Type"
          name="membershipType"
          value={formData.membershipType}
          onChange={(e) => setFormData({ ...formData, membershipType: e.target.value })}
          options={[
            { value: 'unlimited', label: 'Unlimited' },
            { value: '2x_week', label: '2x Per Week' },
            { value: '3x_week', label: '3x Per Week' },
          ]}
          placeholder="Select membership type"
          error={errors.membershipType}
          required
        />

        <RadioGroup
          label="Gender"
          name="gender"
          value={formData.gender}
          onChange={(value) => setFormData({ ...formData, gender: value })}
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ]}
        />

        <Checkbox
          label="I agree to the terms and conditions"
          checked={formData.agreeToTerms}
          onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
          error={errors.agreeToTerms}
        />

        <Switch
          label="Email Notifications"
          description="Receive updates about classes and events"
          checked={formData.notifications}
          onChange={(checked) => setFormData({ ...formData, notifications: checked })}
        />
      </FormGroup>

      <FormActions className="mt-6">
        <button type="button" className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Submit
        </button>
      </FormActions>
    </form>
  );
}

// With FormRow for horizontal layout
<FormRow>
  <Input label="First Name" name="firstName" />
  <Input label="Last Name" name="lastName" />
</FormRow>
*/
