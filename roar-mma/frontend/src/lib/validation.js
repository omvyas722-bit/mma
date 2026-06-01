// Validation Utilities - Form validation and data integrity

import { VALIDATION } from './constants';

// Base validator class
class Validator {
  constructor(value) {
    this.value = value;
    this.errors = [];
  }

  // Check if value is required
  required(message = 'This field is required') {
    if (this.value === null || this.value === undefined || this.value === '') {
      this.errors.push(message);
    }
    return this;
  }

  // Check minimum length
  minLength(min, message) {
    if (this.value && this.value.length < min) {
      this.errors.push(message || `Must be at least ${min} characters`);
    }
    return this;
  }

  // Check maximum length
  maxLength(max, message) {
    if (this.value && this.value.length > max) {
      this.errors.push(message || `Must be no more than ${max} characters`);
    }
    return this;
  }

  // Check exact length
  exactLength(length, message) {
    if (this.value && this.value.length !== length) {
      this.errors.push(message || `Must be exactly ${length} characters`);
    }
    return this;
  }

  // Check minimum value
  min(min, message) {
    if (this.value !== null && this.value !== undefined && Number(this.value) < min) {
      this.errors.push(message || `Must be at least ${min}`);
    }
    return this;
  }

  // Check maximum value
  max(max, message) {
    if (this.value !== null && this.value !== undefined && Number(this.value) > max) {
      this.errors.push(message || `Must be no more than ${max}`);
    }
    return this;
  }

  // Check if value matches pattern
  pattern(regex, message = 'Invalid format') {
    if (this.value && !regex.test(this.value)) {
      this.errors.push(message);
    }
    return this;
  }

  // Check if value is in list
  oneOf(list, message) {
    if (this.value && !list.includes(this.value)) {
      this.errors.push(message || `Must be one of: ${list.join(', ')}`);
    }
    return this;
  }

  // Custom validation function
  custom(fn, message) {
    if (this.value && !fn(this.value)) {
      this.errors.push(message || 'Invalid value');
    }
    return this;
  }

  // Get validation result
  validate() {
    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      error: this.errors[0] || null,
    };
  }
}

// Create validator instance
export function validate(value) {
  return new Validator(value);
}

// Email validation
export function isValidEmail(email) {
  return VALIDATION.EMAIL_REGEX.test(email);
}

export function validateEmail(email, required = true) {
  const validator = validate(email);

  if (required) {
    validator.required('Email is required');
  }

  if (email) {
    validator.pattern(VALIDATION.EMAIL_REGEX, 'Invalid email address');
  }

  return validator.validate();
}

// Phone validation (Australian format)
export function isValidPhone(phone) {
  return VALIDATION.PHONE_REGEX.test(phone);
}

export function validatePhone(phone, required = true) {
  const validator = validate(phone);

  if (required) {
    validator.required('Phone number is required');
  }

  if (phone) {
    validator.pattern(VALIDATION.PHONE_REGEX, 'Invalid phone number (must be 10 digits starting with 0)');
  }

  return validator.validate();
}

// Postcode validation (Australian format)
export function isValidPostcode(postcode) {
  return VALIDATION.POSTCODE_REGEX.test(postcode);
}

export function validatePostcode(postcode, required = true) {
  const validator = validate(postcode);

  if (required) {
    validator.required('Postcode is required');
  }

  if (postcode) {
    validator.pattern(VALIDATION.POSTCODE_REGEX, 'Invalid postcode (must be 4 digits)');
  }

  return validator.validate();
}

// Password validation
export function validatePassword(password, required = true) {
  const validator = validate(password);

  if (required) {
    validator.required('Password is required');
  }

  if (password) {
    validator
      .minLength(VALIDATION.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`)
      .custom(
        (val) => /[A-Z]/.test(val),
        'Password must contain at least one uppercase letter'
      )
      .custom(
        (val) => /[a-z]/.test(val),
        'Password must contain at least one lowercase letter'
      )
      .custom(
        (val) => /[0-9]/.test(val),
        'Password must contain at least one number'
      );
  }

  return validator.validate();
}

// Password confirmation validation
export function validatePasswordConfirmation(password, confirmation) {
  const validator = validate(confirmation);

  validator
    .required('Please confirm your password')
    .custom(
      (val) => val === password,
      'Passwords do not match'
    );

  return validator.validate();
}

// Name validation
export function validateName(name, fieldName = 'Name', required = true) {
  const validator = validate(name);

  if (required) {
    validator.required(`${fieldName} is required`);
  }

  if (name) {
    validator
      .minLength(VALIDATION.NAME_MIN_LENGTH, `${fieldName} must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`)
      .maxLength(VALIDATION.NAME_MAX_LENGTH, `${fieldName} must be no more than ${VALIDATION.NAME_MAX_LENGTH} characters`)
      .pattern(/^[a-zA-Z\s'-]+$/, `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`);
  }

  return validator.validate();
}

// Date validation
export function validateDate(date, required = true) {
  const validator = validate(date);

  if (required) {
    validator.required('Date is required');
  }

  if (date) {
    validator.custom(
      (val) => !isNaN(Date.parse(val)),
      'Invalid date format'
    );
  }

  return validator.validate();
}

// Date of birth validation
export function validateDateOfBirth(dob, minAge = 0, maxAge = 120) {
  const result = validateDate(dob);

  if (!result.isValid) {
    return result;
  }

  const birthDate = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < minAge) {
    return {
      isValid: false,
      errors: [`Must be at least ${minAge} years old`],
      error: `Must be at least ${minAge} years old`,
    };
  }

  if (age > maxAge) {
    return {
      isValid: false,
      errors: [`Age cannot exceed ${maxAge} years`],
      error: `Age cannot exceed ${maxAge} years`,
    };
  }

  return { isValid: true, errors: [], error: null };
}

// URL validation
export function validateURL(url, required = true) {
  const validator = validate(url);

  if (required) {
    validator.required('URL is required');
  }

  if (url) {
    validator.custom(
      (val) => {
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      'Invalid URL format'
    );
  }

  return validator.validate();
}

// Number validation
export function validateNumber(value, options = {}) {
  const { required = true, min, max, integer = false } = options;
  const validator = validate(value);

  if (required) {
    validator.required('This field is required');
  }

  if (value !== null && value !== undefined && value !== '') {
    validator.custom(
      (val) => !isNaN(Number(val)),
      'Must be a valid number'
    );

    if (integer) {
      validator.custom(
        (val) => Number.isInteger(Number(val)),
        'Must be a whole number'
      );
    }

    if (min !== undefined) {
      validator.min(min);
    }

    if (max !== undefined) {
      validator.max(max);
    }
  }

  return validator.validate();
}

// Currency validation
export function validateCurrency(amount, required = true) {
  const validator = validate(amount);

  if (required) {
    validator.required('Amount is required');
  }

  if (amount !== null && amount !== undefined && amount !== '') {
    validator
      .custom(
        (val) => !isNaN(Number(val)),
        'Must be a valid amount'
      )
      .custom(
        (val) => Number(val) >= 0,
        'Amount cannot be negative'
      )
      .custom(
        (val) => /^\d+(\.\d{1,2})?$/.test(val.toString()),
        'Amount can have at most 2 decimal places'
      );
  }

  return validator.validate();
}

// File validation
export function validateFile(file, options = {}) {
  const {
    required = true,
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = [],
  } = options;

  if (required && !file) {
    return {
      isValid: false,
      errors: ['File is required'],
      error: 'File is required',
    };
  }

  if (!file) {
    return { isValid: true, errors: [], error: null };
  }

  const errors = [];

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    error: errors[0] || null,
  };
}

// Image file validation
export function validateImage(file, options = {}) {
  const {
    required = true,
    maxSize = 5 * 1024 * 1024,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  } = options;

  return validateFile(file, { required, maxSize, allowedTypes });
}

// Form validation - validate multiple fields
export function validateForm(fields) {
  const results = {};
  let isValid = true;

  Object.entries(fields).forEach(([fieldName, validation]) => {
    results[fieldName] = validation;
    if (!validation.isValid) {
      isValid = false;
    }
  });

  return {
    isValid,
    fields: results,
    errors: Object.entries(results)
      .filter(([_, result]) => !result.isValid)
      .reduce((acc, [field, result]) => {
        acc[field] = result.error;
        return acc;
      }, {}),
  };
}

// Member form validation
export function validateMemberForm(data) {
  return validateForm({
    firstName: validateName(data.firstName, 'First name'),
    lastName: validateName(data.lastName, 'Last name'),
    email: validateEmail(data.email),
    phone: validatePhone(data.phone),
    dateOfBirth: validateDateOfBirth(data.dateOfBirth, 4, 100),
    address: validate(data.address).required('Address is required').validate(),
    suburb: validate(data.suburb).required('Suburb is required').validate(),
    postcode: validatePostcode(data.postcode),
    membershipType: validate(data.membershipType).required('Membership type is required').validate(),
    emergencyContactName: validateName(data.emergencyContactName, 'Emergency contact name'),
    emergencyContactPhone: validatePhone(data.emergencyContactPhone),
  });
}

// Lead form validation
export function validateLeadForm(data) {
  return validateForm({
    firstName: validateName(data.firstName, 'First name'),
    lastName: validateName(data.lastName, 'Last name'),
    email: validateEmail(data.email),
    phone: validatePhone(data.phone),
    source: validate(data.source).required('Lead source is required').validate(),
    interestedIn: validate(data.interestedIn).required('Interest is required').validate(),
  });
}

// Class form validation
export function validateClassForm(data) {
  return validateForm({
    name: validate(data.name).required('Class name is required').validate(),
    type: validate(data.type).required('Class type is required').validate(),
    instructor: validate(data.instructor).required('Instructor is required').validate(),
    location: validate(data.location).required('Location is required').validate(),
    dayOfWeek: validateNumber(data.dayOfWeek, { min: 0, max: 6, integer: true }),
    startTime: validate(data.startTime).required('Start time is required').validate(),
    endTime: validate(data.endTime)
      .required('End time is required')
      .custom(
        (val) => {
          if (!data.startTime || !val) return true;
          return val > data.startTime;
        },
        'End time must be after start time'
      )
      .validate(),
    capacity: validateNumber(data.capacity, { min: 1, max: 100, integer: true }),
  });
}

// Payment form validation
export function validatePaymentForm(data) {
  return validateForm({
    memberId: validate(data.memberId).required('Member is required').validate(),
    amount: validateCurrency(data.amount),
    method: validate(data.method).required('Payment method is required').validate(),
    description: validate(data.description).maxLength(500, 'Description must be no more than 500 characters').validate(),
  });
}

// Communication form validation
export function validateCommunicationForm(data) {
  return validateForm({
    recipients: validate(data.recipients)
      .required('Recipients are required')
      .custom(
        (val) => Array.isArray(val) && val.length > 0,
        'At least one recipient is required'
      )
      .validate(),
    subject: validate(data.subject).required('Subject is required').maxLength(200).validate(),
    message: validate(data.message)
      .required('Message is required')
      .maxLength(VALIDATION.MESSAGE_MAX_LENGTH, `Message must be no more than ${VALIDATION.MESSAGE_MAX_LENGTH} characters`)
      .validate(),
    type: validate(data.type).required('Message type is required').validate(),
  });
}

// Sanitization helpers
export function sanitizeString(str) {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
}

export function sanitizeEmail(email) {
  if (!email) return '';
  return email.trim().toLowerCase();
}

export function sanitizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\s+/g, '').replace(/[^\d]/g, '');
}

export function sanitizeHTML(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

// Export all validators
export default {
  validate,
  isValidEmail,
  validateEmail,
  isValidPhone,
  validatePhone,
  isValidPostcode,
  validatePostcode,
  validatePassword,
  validatePasswordConfirmation,
  validateName,
  validateDate,
  validateDateOfBirth,
  validateURL,
  validateNumber,
  validateCurrency,
  validateFile,
  validateImage,
  validateForm,
  validateMemberForm,
  validateLeadForm,
  validateClassForm,
  validatePaymentForm,
  validateCommunicationForm,
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeHTML,
};

// Usage examples:
/*
// Single field validation
import { validateEmail, validatePhone, validateName } from './lib/validation';

const emailResult = validateEmail('test@example.com');
if (!emailResult.isValid) {
  console.error(emailResult.error);
}

// Custom validation chain
import { validate } from './lib/validation';

const result = validate(username)
  .required('Username is required')
  .minLength(3, 'Username must be at least 3 characters')
  .maxLength(20, 'Username must be no more than 20 characters')
  .pattern(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .validate();

// Form validation
import { validateMemberForm } from './lib/validation';

const formData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '0412345678',
  // ... other fields
};

const validation = validateMemberForm(formData);

if (!validation.isValid) {
  console.log('Validation errors:', validation.errors);
  // { firstName: null, email: 'Invalid email', ... }
}

// React hook integration
import { useState } from 'react';
import { validateEmail } from './lib/validation';

function EmailInput() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleBlur = () => {
    const result = validateEmail(email);
    setError(result.error || '');
  };

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={handleBlur}
      />
      {error && <span className="error">{error}</span>}
    </div>
  );
}

// File validation
import { validateImage } from './lib/validation';

function handleFileChange(e) {
  const file = e.target.files[0];
  const result = validateImage(file, {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png'],
  });

  if (!result.isValid) {
    alert(result.error);
    return;
  }

  // Upload file
}

// Sanitization
import { sanitizeEmail, sanitizePhone } from './lib/validation';

const cleanEmail = sanitizeEmail('  TEST@EXAMPLE.COM  '); // 'test@example.com'
const cleanPhone = sanitizePhone('04 1234 5678'); // '0412345678'
*/
