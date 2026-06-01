import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('mockData', () => {
  let mod;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    mod = await import('./mockData');
  });

  describe('generateMember', () => {
    it('returns an object with all required fields', () => {
      const member = mod.generateMember();
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('firstName');
      expect(member).toHaveProperty('lastName');
      expect(member).toHaveProperty('email');
      expect(member).toHaveProperty('phone');
      expect(member).toHaveProperty('dateOfBirth');
      expect(member).toHaveProperty('membershipType');
      expect(member).toHaveProperty('membershipStatus');
      expect(member).toHaveProperty('beltRank');
      expect(member).toHaveProperty('joinDate');
      expect(member).toHaveProperty('createdAt');
      expect(member).toHaveProperty('updatedAt');
    });

    it('overwrites id when provided', () => {
      const member = mod.generateMember(999);
      expect(member.id).toBe(999);
    });

    it('generates deterministic data with mocked random', () => {
      const member = mod.generateMember();
      expect(member.firstName).toBe('Mary');
      expect(member.lastName).toBe('Lopez');
      expect(member.email).toBe('mary.lopez@yahoo.com');
    });
  });

  describe('generateLead', () => {
    it('returns an object with all required fields', () => {
      const lead = mod.generateLead();
      expect(lead).toHaveProperty('id');
      expect(lead).toHaveProperty('firstName');
      expect(lead).toHaveProperty('lastName');
      expect(lead).toHaveProperty('email');
      expect(lead).toHaveProperty('phone');
      expect(lead).toHaveProperty('source');
      expect(lead).toHaveProperty('status');
      expect(lead).toHaveProperty('interestedIn');
      expect(lead).toHaveProperty('createdAt');
    });

    it('overwrites id when provided', () => {
      const lead = mod.generateLead(555);
      expect(lead.id).toBe(555);
    });
  });

  describe('generateClass', () => {
    it('returns an object with all required fields', () => {
      const cls = mod.generateClass();
      expect(cls).toHaveProperty('id');
      expect(cls).toHaveProperty('name');
      expect(cls).toHaveProperty('type');
      expect(cls).toHaveProperty('instructor');
      expect(cls).toHaveProperty('location');
      expect(cls).toHaveProperty('dayOfWeek');
      expect(cls).toHaveProperty('startTime');
      expect(cls).toHaveProperty('endTime');
      expect(cls).toHaveProperty('capacity');
      expect(cls).toHaveProperty('isActive');
    });

    it('overwrites id when provided', () => {
      const cls = mod.generateClass(777);
      expect(cls.id).toBe(777);
    });
  });

  describe('generatePayment', () => {
    it('returns an object with all required fields', () => {
      const payment = mod.generatePayment();
      expect(payment).toHaveProperty('id');
      expect(payment).toHaveProperty('memberId');
      expect(payment).toHaveProperty('amount');
      expect(payment).toHaveProperty('currency');
      expect(payment).toHaveProperty('status');
      expect(payment).toHaveProperty('method');
      expect(payment).toHaveProperty('description');
      expect(payment).toHaveProperty('date');
      expect(payment).toHaveProperty('createdAt');
    });

    it('overwrites id and memberId when provided', () => {
      const payment = mod.generatePayment(100, 200);
      expect(payment.id).toBe(100);
      expect(payment.memberId).toBe(200);
    });
  });

  describe('generateAttendance', () => {
    it('returns an object with all required fields', () => {
      const att = mod.generateAttendance();
      expect(att).toHaveProperty('id');
      expect(att).toHaveProperty('memberId');
      expect(att).toHaveProperty('classId');
      expect(att).toHaveProperty('date');
      expect(att).toHaveProperty('checkedInAt');
      expect(att).toHaveProperty('createdAt');
    });

    it('overwrites ids when provided', () => {
      const att = mod.generateAttendance(10, 20, 30);
      expect(att.id).toBe(10);
      expect(att.memberId).toBe(20);
      expect(att.classId).toBe(30);
    });
  });

  describe('generateMembers', () => {
    it('returns array of specified count', () => {
      const members = mod.generateMembers(3);
      expect(members.length).toBe(3);
    });

    it('returns empty array for count 0', () => {
      const members = mod.generateMembers(0);
      expect(members).toEqual([]);
    });

    it('defaults to 50', () => {
      const members = mod.generateMembers();
      expect(members.length).toBe(50);
    });
  });

  describe('generateLeads', () => {
    it('returns array of specified count', () => {
      const leads = mod.generateLeads(2);
      expect(leads.length).toBe(2);
    });

    it('returns empty array for count 0', () => {
      const leads = mod.generateLeads(0);
      expect(leads).toEqual([]);
    });

    it('defaults to 30', () => {
      const leads = mod.generateLeads();
      expect(leads.length).toBe(30);
    });
  });

  describe('generateClasses', () => {
    it('returns array of specified count', () => {
      const classes = mod.generateClasses(2);
      expect(classes.length).toBe(2);
    });

    it('returns empty array for count 0', () => {
      const classes = mod.generateClasses(0);
      expect(classes).toEqual([]);
    });

    it('defaults to 20', () => {
      const classes = mod.generateClasses();
      expect(classes.length).toBe(20);
    });
  });

  describe('generatePayments', () => {
    it('returns array of specified count', () => {
      const payments = mod.generatePayments(2);
      expect(payments.length).toBe(2);
    });

    it('returns empty array for count 0', () => {
      const payments = mod.generatePayments(0);
      expect(payments).toEqual([]);
    });

    it('defaults to 100', () => {
      const payments = mod.generatePayments();
      expect(payments.length).toBe(100);
    });
  });

  describe('generateAttendanceRecords', () => {
    it('returns array of specified count', () => {
      const records = mod.generateAttendanceRecords(2);
      expect(records.length).toBe(2);
    });

    it('returns empty array for count 0', () => {
      const records = mod.generateAttendanceRecords(0);
      expect(records).toEqual([]);
    });

    it('defaults to 200', () => {
      const records = mod.generateAttendanceRecords();
      expect(records.length).toBe(200);
    });
  });

  describe('generateDashboardData', () => {
    it('returns stats, recentMembers, recentPayments, upcomingClasses', () => {
      const data = mod.generateDashboardData();
      expect(data).toHaveProperty('stats');
      expect(data).toHaveProperty('recentMembers');
      expect(data).toHaveProperty('recentPayments');
      expect(data).toHaveProperty('upcomingClasses');
      expect(data.stats).toHaveProperty('totalMembers');
      expect(data.stats).toHaveProperty('activeMembers');
      expect(data.stats).toHaveProperty('totalRevenue');
    });
  });

  describe('generateChartData', () => {
    it('returns labels and data arrays', () => {
      const chart = mod.generateChartData('line', 5);
      expect(Array.isArray(chart.labels)).toBe(true);
      expect(Array.isArray(chart.data)).toBe(true);
      expect(chart.labels.length).toBe(5);
    });

    it('returns monthly labels for monthly type', () => {
      const chart = mod.generateChartData('monthly', 12);
      expect(chart.labels[0]).toBe('Jan');
    });

    it('returns weekday labels for weekly type', () => {
      const chart = mod.generateChartData('weekly');
      expect(chart.labels[0]).toBe('Mon');
    });
  });

  describe('generateReportData', () => {
    it('returns members report shape', () => {
      const report = mod.generateReportData('members');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('byMembershipType');
      expect(report).toHaveProperty('byBeltRank');
      expect(report).toHaveProperty('growth');
    });

    it('returns revenue report shape', () => {
      const report = mod.generateReportData('revenue');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('byMonth');
      expect(report).toHaveProperty('byMembershipType');
      expect(report).toHaveProperty('topPayingMembers');
    });

    it('returns attendance report shape', () => {
      const report = mod.generateReportData('attendance');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('byDay');
      expect(report).toHaveProperty('byClassType');
      expect(report).toHaveProperty('topAttendees');
    });

    it('returns leads report shape', () => {
      const report = mod.generateReportData('leads');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('bySource');
      expect(report).toHaveProperty('byStatus');
      expect(report).toHaveProperty('conversionFunnel');
    });

    it('returns empty object for unknown type', () => {
      const report = mod.generateReportData('unknown');
      expect(report).toEqual({});
    });
  });

  describe('seedMockData', () => {
    it('returns all data types with correct shapes', () => {
      const data = mod.seedMockData();
      expect(data).toHaveProperty('members');
      expect(data).toHaveProperty('leads');
      expect(data).toHaveProperty('classes');
      expect(data).toHaveProperty('payments');
      expect(data).toHaveProperty('attendance');
      expect(data).toHaveProperty('dashboard');
      expect(Array.isArray(data.members)).toBe(true);
      expect(Array.isArray(data.leads)).toBe(true);
      expect(Array.isArray(data.classes)).toBe(true);
      expect(Array.isArray(data.payments)).toBe(true);
      expect(Array.isArray(data.attendance)).toBe(true);
    });
  });
});
