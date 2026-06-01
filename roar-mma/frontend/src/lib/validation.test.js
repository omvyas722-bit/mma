// Validation Utility Tests
import { describe, it, expect } from 'vitest';
import { validateEmail, validatePhone, validatePassword } from './validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('validates correct email', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('rejects invalid email', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
    });

    it('rejects email without domain', () => {
      const result = validateEmail('test@');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('validates Australian mobile number', () => {
      const result = validatePhone('0412345678');
      expect(result.isValid).toBe(true);
    });

    it('validates phone with spaces', () => {
      const result = validatePhone('0412 345 678');
      expect(result.isValid).toBe(true);
    });

    it('rejects invalid phone number', () => {
      const result = validatePhone('123');
      expect(result.isValid).toBe(false);
    });

    it('rejects empty phone', () => {
      const result = validatePhone('');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('validates strong password', () => {
      const result = validatePassword('StrongPass123!');
      expect(result.isValid).toBe(true);
    });

    it('rejects short password', () => {
      const result = validatePassword('short');
      expect(result.isValid).toBe(false);
    });

    it('rejects password without numbers', () => {
      const result = validatePassword('NoNumbers!');
      expect(result.isValid).toBe(false);
    });
  });
});
