// Application Constants and Configuration

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
};

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 5,
  ACCEPTED_IMAGE_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
  ACCEPTED_DOCUMENT_FORMATS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  MAX_IMAGES: 10,
};

// Membership Types
export const MEMBERSHIP_TYPES = {
  UNLIMITED: 'unlimited',
  TWO_PER_WEEK: '2x_week',
  THREE_PER_WEEK: '3x_week',
  CASUAL: 'casual',
};

export const MEMBERSHIP_TYPE_LABELS = {
  [MEMBERSHIP_TYPES.UNLIMITED]: 'Unlimited',
  [MEMBERSHIP_TYPES.TWO_PER_WEEK]: '2x Per Week',
  [MEMBERSHIP_TYPES.THREE_PER_WEEK]: '3x Per Week',
  [MEMBERSHIP_TYPES.CASUAL]: 'Casual',
};

// Membership Status
export const MEMBERSHIP_STATUS = {
  ACTIVE: 'active',
  TRIAL: 'trial',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
};

export const MEMBERSHIP_STATUS_LABELS = {
  [MEMBERSHIP_STATUS.ACTIVE]: 'Active',
  [MEMBERSHIP_STATUS.TRIAL]: 'Trial',
  [MEMBERSHIP_STATUS.PAUSED]: 'Paused',
  [MEMBERSHIP_STATUS.CANCELLED]: 'Cancelled',
};

export const MEMBERSHIP_STATUS_COLORS = {
  [MEMBERSHIP_STATUS.ACTIVE]: 'green',
  [MEMBERSHIP_STATUS.TRIAL]: 'yellow',
  [MEMBERSHIP_STATUS.PAUSED]: 'gray',
  [MEMBERSHIP_STATUS.CANCELLED]: 'red',
};

// Belt Ranks
export const BELT_RANKS = {
  WHITE: 'white',
  BLUE: 'blue',
  PURPLE: 'purple',
  BROWN: 'brown',
  BLACK: 'black',
};

export const BELT_RANK_LABELS = {
  [BELT_RANKS.WHITE]: 'White Belt',
  [BELT_RANKS.BLUE]: 'Blue Belt',
  [BELT_RANKS.PURPLE]: 'Purple Belt',
  [BELT_RANKS.BROWN]: 'Brown Belt',
  [BELT_RANKS.BLACK]: 'Black Belt',
};

// Class Types
export const CLASS_TYPES = {
  BJJ: 'bjj',
  MUAY_THAI: 'muay_thai',
  MMA: 'mma',
  BOXING: 'boxing',
  WRESTLING: 'wrestling',
  FITNESS: 'fitness',
  KIDS: 'kids',
};

export const CLASS_TYPE_LABELS = {
  [CLASS_TYPES.BJJ]: 'Brazilian Jiu-Jitsu',
  [CLASS_TYPES.MUAY_THAI]: 'Muay Thai',
  [CLASS_TYPES.MMA]: 'MMA',
  [CLASS_TYPES.BOXING]: 'Boxing',
  [CLASS_TYPES.WRESTLING]: 'Wrestling',
  [CLASS_TYPES.FITNESS]: 'Fitness',
  [CLASS_TYPES.KIDS]: 'Kids Class',
};

export const CLASS_TYPE_COLORS = {
  [CLASS_TYPES.BJJ]: 'blue',
  [CLASS_TYPES.MUAY_THAI]: 'red',
  [CLASS_TYPES.MMA]: 'purple',
  [CLASS_TYPES.BOXING]: 'orange',
  [CLASS_TYPES.WRESTLING]: 'green',
  [CLASS_TYPES.FITNESS]: 'yellow',
  [CLASS_TYPES.KIDS]: 'pink',
};

// Lead Sources
export const LEAD_SOURCES = {
  WEBSITE: 'website',
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  REFERRAL: 'referral',
  WALK_IN: 'walk-in',
  OTHER: 'other',
};

export const LEAD_SOURCE_LABELS = {
  [LEAD_SOURCES.WEBSITE]: 'Website',
  [LEAD_SOURCES.FACEBOOK]: 'Facebook',
  [LEAD_SOURCES.INSTAGRAM]: 'Instagram',
  [LEAD_SOURCES.REFERRAL]: 'Referral',
  [LEAD_SOURCES.WALK_IN]: 'Walk-in',
  [LEAD_SOURCES.OTHER]: 'Other',
};

// Lead Status
export const LEAD_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  TRIAL_BOOKED: 'trial_booked',
  TRIAL_COMPLETED: 'trial_completed',
  CONVERTED: 'converted',
  LOST: 'lost',
};

export const LEAD_STATUS_LABELS = {
  [LEAD_STATUS.NEW]: 'New',
  [LEAD_STATUS.CONTACTED]: 'Contacted',
  [LEAD_STATUS.QUALIFIED]: 'Qualified',
  [LEAD_STATUS.TRIAL_BOOKED]: 'Trial Booked',
  [LEAD_STATUS.TRIAL_COMPLETED]: 'Trial Completed',
  [LEAD_STATUS.CONVERTED]: 'Converted',
  [LEAD_STATUS.LOST]: 'Lost',
};

// Payment Status
export const PAYMENT_STATUS = {
  SUCCEEDED: 'succeeded',
  PENDING: 'pending',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.SUCCEEDED]: 'Succeeded',
  [PAYMENT_STATUS.PENDING]: 'Pending',
  [PAYMENT_STATUS.FAILED]: 'Failed',
  [PAYMENT_STATUS.REFUNDED]: 'Refunded',
};

export const PAYMENT_STATUS_COLORS = {
  [PAYMENT_STATUS.SUCCEEDED]: 'green',
  [PAYMENT_STATUS.PENDING]: 'yellow',
  [PAYMENT_STATUS.FAILED]: 'red',
  [PAYMENT_STATUS.REFUNDED]: 'gray',
};

// Payment Methods
export const PAYMENT_METHODS = {
  CARD: 'card',
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  OTHER: 'other',
};

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CARD]: 'Credit/Debit Card',
  [PAYMENT_METHODS.CASH]: 'Cash',
  [PAYMENT_METHODS.BANK_TRANSFER]: 'Bank Transfer',
  [PAYMENT_METHODS.OTHER]: 'Other',
};

// Locations
export const LOCATIONS = {
  BURLEIGH_HEADS: 'burleigh_heads',
  VARSITY_LAKES: 'varsity_lakes',
};

export const LOCATION_LABELS = {
  [LOCATIONS.BURLEIGH_HEADS]: 'Burleigh Heads',
  [LOCATIONS.VARSITY_LAKES]: 'Varsity Lakes',
};

// Days of Week
export const DAYS_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export const DAY_LABELS = {
  [DAYS_OF_WEEK.SUNDAY]: 'Sunday',
  [DAYS_OF_WEEK.MONDAY]: 'Monday',
  [DAYS_OF_WEEK.TUESDAY]: 'Tuesday',
  [DAYS_OF_WEEK.WEDNESDAY]: 'Wednesday',
  [DAYS_OF_WEEK.THURSDAY]: 'Thursday',
  [DAYS_OF_WEEK.FRIDAY]: 'Friday',
  [DAYS_OF_WEEK.SATURDAY]: 'Saturday',
};

export const DAY_LABELS_SHORT = {
  [DAYS_OF_WEEK.SUNDAY]: 'Sun',
  [DAYS_OF_WEEK.MONDAY]: 'Mon',
  [DAYS_OF_WEEK.TUESDAY]: 'Tue',
  [DAYS_OF_WEEK.WEDNESDAY]: 'Wed',
  [DAYS_OF_WEEK.THURSDAY]: 'Thu',
  [DAYS_OF_WEEK.FRIDAY]: 'Fri',
  [DAYS_OF_WEEK.SATURDAY]: 'Sat',
};

// Date Ranges
export const DATE_RANGES = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  THIS_WEEK: 'this_week',
  LAST_WEEK: 'last_week',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  LAST_7_DAYS: 'last_7_days',
  LAST_30_DAYS: 'last_30_days',
  LAST_90_DAYS: 'last_90_days',
  THIS_YEAR: 'this_year',
  CUSTOM: 'custom',
};

export const DATE_RANGE_LABELS = {
  [DATE_RANGES.TODAY]: 'Today',
  [DATE_RANGES.YESTERDAY]: 'Yesterday',
  [DATE_RANGES.THIS_WEEK]: 'This Week',
  [DATE_RANGES.LAST_WEEK]: 'Last Week',
  [DATE_RANGES.THIS_MONTH]: 'This Month',
  [DATE_RANGES.LAST_MONTH]: 'Last Month',
  [DATE_RANGES.LAST_7_DAYS]: 'Last 7 Days',
  [DATE_RANGES.LAST_30_DAYS]: 'Last 30 Days',
  [DATE_RANGES.LAST_90_DAYS]: 'Last 90 Days',
  [DATE_RANGES.THIS_YEAR]: 'This Year',
  [DATE_RANGES.CUSTOM]: 'Custom Range',
};

// Message Types
export const MESSAGE_TYPES = {
  EMAIL: 'email',
  SMS: 'sms',
  BOTH: 'both',
};

export const MESSAGE_TYPE_LABELS = {
  [MESSAGE_TYPES.EMAIL]: 'Email',
  [MESSAGE_TYPES.SMS]: 'SMS',
  [MESSAGE_TYPES.BOTH]: 'Email & SMS',
};

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^0\d{9}$/, // Australian phone format
  POSTCODE_REGEX: /^\d{4}$/, // Australian postcode
  ABN_REGEX: /^\d{11}$/, // Australian Business Number
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  MESSAGE_MAX_LENGTH: 1000,
  SMS_MAX_LENGTH: 160,
};

// Currency
export const CURRENCY = {
  CODE: 'AUD',
  SYMBOL: '$',
  LOCALE: 'en-AU',
};

// Timezone
export const TIMEZONE = {
  DEFAULT: 'Australia/Perth',
  OPTIONS: [
    'Australia/Perth',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Brisbane',
    'Australia/Adelaide',
    'Australia/Darwin',
    'Australia/Hobart',
  ],
};

// Business Hours
export const BUSINESS_HOURS = {
  START: '06:00',
  END: '22:00',
  INTERVAL_MINUTES: 30,
};

// Cache Keys
export const CACHE_KEYS = {
  DASHBOARD: 'dashboard',
  MEMBERS: 'members',
  MEMBER: 'member',
  LEADS: 'leads',
  LEAD: 'lead',
  CLASSES: 'classes',
  CLASS: 'class',
  CLASS_INSTANCES: 'class-instances',
  PAYMENTS: 'payments',
  PAYMENT: 'payment',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  ATTENDANCE: 'attendance',
  COMMUNICATIONS: 'communications',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  TABLE_PREFERENCES: 'table_preferences',
  RECENT_SEARCHES: 'recent_searches',
};

// Routes
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  MEMBERS: '/members',
  MEMBER_PROFILE: '/members/:id',
  LEADS: '/leads',
  CLASSES: '/classes',
  PAYMENTS: '/payments',
  REPORTS: '/reports',
  COMMUNICATIONS: '/communications',
  CALENDAR: '/calendar',
  SETTINGS: '/settings',
  LOGIN: '/login',
  LOGOUT: '/logout',
};

// Feature Flags
export const FEATURES = {
  ENABLE_SMS: true,
  ENABLE_EMAIL: true,
  ENABLE_STRIPE: true,
  ENABLE_ANALYTICS: true,
  ENABLE_EXPORT: true,
  ENABLE_BULK_ACTIONS: true,
  ENABLE_COMMAND_PALETTE: true,
};

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'An error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  SERVER: 'Server error. Please try again later.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully',
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  SENT: 'Sent successfully',
};

// Usage example:
/*
import { MEMBERSHIP_STATUS, MEMBERSHIP_STATUS_LABELS, MEMBERSHIP_STATUS_COLORS } from './constants';

function StatusBadge({ status }) {
  const label = MEMBERSHIP_STATUS_LABELS[status];
  const color = MEMBERSHIP_STATUS_COLORS[status];

  return <span className={`badge badge-${color}`}>{label}</span>;
}
*/
