// Form validation utilities
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone) {
  // Australian phone number validation
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 && cleaned.startsWith('0');
}

export function validateRequired(value) {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
}

export function validateMinLength(value, minLength) {
  return value.length >= minLength;
}

export function validateMaxLength(value, maxLength) {
  return value.length <= maxLength;
}

export function validatePassword(password) {
  // At least 8 characters, one uppercase, one lowercase, one number
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return {
    isValid: minLength && hasUpper && hasLower && hasNumber,
    errors: {
      minLength: !minLength ? 'Password must be at least 8 characters' : null,
      hasUpper: !hasUpper ? 'Password must contain an uppercase letter' : null,
      hasLower: !hasLower ? 'Password must contain a lowercase letter' : null,
      hasNumber: !hasNumber ? 'Password must contain a number' : null,
    }
  };
}

export function validateDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

export function validateDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
}

export function validateNumber(value, min = null, max = null) {
  const num = parseFloat(value);

  if (isNaN(num)) return false;
  if (min !== null && num < min) return false;
  if (max !== null && num > max) return false;

  return true;
}

export function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validatePostcode(postcode) {
  // Australian postcode validation
  const cleaned = postcode.replace(/\D/g, '');
  return cleaned.length === 4;
}

export function validateABN(abn) {
  // Australian Business Number validation
  const cleaned = abn.replace(/\D/g, '');
  return cleaned.length === 11;
}

// Form field validator
export function createValidator(rules) {
  return (values) => {
    const errors = {};

    for (const [field, fieldRules] of Object.entries(rules)) {
      const value = values[field];

      for (const rule of fieldRules) {
        if (rule.type === 'required' && !validateRequired(value)) {
          errors[field] = rule.message || 'This field is required';
          break;
        }

        if (rule.type === 'email' && value && !validateEmail(value)) {
          errors[field] = rule.message || 'Invalid email address';
          break;
        }

        if (rule.type === 'phone' && value && !validatePhone(value)) {
          errors[field] = rule.message || 'Invalid phone number';
          break;
        }

        if (rule.type === 'minLength' && value && !validateMinLength(value, rule.value)) {
          errors[field] = rule.message || `Must be at least ${rule.value} characters`;
          break;
        }

        if (rule.type === 'maxLength' && value && !validateMaxLength(value, rule.value)) {
          errors[field] = rule.message || `Must be at most ${rule.value} characters`;
          break;
        }

        if (rule.type === 'min' && value && !validateNumber(value, rule.value, null)) {
          errors[field] = rule.message || `Must be at least ${rule.value}`;
          break;
        }

        if (rule.type === 'max' && value && !validateNumber(value, null, rule.value)) {
          errors[field] = rule.message || `Must be at most ${rule.value}`;
          break;
        }

        if (rule.type === 'custom' && value && !rule.validator(value, values)) {
          errors[field] = rule.message || 'Invalid value';
          break;
        }
      }
    }

    return errors;
  };
}

// Example usage:
// const validator = createValidator({
//   email: [
//     { type: 'required', message: 'Email is required' },
//     { type: 'email', message: 'Invalid email' }
//   ],
//   password: [
//     { type: 'required', message: 'Password is required' },
//     { type: 'minLength', value: 8, message: 'Password must be at least 8 characters' }
//   ],
//   age: [
//     { type: 'required', message: 'Age is required' },
//     { type: 'min', value: 18, message: 'Must be at least 18 years old' }
//   ]
// });
//
// const errors = validator(formData);
