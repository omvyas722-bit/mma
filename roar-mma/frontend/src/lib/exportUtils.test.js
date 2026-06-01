import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('exportUtils', () => {
  let mod;

  beforeEach(async () => {
    vi.restoreAllMocks();
    window.URL.createObjectURL = vi.fn(() => 'blob:test');
    window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({ href: '', download: '', click: vi.fn() });
    vi.spyOn(document.body, 'appendChild').mockReturnValue({});
    vi.spyOn(document.body, 'removeChild').mockReturnValue({});
    vi.stubGlobal('Blob', vi.fn(function(content, opts) { return { content, opts }; }));
    mod = await import('./exportUtils');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('exportToCSV', () => {
    it('warns and returns when no data', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mod.exportToCSV(null);
      expect(spy).toHaveBeenCalled();
      mod.exportToCSV([]);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('creates CSV with header row and data', () => {
      const data = [{ name: 'John', age: 30 }];
      mod.exportToCSV(data, 'test.csv');
      expect(Blob).toHaveBeenCalled();
      const content = Blob.mock.calls[0][0][0];
      expect(content).toContain('name,age');
      expect(content).toContain('John,30');
    });

    it('uses specified columns instead of keys', () => {
      const data = [{ name: 'John', age: 30, extra: 'x' }];
      mod.exportToCSV(data, 'test.csv', ['name', 'age']);
      const content = Blob.mock.calls[0][0][0];
      expect(content).not.toContain('extra');
      expect(content).toBe('name,age\nJohn,30');
    });

    it('escapes commas and quotes in values', () => {
      const data = [{ name: 'Smith, John', note: 'He said "hello"' }];
      mod.exportToCSV(data, 'test.csv');
      const content = Blob.mock.calls[0][0][0];
      expect(content).toContain('"Smith, John"');
      expect(content).toContain('"He said ""hello"""');
    });

    it('escapes newlines in values', () => {
      const data = [{ name: 'Line1\nLine2' }];
      mod.exportToCSV(data, 'test.csv');
      const content = Blob.mock.calls[0][0][0];
      expect(content).toContain('"Line1\nLine2"');
    });

    it('handles null and undefined values as empty', () => {
      const data = [{ name: 'John', age: null, active: undefined }];
      mod.exportToCSV(data, 'test.csv');
      const content = Blob.mock.calls[0][0][0];
      expect(content).toBe('name,age,active\nJohn,,');
    });
  });

  describe('exportToJSON', () => {
    it('warns and returns when no data', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mod.exportToJSON(null);
      expect(spy).toHaveBeenCalled();
    });

    it('creates JSON file with stringified data', () => {
      const data = { name: 'John', age: 30 };
      mod.exportToJSON(data, 'data.json');
      expect(Blob).toHaveBeenCalled();
      const content = Blob.mock.calls[0][0][0];
      expect(content).toContain('"name": "John"');
      expect(content).toContain('"age": 30');
    });
  });

  describe('exportMembersToCSV', () => {
    it('transforms members and calls exportToCSV', () => {
      const members = [{
        first_name: 'John', last_name: 'Doe', email: 'john@test.com', phone: '0412345678',
        membership_status: 'active', membership_type: 'unlimited', location: 'Burleigh',
        joined_date: '2024-01-01', belt_rank: 'blue',
      }];
      mod.exportMembersToCSV(members);
      const content = Blob.mock.calls[0][0][0];
      expect(content).toContain('First Name,Last Name');
      expect(content).toContain('John,Doe');
      expect(content).toContain('unlimited');
    });
  });

  describe('exportAttendanceToCSV', () => {
    it('transforms attendance records', () => {
      const records = [{
        date: '2024-06-01', member_name: 'John Doe', class_name: 'BJJ',
        start_time: '09:00', checked_in_at: '2024-06-01T08:55:00Z',
      }];
      mod.exportAttendanceToCSV(records);
      const content = Blob.mock.calls[0][0][0];
      expect(content).toContain('Date,Member,Class');
      expect(content).toContain('John Doe');
    });
  });

  describe('exportPaymentsToCSV', () => {
    it('transforms payment records', () => {
      const payments = [{
        created_at: '2024-06-01', member_name: 'John Doe', description: 'Membership',
        amount: 199, status: 'succeeded', transaction_id: 'txn_123',
      }];
      mod.exportPaymentsToCSV(payments);
      const content = Blob.mock.calls[0][0][0];
      expect(content).toContain('Date,Member,Description,Amount,Status,Transaction ID');
      expect(content).toContain('199');
    });
  });

  describe('exportLeadsToCSV', () => {
    it('transforms lead records', () => {
      const leads = [{
        first_name: 'Jane', last_name: 'Smith', email: 'jane@test.com', phone: '0400000000',
        source: 'website', status: 'new', location_preference: 'Varsity', interests: 'BJJ',
        created_at: '2024-06-01',
      }];
      mod.exportLeadsToCSV(leads);
      const content = Blob.mock.calls[0][0][0];
      expect(content).toContain('First Name,Last Name');
      expect(content).toContain('Jane,Smith');
    });
  });

  describe('exportClassScheduleToCSV', () => {
    it('transforms class schedule records', () => {
      const classes = [{
        name: 'BJJ Fundamentals', class_type: 'bjj', instructor: 'Mike',
        day_of_week: 1, start_time: '09:00', end_time: '10:00', location: 'Burleigh',
        max_capacity: 30,
      }];
      mod.exportClassScheduleToCSV(classes);
      const content = Blob.mock.calls[0][0][0];
      expect(content).toContain('Class Name,Type,Instructor,Day');
      expect(content).toContain('BJJ Fundamentals');
    });
  });

  describe('exportWithTemplate', () => {
    it('uses formatter functions per column', () => {
      const data = [{ first_name: 'John', last_name: 'Doe' }];
      const template = {
        'Full Name': (row) => `${row.first_name} ${row.last_name}`,
        'Initials': (row) => `${row.first_name[0]}.${row.last_name[0]}.`,
      };
      mod.exportWithTemplate(data, template, 'custom.csv');
      const content = Blob.mock.calls[0][0][0];
      expect(content).toContain('Full Name,Initials');
      expect(content).toContain('John Doe,J.D.');
    });
  });

  describe('batchExport', () => {
    it('exports csv and json based on type', () => {
      mod.batchExport([
        { data: [{ x: 1 }], filename: 'a.csv' },
        { data: { y: 2 }, filename: 'b.json', type: 'json' },
      ]);
      const csvContent = Blob.mock.calls[0][0][0];
      expect(csvContent).toContain('x');
      const jsonCall = Blob.mock.calls.find(c => c[0][0].includes('"y"'));
      expect(jsonCall).toBeTruthy();
    });
  });
});
