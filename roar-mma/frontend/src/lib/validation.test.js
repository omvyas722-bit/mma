import { describe, it, expect } from 'vitest';
import {
  isValidEmail, validateEmail,
  isValidPhone, validatePhone,
  isValidPostcode, validatePostcode,
  validatePassword, validatePasswordConfirmation,
  validateName,
  validateDate, validateDateOfBirth,
  validateURL, validateNumber, validateCurrency,
  validateFile, validateImage,
  validateForm,
  validateMemberForm, validateLeadForm, validateClassForm,
  validatePaymentForm, validateCommunicationForm,
  sanitizeString, sanitizeEmail, sanitizePhone, sanitizeHTML,
  validate,
} from './validation';

describe('validate()', () => {
  it('creates a validator with chaining', () => {
    const result = validate('test').required().minLength(3).validate();
    expect(result.isValid).toBe(true);
  });

  it('collects multiple errors', () => {
    const result = validate('').required('Req').minLength(3, 'Min').validate();
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(['Req']);
  });
});

describe('isValidEmail', () => {
  it('returns true for valid email', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });
  it('returns false for invalid email', () => {
    expect(isValidEmail('not-email')).toBe(false);
  });
  it('returns false for empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

describe('validateEmail', () => {
  it('validates correct email', () => {
    const r = validateEmail('test@example.com');
    expect(r.isValid).toBe(true);
    expect(r.error).toBeNull();
  });
  it('rejects invalid email', () => {
    expect(validateEmail('invalid-email').isValid).toBe(false);
  });
  it('rejects empty when required', () => {
    expect(validateEmail('').isValid).toBe(false);
  });
  it('passes empty when not required', () => {
    const r = validateEmail('', false);
    expect(r.isValid).toBe(true);
  });
  it('rejects email without domain', () => {
    expect(validateEmail('test@').isValid).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('returns true for Australian mobile', () => {
    expect(isValidPhone('0412345678')).toBe(true);
  });
  it('returns true with spaces', () => {
    expect(isValidPhone('0412 345 678')).toBe(true);
  });
  it('returns false for short number', () => {
    expect(isValidPhone('123')).toBe(false);
  });
  it('returns false for empty', () => {
    expect(isValidPhone('')).toBe(false);
  });
});

describe('validatePhone', () => {
  it('validates Australian mobile', () => {
    expect(validatePhone('0412345678').isValid).toBe(true);
  });
  it('validates phone with spaces', () => {
    expect(validatePhone('0412 345 678').isValid).toBe(true);
  });
  it('rejects invalid phone', () => {
    expect(validatePhone('123').isValid).toBe(false);
  });
  it('rejects empty when required', () => {
    expect(validatePhone('').isValid).toBe(false);
  });
  it('passes empty when not required', () => {
    expect(validatePhone('', false).isValid).toBe(true);
  });
  it('rejects null when required', () => {
    expect(validatePhone(null).isValid).toBe(false);
  });
});

describe('isValidPostcode', () => {
  it('returns true for 4-digit postcode', () => {
    expect(isValidPostcode('2000')).toBe(true);
  });
  it('returns false for 3-digit', () => {
    expect(isValidPostcode('200')).toBe(false);
  });
  it('returns false for letters', () => {
    expect(isValidPostcode('AB12')).toBe(false);
  });
});

describe('validatePostcode', () => {
  it('validates 4-digit postcode', () => {
    expect(validatePostcode('2000').isValid).toBe(true);
  });
  it('rejects short postcode', () => {
    expect(validatePostcode('200').isValid).toBe(false);
  });
  it('rejects empty when required', () => {
    expect(validatePostcode('').isValid).toBe(false);
  });
  it('passes empty when not required', () => {
    expect(validatePostcode('', false).isValid).toBe(true);
  });
});

describe('validatePassword', () => {
  it('validates strong password', () => {
    expect(validatePassword('StrongPass1').isValid).toBe(true);
  });
  it('rejects short password', () => {
    const r = validatePassword('Ab1');
    expect(r.isValid).toBe(false);
    expect(r.error).toContain('at least 8');
  });
  it('rejects password without uppercase', () => {
    const r = validatePassword('lowercase1');
    expect(r.isValid).toBe(false);
    expect(r.error).toContain('uppercase');
  });
  it('rejects password without lowercase', () => {
    const r = validatePassword('UPPERCASE1');
    expect(r.isValid).toBe(false);
    expect(r.error).toContain('lowercase');
  });
  it('rejects password without number', () => {
    const r = validatePassword('NoNumber!A');
    expect(r.isValid).toBe(false);
    expect(r.error).toContain('number');
  });
  it('passes empty when not required', () => {
    expect(validatePassword('', false).isValid).toBe(true);
  });
});

describe('validatePasswordConfirmation', () => {
  it('passes when passwords match', () => {
    const r = validatePasswordConfirmation('Pass1234', 'Pass1234');
    expect(r.isValid).toBe(true);
  });
  it('fails when passwords differ', () => {
    const r = validatePasswordConfirmation('Pass1234', 'Different1');
    expect(r.isValid).toBe(false);
    expect(r.error).toContain('do not match');
  });
  it('fails when confirmation empty', () => {
    const r = validatePasswordConfirmation('Pass1234', '');
    expect(r.isValid).toBe(false);
  });
});

describe('validateName', () => {
  it('validates a full name', () => {
    expect(validateName('John').isValid).toBe(true);
  });
  it('rejects empty name when required', () => {
    expect(validateName('').isValid).toBe(false);
  });
  it('passes empty when not required', () => {
    expect(validateName('', 'Name', false).isValid).toBe(true);
  });
  it('rejects single character name', () => {
    const r = validateName('A');
    expect(r.isValid).toBe(false);
    expect(r.error).toContain('at least 2');
  });
  it('rejects name with numbers', () => {
    const r = validateName('John123');
    expect(r.isValid).toBe(false);
  });
  it('accepts name with hyphen', () => {
    expect(validateName('Mary-Jane').isValid).toBe(true);
  });
  it('rejects name over 50 chars', () => {
    expect(validateName('A'.repeat(51)).isValid).toBe(false);
  });
});

describe('validateDate', () => {
  it('validates ISO date string', () => {
    expect(validateDate('2024-01-15').isValid).toBe(true);
  });
  it('validates Date object string', () => {
    expect(validateDate(new Date().toISOString()).isValid).toBe(true);
  });
  it('rejects invalid date', () => {
    expect(validateDate('not-a-date').isValid).toBe(false);
  });
  it('rejects empty when required', () => {
    expect(validateDate('').isValid).toBe(false);
  });
  it('passes empty when not required', () => {
    expect(validateDate('', false).isValid).toBe(true);
  });
});

describe('validateDateOfBirth', () => {
  it('validates date of birth within range', () => {
    const r = validateDateOfBirth('2000-01-01', 4, 120);
    expect(r.isValid).toBe(true);
  });
  it('rejects too young', () => {
    const r = validateDateOfBirth(new Date().toISOString(), 18, 120);
    expect(r.isValid).toBe(false);
    expect(r.error).toContain('at least 18');
  });
  it('rejects invalid date', () => {
    const r = validateDateOfBirth('bad-date', 4);
    expect(r.isValid).toBe(false);
  });
});

describe('validateURL', () => {
  it('validates https URL', () => {
    expect(validateURL('https://example.com').isValid).toBe(true);
  });
  it('validates http URL', () => {
    expect(validateURL('http://example.com').isValid).toBe(true);
  });
  it('rejects random string', () => {
    expect(validateURL('not-a-url').isValid).toBe(false);
  });
  it('rejects empty when required', () => {
    expect(validateURL('').isValid).toBe(false);
  });
  it('passes empty when not required', () => {
    expect(validateURL('', false).isValid).toBe(true);
  });
});

describe('validateNumber', () => {
  it('validates integer', () => {
    expect(validateNumber('5', { integer: true }).isValid).toBe(true);
  });
  it('rejects decimal when integer required', () => {
    expect(validateNumber('5.5', { integer: true }).isValid).toBe(false);
  });
  it('validates with min/max', () => {
    expect(validateNumber('5', { min: 1, max: 10 }).isValid).toBe(true);
  });
  it('rejects below min', () => {
    expect(validateNumber('0', { min: 1 }).isValid).toBe(false);
  });
  it('rejects above max', () => {
    expect(validateNumber('11', { max: 10 }).isValid).toBe(false);
  });
  it('rejects non-numeric', () => {
    expect(validateNumber('abc').isValid).toBe(false);
  });
  it('passes empty when not required', () => {
    expect(validateNumber('', { required: false }).isValid).toBe(true);
  });
});

describe('validateCurrency', () => {
  it('validates whole dollar', () => {
    expect(validateCurrency('50').isValid).toBe(true);
  });
  it('validates with decimal', () => {
    expect(validateCurrency('49.99').isValid).toBe(true);
  });
  it('rejects negative amount', () => {
    expect(validateCurrency('-10').isValid).toBe(false);
  });
  it('rejects too many decimals', () => {
    expect(validateCurrency('10.999').isValid).toBe(false);
  });
  it('rejects empty when required', () => {
    expect(validateCurrency('').isValid).toBe(false);
  });
  it('passes empty when not required', () => {
    expect(validateCurrency('', false).isValid).toBe(true);
  });
});

describe('validateFile', () => {
  it('validates file within limits', () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    expect(validateFile(file, { allowedTypes: ['text/plain'] }).isValid).toBe(true);
  });
  it('rejects oversized file', () => {
    const bigFile = new File(['x'.repeat(1000)], 'big.txt', { type: 'text/plain' });
    const r = validateFile(bigFile, { maxSize: 100 });
    expect(r.isValid).toBe(false);
    expect(r.error).toContain('MB');
  });
  it('rejects wrong type', () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const r = validateFile(file, { allowedTypes: ['text/plain'] });
    expect(r.isValid).toBe(false);
  });
  it('rejects missing file when required', () => {
    expect(validateFile(null).isValid).toBe(false);
  });
  it('passes missing file when not required', () => {
    expect(validateFile(null, { required: false }).isValid).toBe(true);
  });
});

describe('validateImage', () => {
  it('validates JPEG image', () => {
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    expect(validateImage(file).isValid).toBe(true);
  });
  it('validates PNG image', () => {
    const file = new File(['test'], 'photo.png', { type: 'image/png' });
    expect(validateImage(file).isValid).toBe(true);
  });
  it('rejects non-image type', () => {
    const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
    expect(validateImage(file).isValid).toBe(false);
  });
  it('rejects missing image when required', () => {
    expect(validateImage(null).isValid).toBe(false);
  });
});

describe('validateForm', () => {
  it('passes when all fields valid', () => {
    const r = validateForm({ email: { isValid: true }, name: { isValid: true } });
    expect(r.isValid).toBe(true);
    expect(Object.keys(r.errors)).toHaveLength(0);
  });
  it('fails when any field invalid', () => {
    const r = validateForm({ email: { isValid: true, error: null }, name: { isValid: false, error: 'Required' } });
    expect(r.isValid).toBe(false);
    expect(r.errors.name).toBe('Required');
  });
});

describe('validateMemberForm', () => {
  it('returns errors for empty data', () => {
    const r = validateMemberForm({});
    expect(r.isValid).toBe(false);
    expect(r.errors.firstName).toBeDefined();
    expect(r.errors.lastName).toBeDefined();
    expect(r.errors.email).toBeDefined();
    expect(r.errors.phone).toBeDefined();
  });
});

describe('validateLeadForm', () => {
  it('returns errors for empty data', () => {
    const r = validateLeadForm({});
    expect(r.isValid).toBe(false);
    expect(r.errors.firstName).toBeDefined();
    expect(r.errors.lastName).toBeDefined();
    expect(r.errors.source).toBeDefined();
    expect(r.errors.interestedIn).toBeDefined();
  });
  it('returns errors for missing source', () => {
    const r = validateLeadForm({ firstName: 'John', lastName: 'Doe', email: 'john@test.com', phone: '0412345678' });
    expect(r.isValid).toBe(false);
    expect(r.errors.source).toBeDefined();
  });
});

describe('validateClassForm', () => {
  it('returns errors for empty data', () => {
    const r = validateClassForm({});
    expect(r.isValid).toBe(false);
    expect(r.errors.name).toBeDefined();
    expect(r.errors.type).toBeDefined();
    expect(r.errors.instructor).toBeDefined();
    expect(r.errors.location).toBeDefined();
  });
  it('validates end time after start time', () => {
    const r = validateClassForm({
      name: 'Boxing', type: 'class', instructor: 'Coach',
      location: 'Main', startTime: '10:00', endTime: '09:00',
    });
    expect(r.isValid).toBe(false);
    expect(r.errors.endTime).toContain('after start');
  });
  it('validates day of week range', () => {
    const r = validateClassForm({
      name: 'Boxing', type: 'class', instructor: 'Coach',
      location: 'Main', startTime: '10:00', endTime: '11:00',
      dayOfWeek: '7',
    });
    expect(r.isValid).toBe(false);
    expect(r.errors.dayOfWeek).toBeDefined();
  });
});

describe('validatePaymentForm', () => {
  it('returns errors for empty data', () => {
    const r = validatePaymentForm({});
    expect(r.isValid).toBe(false);
    expect(r.errors.memberId).toBeDefined();
    expect(r.errors.method).toBeDefined();
  });
});

describe('validateCommunicationForm', () => {
  it('returns errors for empty data', () => {
    const r = validateCommunicationForm({});
    expect(r.isValid).toBe(false);
    expect(r.errors.recipients).toBeDefined();
    expect(r.errors.subject).toBeDefined();
    expect(r.errors.message).toBeDefined();
    expect(r.errors.type).toBeDefined();
  });
  it('rejects empty recipients array', () => {
    const r = validateCommunicationForm({ recipients: [], subject: 'Hi', message: 'Hello', type: 'email' });
    expect(r.isValid).toBe(false);
    expect(r.errors.recipients).toContain('recipient');
  });
  it('rejects message over 1000 chars', () => {
    const r = validateCommunicationForm({
      recipients: [1], subject: 'Hi', message: 'x'.repeat(1001), type: 'email',
    });
    expect(r.isValid).toBe(false);
    expect(r.errors.message).toContain('1000');
  });
});

describe('sanitizeString', () => {
  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });
  it('collapses multiple spaces', () => {
    expect(sanitizeString('hello   world')).toBe('hello world');
  });
  it('returns empty for null', () => {
    expect(sanitizeString(null)).toBe('');
  });
  it('returns empty for undefined', () => {
    expect(sanitizeString(undefined)).toBe('');
  });
});

describe('sanitizeEmail', () => {
  it('trims and lowercases', () => {
    expect(sanitizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
  });
  it('returns empty for null', () => {
    expect(sanitizeEmail(null)).toBe('');
  });
});

describe('sanitizePhone', () => {
  it('removes spaces and non-digits', () => {
    expect(sanitizePhone('0412 345-678')).toBe('0412345678');
  });
  it('returns empty for null', () => {
    expect(sanitizePhone(null)).toBe('');
  });
});

describe('sanitizeHTML', () => {
  it('escapes HTML tags', () => {
    const result = sanitizeHTML('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;');
  });
});
