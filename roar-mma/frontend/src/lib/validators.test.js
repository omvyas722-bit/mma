import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validatePassword,
  validateDate,
  validateDateRange,
  validateNumber,
  validateUrl,
  validatePostcode,
  validateABN,
  createValidator,
} from './validators';

describe('validateEmail', () => {
  it('returns true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('returns true for email with subdomain', () => {
    expect(validateEmail('user@sub.example.co.uk')).toBe(true);
  });

  it('returns false for email without @', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });

  it('returns false for email without domain', () => {
    expect(validateEmail('test@')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('returns false for null', () => {
    expect(validateEmail(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(validateEmail(undefined)).toBe(false);
  });

  it('returns false for string with spaces', () => {
    expect(validateEmail('test @example.com')).toBe(false);
  });
});

describe('validatePhone', () => {
  it('returns true for valid 10-digit Australian mobile', () => {
    expect(validatePhone('0412345678')).toBe(true);
  });

  it('returns true with spaces and dashes', () => {
    expect(validatePhone('0412 345 678')).toBe(true);
  });

  it('returns false for number not starting with 0', () => {
    expect(validatePhone('1412345678')).toBe(false);
  });

  it('returns false for too short', () => {
    expect(validatePhone('041234567')).toBe(false);
  });

  it('returns false for too long', () => {
    expect(validatePhone('04123456789')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validatePhone('')).toBe(false);
  });

  it('throws for null', () => {
    expect(() => validatePhone(null)).toThrow();
  });

  it('throws for undefined', () => {
    expect(() => validatePhone(undefined)).toThrow();
  });
});

describe('validateRequired', () => {
  it('returns true for non-empty string', () => {
    expect(validateRequired('hello')).toBe(true);
  });

  it('returns true for whitespace-trimmed string', () => {
    expect(validateRequired('  a  ')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(validateRequired('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(validateRequired('   ')).toBe(false);
  });

  it('returns true for number 0', () => {
    expect(validateRequired(0)).toBe(true);
  });

  it('returns true for false boolean', () => {
    expect(validateRequired(false)).toBe(true);
  });

  it('returns false for null', () => {
    expect(validateRequired(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(validateRequired(undefined)).toBe(false);
  });

  it('returns true for empty array', () => {
    expect(validateRequired([])).toBe(true);
  });
});

describe('validateMinLength', () => {
  it('returns true when length >= min', () => {
    expect(validateMinLength('hello', 3)).toBe(true);
  });

  it('returns true when length equals min', () => {
    expect(validateMinLength('abc', 3)).toBe(true);
  });

  it('returns false when length < min', () => {
    expect(validateMinLength('ab', 3)).toBe(false);
  });

  it('works with arrays', () => {
    expect(validateMinLength([1, 2, 3], 2)).toBe(true);
  });

  it('returns false for empty string with min 1', () => {
    expect(validateMinLength('', 1)).toBe(false);
  });
});

describe('validateMaxLength', () => {
  it('returns true when length <= max', () => {
    expect(validateMaxLength('hi', 5)).toBe(true);
  });

  it('returns true when length equals max', () => {
    expect(validateMaxLength('abc', 3)).toBe(true);
  });

  it('returns false when length > max', () => {
    expect(validateMaxLength('hello', 3)).toBe(false);
  });

  it('works with arrays', () => {
    expect(validateMaxLength([1, 2], 3)).toBe(true);
  });
});

describe('validatePassword', () => {
  it('returns isValid true for valid password', () => {
    const result = validatePassword('Password1');
    expect(result.isValid).toBe(true);
    expect(result.errors.minLength).toBeNull();
    expect(result.errors.hasUpper).toBeNull();
    expect(result.errors.hasLower).toBeNull();
    expect(result.errors.hasNumber).toBeNull();
  });

  it('rejects password shorter than 8 characters', () => {
    const result = validatePassword('Ab1');
    expect(result.isValid).toBe(false);
    expect(result.errors.minLength).toBe('Password must be at least 8 characters');
  });

  it('rejects password without uppercase', () => {
    const result = validatePassword('password1');
    expect(result.isValid).toBe(false);
    expect(result.errors.hasUpper).toBe('Password must contain an uppercase letter');
  });

  it('rejects password without lowercase', () => {
    const result = validatePassword('PASSWORD1');
    expect(result.isValid).toBe(false);
    expect(result.errors.hasLower).toBe('Password must contain a lowercase letter');
  });

  it('rejects password without number', () => {
    const result = validatePassword('Password');
    expect(result.isValid).toBe(false);
    expect(result.errors.hasNumber).toBe('Password must contain a number');
  });

  it('rejects empty password', () => {
    const result = validatePassword('');
    expect(result.isValid).toBe(false);
  });
});

describe('validateDate', () => {
  it('returns true for valid ISO date string', () => {
    expect(validateDate('2024-01-15')).toBe(true);
  });

  it('returns true for valid date object string', () => {
    expect(validateDate('2024-01-15T10:30:00Z')).toBe(true);
  });

  it('returns false for invalid date string', () => {
    expect(validateDate('not-a-date')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateDate('')).toBe(false);
  });

  it('returns true for null (new Date(null) is epoch)', () => {
    expect(validateDate(null)).toBe(true);
  });

  it('returns false for undefined', () => {
    expect(validateDate(undefined)).toBe(false);
  });
});

describe('validateDateRange', () => {
  it('returns true when start is before end', () => {
    expect(validateDateRange('2024-01-01', '2024-01-15')).toBe(true);
  });

  it('returns true when start equals end', () => {
    expect(validateDateRange('2024-01-01', '2024-01-01')).toBe(true);
  });

  it('returns false when start is after end', () => {
    expect(validateDateRange('2024-01-15', '2024-01-01')).toBe(false);
  });

  it('returns true for same day different time', () => {
    expect(validateDateRange('2024-01-01T08:00:00', '2024-01-01T18:00:00')).toBe(true);
  });
});

describe('validateNumber', () => {
  it('returns true for valid number', () => {
    expect(validateNumber(42)).toBe(true);
  });

  it('returns true for string number', () => {
    expect(validateNumber('42')).toBe(true);
  });

  it('returns true for decimal', () => {
    expect(validateNumber('3.14')).toBe(true);
  });

  it('returns false for NaN', () => {
    expect(validateNumber('abc')).toBe(false);
  });

  it('respects min constraint', () => {
    expect(validateNumber(5, 10)).toBe(false);
    expect(validateNumber(15, 10)).toBe(true);
  });

  it('respects max constraint', () => {
    expect(validateNumber(15, null, 10)).toBe(false);
    expect(validateNumber(5, null, 10)).toBe(true);
  });

  it('respects both min and max', () => {
    expect(validateNumber(10, 5, 15)).toBe(true);
    expect(validateNumber(3, 5, 15)).toBe(false);
    expect(validateNumber(20, 5, 15)).toBe(false);
  });

  it('returns true for 0', () => {
    expect(validateNumber(0)).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(validateNumber('')).toBe(false);
  });

  it('returns false for null', () => {
    expect(validateNumber(null)).toBe(false);
  });
});

describe('validateUrl', () => {
  it('returns true for valid http URL', () => {
    expect(validateUrl('http://example.com')).toBe(true);
  });

  it('returns true for valid https URL', () => {
    expect(validateUrl('https://example.com/path?q=1')).toBe(true);
  });

  it('returns false for random string', () => {
    expect(validateUrl('not-a-url')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateUrl('')).toBe(false);
  });

  it('returns false for missing protocol', () => {
    expect(validateUrl('example.com')).toBe(false);
  });

  it('returns false for null', () => {
    expect(validateUrl(null)).toBe(false);
  });
});

describe('validatePostcode', () => {
  it('returns true for 4-digit postcode', () => {
    expect(validatePostcode('2000')).toBe(true);
  });

  it('returns true with leading zeros', () => {
    expect(validatePostcode('0456')).toBe(true);
  });

  it('returns false for 3 digits', () => {
    expect(validatePostcode('123')).toBe(false);
  });

  it('returns false for 5 digits', () => {
    expect(validatePostcode('12345')).toBe(false);
  });

  it('strips non-digit characters', () => {
    expect(validatePostcode('20 00')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(validatePostcode('')).toBe(false);
  });

  it('throws for null', () => {
    expect(() => validatePostcode(null)).toThrow();
  });

  it('throws for null', () => {
    expect(() => validateABN(null)).toThrow();
  });
});

describe('validateABN', () => {
  it('returns true for 11-digit ABN', () => {
    expect(validateABN('12345678901')).toBe(true);
  });

  it('strips non-digit characters', () => {
    expect(validateABN('12 345 678 901')).toBe(true);
  });

  it('returns false for 10 digits', () => {
    expect(validateABN('1234567890')).toBe(false);
  });

  it('returns false for 12 digits', () => {
    expect(validateABN('123456789012')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateABN('')).toBe(false);
  });

  it('throws for null', () => {
    expect(() => validateABN(null)).toThrow();
  });
});

describe('createValidator', () => {
  const rules = {
    name: [
      { type: 'required', message: 'Name is required' },
      { type: 'minLength', value: 2, message: 'Name too short' },
    ],
    email: [
      { type: 'required' },
      { type: 'email' },
    ],
    age: [
      { type: 'min', value: 18, message: 'Must be 18+' },
    ],
    phone: [
      { type: 'phone', message: 'Bad phone' },
    ],
  };

  it('returns empty errors for valid data', () => {
    const validator = createValidator(rules);
    const errors = validator({ name: 'John', email: 'john@test.com', age: 25, phone: '0412345678' });
    expect(errors).toEqual({});
  });

  it('returns required error for missing name', () => {
    const validator = createValidator(rules);
    const errors = validator({ name: '', email: 'john@test.com', age: 25, phone: '0412345678' });
    expect(errors.name).toBe('Name is required');
  });

  it('returns minLength error for short name', () => {
    const validator = createValidator(rules);
    const errors = validator({ name: 'A', email: 'john@test.com', age: 25, phone: '0412345678' });
    expect(errors.name).toBe('Name too short');
  });

  it('returns email error for invalid email', () => {
    const validator = createValidator(rules);
    const errors = validator({ name: 'John', email: 'bad', age: 25, phone: '0412345678' });
    expect(errors.email).toBe('Invalid email address');
  });

  it('returns min error for underage', () => {
    const validator = createValidator(rules);
    const errors = validator({ name: 'John', email: 'john@test.com', age: 16, phone: '0412345678' });
    expect(errors.age).toBe('Must be 18+');
  });

  it('skips email validation when value is empty', () => {
    const validator = createValidator({ email: [{ type: 'email' }] });
    const errors = validator({ email: '' });
    expect(errors.email).toBeUndefined();
  });

  it('returns phone error for invalid phone', () => {
    const validator = createValidator(rules);
    const errors = validator({ name: 'John', email: 'john@test.com', age: 25, phone: '123' });
    expect(errors.phone).toBe('Bad phone');
  });

  it('stops at first error per field', () => {
    const validator = createValidator({
      field: [
        { type: 'required', message: 'Req' },
        { type: 'minLength', value: 5, message: 'Too short' },
      ],
    });
    const errors = validator({ field: '' });
    expect(errors.field).toBe('Req');
  });

  it('supports maxLength rule', () => {
    const validator = createValidator({
      bio: [{ type: 'maxLength', value: 10, message: 'Too long' }],
    });
    expect(validator({ bio: 'hello world' }).bio).toBe('Too long');
    expect(validator({ bio: 'hi' }).bio).toBeUndefined();
  });

  it('supports max rule', () => {
    const validator = createValidator({
      score: [{ type: 'max', value: 100, message: 'Too high' }],
    });
    expect(validator({ score: 101 }).score).toBe('Too high');
    expect(validator({ score: 99 }).score).toBeUndefined();
  });

  it('supports custom rule', () => {
    const validator = createValidator({
      code: [{ type: 'custom', validator: (v) => v === 'secret', message: 'Wrong code' }],
    });
    expect(validator({ code: 'wrong' }).code).toBe('Wrong code');
    expect(validator({ code: 'secret' }).code).toBeUndefined();
  });

  it('skips custom rule when value is empty', () => {
    const validator = createValidator({
      code: [{ type: 'custom', validator: () => false, message: 'Fail' }],
    });
    expect(validator({ code: '' }).code).toBeUndefined();
  });

  it('returns default messages when no custom message provided', () => {
    const validator = createValidator({
      name: [{ type: 'required' }],
      email: [{ type: 'email' }],
      count: [{ type: 'minLength', value: 3 }],
    });
    const errors = validator({ name: '', email: 'bad', count: 'ab' });
    expect(errors.name).toBe('This field is required');
    expect(errors.email).toBe('Invalid email address');
    expect(errors.count).toBe('Must be at least 3 characters');
  });

  it('returns empty object when no rules match', () => {
    const validator = createValidator({});
    expect(validator({ anything: 'value' })).toEqual({});
  });
});
