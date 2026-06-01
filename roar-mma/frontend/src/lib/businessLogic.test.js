import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./constants', () => ({
  MEMBERSHIP_TYPES: {
    UNLIMITED: 'unlimited',
    TWO_PER_WEEK: '2x_week',
    THREE_PER_WEEK: '3x_week',
    CASUAL: 'casual',
  },
  MEMBERSHIP_STATUS: {
    ACTIVE: 'active',
    TRIAL: 'trial',
    PAUSED: 'paused',
    CANCELLED: 'cancelled',
  },
  CLASS_TYPES: {
    BJJ: 'bjj',
    MUAY_THAI: 'muay_thai',
    MMA: 'mma',
    BOXING: 'boxing',
    WRESTLING: 'wrestling',
    FITNESS: 'fitness',
    KIDS: 'kids',
  },
  LEAD_STATUS: {
    NEW: 'new',
    CONTACTED: 'contacted',
    QUALIFIED: 'qualified',
    TRIAL_BOOKED: 'trial_booked',
    TRIAL_COMPLETED: 'trial_completed',
    CONVERTED: 'converted',
    LOST: 'lost',
  },
  PAYMENT_STATUS: {
    SUCCEEDED: 'succeeded',
    PENDING: 'pending',
    FAILED: 'failed',
    REFUNDED: 'refunded',
  },
}));

vi.mock('./dateUtils', () => ({
  getDateRange: vi.fn((period, offset) => {
    return { startDate: new Date('2025-01-01'), endDate: new Date('2025-01-31') };
  }),
  formatDate: vi.fn(() => 'Jan 15, 2024'),
  formatCurrency: vi.fn((a) => '$' + a),
  calculateAge: vi.fn(() => 30),
}));

describe('businessLogic', () => {
  let bl;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15'));
    bl = await import('./businessLogic');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getMembershipPrice', () => {
    it('returns price for valid membership types', () => {
      expect(bl.getMembershipPrice('unlimited')).toBe(199);
      expect(bl.getMembershipPrice('3x_week')).toBe(149);
      expect(bl.getMembershipPrice('2x_week')).toBe(99);
      expect(bl.getMembershipPrice('casual')).toBe(25);
    });

    it('returns 0 for unknown type', () => {
      expect(bl.getMembershipPrice('unknown')).toBe(0);
    });
  });

  describe('calculateProratedFee', () => {
    it('calculates prorated fee based on days remaining', () => {
      const fee = bl.calculateProratedFee('unlimited', '2025-06-10', '2025-06-15');
      expect(fee).toBeGreaterThan(0);
      expect(fee).toBeLessThan(199);
    });

    it('returns 0 for unknown membership type', () => {
      const fee = bl.calculateProratedFee('unknown', '2025-06-10', '2025-06-15');
      expect(fee).toBe(0);
    });
  });

  describe('calculateMembershipDuration', () => {
    it('calculates duration between two dates', () => {
      const dur = bl.calculateMembershipDuration('2024-01-01', '2025-06-15');
      expect(dur.years).toBe(1);
      expect(dur.months).toBe(5);
      expect(dur.totalMonths).toBe(17);
      expect(dur.totalDays).toBeGreaterThan(0);
    });

    it('handles same start and end date', () => {
      const dur = bl.calculateMembershipDuration('2025-06-15', '2025-06-15');
      expect(dur.years).toBe(0);
      expect(dur.totalMonths).toBe(0);
      expect(dur.totalDays).toBe(0);
    });
  });

  describe('isMembershipActive', () => {
    it('returns false for null member', () => {
      expect(bl.isMembershipActive(null)).toBe(false);
    });

    it('returns true for active member with future end date', () => {
      const member = { membershipStatus: 'active', membershipEndDate: '2025-12-31' };
      expect(bl.isMembershipActive(member)).toBe(true);
    });

    it('returns false for cancelled member', () => {
      const member = { membershipStatus: 'cancelled', membershipEndDate: '2025-12-31' };
      expect(bl.isMembershipActive(member)).toBe(false);
    });

    it('returns false for paused member', () => {
      const member = { membershipStatus: 'paused' };
      expect(bl.isMembershipActive(member)).toBe(false);
    });

    it('returns false for expired end date', () => {
      const member = { membershipStatus: 'active', membershipEndDate: '2024-12-31' };
      expect(bl.isMembershipActive(member)).toBe(false);
    });

    it('returns true for trial member without end date', () => {
      const member = { membershipStatus: 'trial' };
      expect(bl.isMembershipActive(member)).toBe(true);
    });
  });

  describe('canAttendClass', () => {
    it('rejects inactive members', () => {
      const member = { membershipStatus: 'cancelled', membershipType: 'unlimited' };
      const result = bl.canAttendClass(member, 'bjj');
      expect(result.canAttend).toBe(false);
      expect(result.reason).toBe('Membership is not active');
    });

    it('allows unlimited members', () => {
      const member = { membershipStatus: 'active', membershipType: 'unlimited' };
      const result = bl.canAttendClass(member, 'bjj');
      expect(result.canAttend).toBe(true);
    });

    it('rejects 2x_week member at limit', () => {
      const member = { membershipStatus: 'active', membershipType: '2x_week' };
      const result = bl.canAttendClass(member, 'bjj', 2);
      expect(result.canAttend).toBe(false);
      expect(result.reason).toContain('limit');
    });

    it('rejects 3x_week member at limit', () => {
      const member = { membershipStatus: 'active', membershipType: '3x_week' };
      const result = bl.canAttendClass(member, 'bjj', 3);
      expect(result.canAttend).toBe(false);
    });

    it('casual members require payment', () => {
      const member = { membershipStatus: 'active', membershipType: 'casual' };
      const result = bl.canAttendClass(member, 'bjj');
      expect(result.canAttend).toBe(true);
      expect(result.requiresPayment).toBe(true);
      expect(result.amount).toBe(25);
    });
  });

  describe('calculateAttendanceRate', () => {
    it('returns zero for empty records', () => {
      const result = bl.calculateAttendanceRate([], 'unlimited', 'month');
      expect(result.rate).toBe(0);
      expect(result.attended).toBe(0);
    });

    it('calculates rate for given records', () => {
      const records = [{ date: '2025-01-15' }, { date: '2025-01-20' }];
      const result = bl.calculateAttendanceRate(records, 'unlimited', 'month');
      expect(result.attended).toBe(2);
      expect(result.expected).toBeGreaterThan(0);
    });
  });

  describe('calculateLifetimeValue', () => {
    it('returns zeros when no payments', () => {
      const member = { joinDate: '2024-01-01' };
      const result = bl.calculateLifetimeValue(member, []);
      expect(result.totalPaid).toBe(0);
      expect(result.monthlyAverage).toBe(0);
    });

    it('calculates total from succeeded payments', () => {
      const member = { joinDate: '2024-01-01' };
      const payments = [
        { amount: 199, status: 'succeeded' },
        { amount: 199, status: 'succeeded' },
        { amount: 50, status: 'failed' },
      ];
      const result = bl.calculateLifetimeValue(member, payments);
      expect(result.totalPaid).toBe(398);
      expect(result.monthlyAverage).toBeGreaterThan(0);
    });
  });

  describe('calculateChurnRisk', () => {
    it('returns low risk for active member', () => {
      const member = { membershipStatus: 'active', membershipType: 'unlimited', joinDate: '2024-01-01' };
      const result = bl.calculateChurnRisk(member, [], []);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.level).toBeDefined();
      expect(Array.isArray(result.factors)).toBe(true);
    });
  });

  describe('calculateLeadScore', () => {
    it('returns score for a lead', () => {
      const lead = { source: 'referral', createdAt: new Date().toISOString(), status: 'new', followUpDate: null };
      const result = bl.calculateLeadScore(lead, []);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.probability).toMatch(/%$/);
      expect(['low', 'medium', 'high']).toContain(result.level);
    });

    it('returns higher score for more interactions', () => {
      const lead = { source: 'referral', createdAt: new Date().toISOString(), status: 'trial_completed', followUpDate: new Date(Date.now() + 86400000).toISOString() };
      const interactions = [{}, {}, {}];
      const result = bl.calculateLeadScore(lead, interactions);
      expect(result.score).toBeGreaterThan(50);
    });
  });

  describe('calculateClassUtilization', () => {
    it('returns correct utilization', () => {
      const cls = { capacity: 20 };
      const result = bl.calculateClassUtilization(cls, Array(15).fill({}));
      expect(result.capacity).toBe(20);
      expect(result.attendance).toBe(15);
      expect(result.available).toBe(5);
      expect(result.utilizationRate).toBe(75);
      expect(result.isFull).toBe(false);
    });

    it('marks class as full when at capacity', () => {
      const cls = { capacity: 10 };
      const result = bl.calculateClassUtilization(cls, Array(10).fill({}));
      expect(result.isFull).toBe(true);
      expect(result.status).toBe('full');
    });

    it('handles zero capacity', () => {
      const cls = { capacity: 0 };
      const result = bl.calculateClassUtilization(cls, []);
      expect(result.utilizationRate).toBe(0);
    });
  });

  describe('calculateInstructorWorkload', () => {
    it('calculates workload based on classes', () => {
      const classes = [
        { instructor: 'Coach Mike', startTime: '09:00', endTime: '10:00' },
        { instructor: 'Coach Mike', startTime: '10:00', endTime: '11:30' },
        { instructor: 'Coach Sarah', startTime: '09:00', endTime: '10:00' },
      ];
      const result = bl.calculateInstructorWorkload('Coach Mike', classes);
      expect(result.classesPerWeek).toBe(2);
      expect(result.hoursPerWeek).toBe(2.5);
      expect(result.workload).toBe('low');
    });

    it('returns zeros for no classes', () => {
      const result = bl.calculateInstructorWorkload('Coach Mike', []);
      expect(result.classesPerWeek).toBe(0);
      expect(result.hoursPerWeek).toBe(0);
    });
  });

  describe('calculateRevenueMetrics', () => {
    it('returns revenue metrics for payments', () => {
      const payments = [
        { date: '2025-01-10', amount: 199, status: 'succeeded' },
        { date: '2025-01-20', amount: 149, status: 'succeeded' },
        { date: '2025-01-15', amount: 50, status: 'failed' },
      ];
      const result = bl.calculateRevenueMetrics(payments, 'month');
      expect(result.totalRevenue).toBe(348);
      expect(result.transactionCount).toBe(2);
      expect(result.averageTransaction).toBe(174);
    });
  });

  describe('calculateRetentionRate', () => {
    it('returns 0 for empty members', () => {
      const result = bl.calculateRetentionRate([], 'month');
      expect(result.retentionRate).toBe(0);
    });
  });

  describe('generateMemberRecommendations', () => {
    it('returns array of recommendations', () => {
      const member = { membershipStatus: 'active', membershipType: 'unlimited', joinDate: '2025-06-01' };
      const result = bl.generateMemberRecommendations(member, [], []);
      expect(Array.isArray(result)).toBe(true);
    });

    it('includes upsell recommendation for high attendance', () => {
      const member = { membershipStatus: 'active', membershipType: '2x_week', joinDate: '2024-01-01' };
      const records = [
        { date: '2025-01-02' }, { date: '2025-01-05' }, { date: '2025-01-08' },
        { date: '2025-01-12' }, { date: '2025-01-15' }, { date: '2025-01-18' },
        { date: '2025-01-22' }, { date: '2025-01-25' }, { date: '2025-01-28' },
        { date: '2025-01-30' },
      ];
      const result = bl.generateMemberRecommendations(member, records, []);
      const upsell = result.find(r => r.type === 'upsell');
      expect(upsell).toBeDefined();
    });
  });
});
