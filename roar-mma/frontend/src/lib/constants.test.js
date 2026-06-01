import { describe, it, expect } from 'vitest';
import {
  API_CONFIG,
  PAGINATION,
  FILE_UPLOAD,
  MEMBERSHIP_TYPES,
  MEMBERSHIP_TYPE_LABELS,
  MEMBERSHIP_STATUS,
  MEMBERSHIP_STATUS_LABELS,
  MEMBERSHIP_STATUS_COLORS,
  BELT_RANKS,
  BELT_RANK_LABELS,
  CLASS_TYPES,
  CLASS_TYPE_LABELS,
  CLASS_TYPE_COLORS,
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS,
  LEAD_STATUS_LABELS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  LOCATIONS,
  LOCATION_LABELS,
  DAYS_OF_WEEK,
  DAY_LABELS,
  DAY_LABELS_SHORT,
  DATE_RANGES,
  DATE_RANGE_LABELS,
  MESSAGE_TYPES,
  MESSAGE_TYPE_LABELS,
  NOTIFICATION_TYPES,
  VALIDATION,
  CURRENCY,
  TIMEZONE,
  BUSINESS_HOURS,
  CACHE_KEYS,
  STORAGE_KEYS,
  ROUTES,
  FEATURES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from './constants';

describe('API_CONFIG', () => {
  it('has all expected keys with correct types', () => {
    expect(API_CONFIG.BASE_URL).toEqual(expect.any(String));
    expect(API_CONFIG.TIMEOUT).toBe(30000);
    expect(API_CONFIG.RETRY_ATTEMPTS).toBe(3);
    expect(API_CONFIG.RETRY_DELAY).toBe(1000);
  });
});

describe('PAGINATION', () => {
  it('has correct numeric values', () => {
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(20);
    expect(PAGINATION.PAGE_SIZE_OPTIONS).toEqual([10, 20, 50, 100]);
    expect(PAGINATION.MAX_PAGE_SIZE).toBe(100);
  });
});

describe('FILE_UPLOAD', () => {
  it('has correct values', () => {
    expect(FILE_UPLOAD.MAX_SIZE_MB).toBe(5);
    expect(FILE_UPLOAD.ACCEPTED_IMAGE_FORMATS).toContain('image/jpeg');
    expect(FILE_UPLOAD.ACCEPTED_DOCUMENT_FORMATS).toContain('application/pdf');
    expect(FILE_UPLOAD.MAX_IMAGES).toBe(10);
  });

  it('all values are defined', () => {
    Object.values(FILE_UPLOAD).forEach(v => expect(v).toBeDefined());
  });
});

describe('MEMBERSHIP_TYPES and labels', () => {
  it('all MEMBERSHIP_TYPES have labels', () => {
    Object.values(MEMBERSHIP_TYPES).forEach(key => {
      expect(MEMBERSHIP_TYPE_LABELS[key]).toBeDefined();
    });
  });

  it('all MEMBERSHIP_TYPE_LABELS keys match MEMBERSHIP_TYPES values', () => {
    Object.keys(MEMBERSHIP_TYPE_LABELS).forEach(key => {
      expect(Object.values(MEMBERSHIP_TYPES)).toContain(key);
    });
  });

  it('no undefined values', () => {
    [...Object.values(MEMBERSHIP_TYPES), ...Object.values(MEMBERSHIP_TYPE_LABELS)].forEach(v => {
      expect(v).toBeDefined();
    });
  });
});

describe('MEMBERSHIP_STATUS and labels/colors', () => {
  it('all statuses have labels and colors', () => {
    Object.values(MEMBERSHIP_STATUS).forEach(key => {
      expect(MEMBERSHIP_STATUS_LABELS[key]).toBeDefined();
      expect(MEMBERSHIP_STATUS_COLORS[key]).toBeDefined();
    });
  });

  it('label keys match status values', () => {
    Object.keys(MEMBERSHIP_STATUS_LABELS).forEach(k => expect(Object.values(MEMBERSHIP_STATUS)).toContain(k));
    Object.keys(MEMBERSHIP_STATUS_COLORS).forEach(k => expect(Object.values(MEMBERSHIP_STATUS)).toContain(k));
  });
});

describe('BELT_RANKS and labels', () => {
  it('all ranks have labels', () => {
    Object.values(BELT_RANKS).forEach(key => {
      expect(BELT_RANK_LABELS[key]).toBeDefined();
    });
  });

  it('label keys match rank values', () => {
    Object.keys(BELT_RANK_LABELS).forEach(k => expect(Object.values(BELT_RANKS)).toContain(k));
  });
});

describe('CLASS_TYPES and labels/colors', () => {
  it('all class types have labels and colors', () => {
    Object.values(CLASS_TYPES).forEach(key => {
      expect(CLASS_TYPE_LABELS[key]).toBeDefined();
      expect(CLASS_TYPE_COLORS[key]).toBeDefined();
    });
  });
});

describe('LEAD_SOURCES and labels', () => {
  it('all sources have labels', () => {
    Object.values(LEAD_SOURCES).forEach(key => {
      expect(LEAD_SOURCE_LABELS[key]).toBeDefined();
    });
  });
});

describe('LEAD_STATUS and labels', () => {
  it('all statuses have labels', () => {
    Object.values(LEAD_STATUS).forEach(key => {
      expect(LEAD_STATUS_LABELS[key]).toBeDefined();
    });
  });
});

describe('PAYMENT_STATUS and labels/colors', () => {
  it('all statuses have labels and colors', () => {
    Object.values(PAYMENT_STATUS).forEach(key => {
      expect(PAYMENT_STATUS_LABELS[key]).toBeDefined();
      expect(PAYMENT_STATUS_COLORS[key]).toBeDefined();
    });
  });
});

describe('PAYMENT_METHODS and labels', () => {
  it('all methods have labels', () => {
    Object.values(PAYMENT_METHODS).forEach(key => {
      expect(PAYMENT_METHOD_LABELS[key]).toBeDefined();
    });
  });
});

describe('LOCATIONS and labels', () => {
  it('all locations have labels', () => {
    Object.values(LOCATIONS).forEach(key => {
      expect(LOCATION_LABELS[key]).toBeDefined();
    });
  });
});

describe('DAYS_OF_WEEK and labels', () => {
  it('all days have labels', () => {
    Object.values(DAYS_OF_WEEK).forEach(key => {
      expect(DAY_LABELS[key]).toBeDefined();
      expect(DAY_LABELS_SHORT[key]).toBeDefined();
    });
  });
});

describe('DATE_RANGES and labels', () => {
  it('all ranges have labels', () => {
    Object.values(DATE_RANGES).forEach(key => {
      expect(DATE_RANGE_LABELS[key]).toBeDefined();
    });
  });

  it('DATE_RANGE_LABELS has all DATE_RANGES keys', () => {
    Object.keys(DATE_RANGE_LABELS).forEach(k => {
      expect(Object.values(DATE_RANGES)).toContain(k);
    });
  });
});

describe('MESSAGE_TYPES and labels', () => {
  it('all types have labels', () => {
    Object.values(MESSAGE_TYPES).forEach(key => {
      expect(MESSAGE_TYPE_LABELS[key]).toBeDefined();
    });
  });
});

describe('NOTIFICATION_TYPES', () => {
  it('all values are strings', () => {
    Object.values(NOTIFICATION_TYPES).forEach(v => expect(typeof v).toBe('string'));
  });
});

describe('VALIDATION', () => {
  it('EMAIL_REGEX matches valid emails', () => {
    expect(VALIDATION.EMAIL_REGEX.test('test@example.com')).toBe(true);
  });

  it('EMAIL_REGEX rejects invalid emails', () => {
    expect(VALIDATION.EMAIL_REGEX.test('not-email')).toBe(false);
  });

  it('PHONE_REGEX matches valid 10-digit phone starting with 0', () => {
    expect(VALIDATION.PHONE_REGEX.test('0412345678')).toBe(true);
  });

  it('PHONE_REGEX rejects invalid phone', () => {
    expect(VALIDATION.PHONE_REGEX.test('123')).toBe(false);
  });

  it('POSTCODE_REGEX matches 4-digit postcode', () => {
    expect(VALIDATION.POSTCODE_REGEX.test('2000')).toBe(true);
  });

  it('POSTCODE_REGEX rejects invalid postcode', () => {
    expect(VALIDATION.POSTCODE_REGEX.test('200')).toBe(false);
  });

  it('ABN_REGEX matches 11-digit ABN', () => {
    expect(VALIDATION.ABN_REGEX.test('12345678901')).toBe(true);
  });

  it('ABN_REGEX rejects invalid ABN', () => {
    expect(VALIDATION.ABN_REGEX.test('1234567890')).toBe(false);
  });

  it('has correct numeric validation constants', () => {
    expect(VALIDATION.PASSWORD_MIN_LENGTH).toBe(8);
    expect(VALIDATION.NAME_MIN_LENGTH).toBe(2);
    expect(VALIDATION.NAME_MAX_LENGTH).toBe(50);
    expect(VALIDATION.MESSAGE_MAX_LENGTH).toBe(1000);
    expect(VALIDATION.SMS_MAX_LENGTH).toBe(160);
  });
});

describe('CURRENCY', () => {
  it('has correct values', () => {
    expect(CURRENCY.CODE).toBe('AUD');
    expect(CURRENCY.SYMBOL).toBe('$');
    expect(CURRENCY.LOCALE).toBe('en-AU');
  });
});

describe('TIMEZONE', () => {
  it('has default timezone and options', () => {
    expect(TIMEZONE.DEFAULT).toBe('Australia/Perth');
    expect(TIMEZONE.OPTIONS).toContain('Australia/Sydney');
    expect(TIMEZONE.OPTIONS.length).toBe(7);
  });
});

describe('BUSINESS_HOURS', () => {
  it('has correct values', () => {
    expect(BUSINESS_HOURS.START).toBe('06:00');
    expect(BUSINESS_HOURS.END).toBe('22:00');
    expect(BUSINESS_HOURS.INTERVAL_MINUTES).toBe(30);
  });
});

describe('CACHE_KEYS', () => {
  it('all values are strings', () => {
    Object.values(CACHE_KEYS).forEach(v => expect(typeof v).toBe('string'));
  });

  it('contains expected keys', () => {
    expect(CACHE_KEYS.DASHBOARD).toBe('dashboard');
    expect(CACHE_KEYS.MEMBERS).toBe('members');
    expect(CACHE_KEYS.SETTINGS).toBe('settings');
  });
});

describe('STORAGE_KEYS', () => {
  it('all values are strings', () => {
    Object.values(STORAGE_KEYS).forEach(v => expect(typeof v).toBe('string'));
  });

  it('contains expected keys', () => {
    expect(STORAGE_KEYS.AUTH_TOKEN).toBe('auth_token');
    expect(STORAGE_KEYS.THEME).toBe('theme');
  });
});

describe('ROUTES', () => {
  it('all values start with /', () => {
    Object.values(ROUTES).forEach(v => expect(v).toMatch(/^\//));
  });

  it('contains expected routes', () => {
    expect(ROUTES.HOME).toBe('/');
    expect(ROUTES.DASHBOARD).toBe('/dashboard');
    expect(ROUTES.MEMBER_PROFILE).toBe('/members/:id');
  });
});

describe('FEATURES', () => {
  it('all values are booleans', () => {
    Object.values(FEATURES).forEach(v => expect(typeof v).toBe('boolean'));
  });

  it('all features are enabled', () => {
    Object.values(FEATURES).forEach(v => expect(v).toBe(true));
  });
});

describe('ERROR_MESSAGES', () => {
  it('all values are non-empty strings', () => {
    Object.values(ERROR_MESSAGES).forEach(v => {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    });
  });
});

describe('SUCCESS_MESSAGES', () => {
  it('all values are non-empty strings', () => {
    Object.values(SUCCESS_MESSAGES).forEach(v => {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    });
  });
});

describe('All exports have no undefined values', () => {
  const modules = [
    API_CONFIG, PAGINATION, FILE_UPLOAD,
    MEMBERSHIP_TYPES, MEMBERSHIP_TYPE_LABELS,
    MEMBERSHIP_STATUS, MEMBERSHIP_STATUS_LABELS, MEMBERSHIP_STATUS_COLORS,
    BELT_RANKS, BELT_RANK_LABELS,
    CLASS_TYPES, CLASS_TYPE_LABELS, CLASS_TYPE_COLORS,
    LEAD_SOURCES, LEAD_SOURCE_LABELS,
    LEAD_STATUS, LEAD_STATUS_LABELS,
    PAYMENT_STATUS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
    PAYMENT_METHODS, PAYMENT_METHOD_LABELS,
    LOCATIONS, LOCATION_LABELS,
    DAYS_OF_WEEK, DAY_LABELS, DAY_LABELS_SHORT,
    DATE_RANGES, DATE_RANGE_LABELS,
    MESSAGE_TYPES, MESSAGE_TYPE_LABELS,
    NOTIFICATION_TYPES, VALIDATION, CURRENCY, TIMEZONE, BUSINESS_HOURS,
    CACHE_KEYS, STORAGE_KEYS, ROUTES, FEATURES, ERROR_MESSAGES, SUCCESS_MESSAGES,
  ];

  modules.forEach(mod => {
    Object.entries(mod).forEach(([key, value]) => {
      it(`${key} is defined`, () => {
        expect(value).toBeDefined();
      });
    });
  });
});
