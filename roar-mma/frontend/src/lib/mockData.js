// Mock Data Generator for Testing and Development

import {
  MEMBERSHIP_TYPES,
  MEMBERSHIP_STATUS,
  BELT_RANKS,
  CLASS_TYPES,
  LEAD_SOURCES,
  LEAD_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  LOCATIONS,
} from './constants';

// Random helpers
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
  return array[randomInt(0, array.length - 1)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomBoolean(probability = 0.5) {
  return Math.random() < probability;
}

function randomPhone() {
  return `04${randomInt(10, 99)}${randomInt(100, 999)}${randomInt(100, 999)}`;
}

function randomEmail(firstName, lastName) {
  const domains = ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomItem(domains)}`;
}

// Sample data
const firstNames = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
  'Thomas', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan',
  'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Margaret', 'Sandra',
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
];

const streets = [
  'Main St', 'High St', 'Park Ave', 'Ocean Dr', 'Beach Rd', 'Hill St',
  'Lake Rd', 'River St', 'Forest Ave', 'Mountain Dr', 'Valley Rd', 'Creek St',
];

const suburbs = [
  'Burleigh Heads', 'Varsity Lakes', 'Robina', 'Mermaid Beach', 'Miami',
  'Palm Beach', 'Currumbin', 'Coolangatta', 'Broadbeach', 'Surfers Paradise',
];

const classNames = {
  [CLASS_TYPES.BJJ]: ['Fundamentals', 'Advanced', 'Competition', 'No-Gi', 'Open Mat'],
  [CLASS_TYPES.MUAY_THAI]: ['Beginners', 'Intermediate', 'Advanced', 'Sparring', 'Pad Work'],
  [CLASS_TYPES.MMA]: ['Fundamentals', 'Advanced', 'Sparring', 'Fight Team'],
  [CLASS_TYPES.BOXING]: ['Beginners', 'Intermediate', 'Advanced', 'Sparring'],
  [CLASS_TYPES.WRESTLING]: ['Fundamentals', 'Advanced', 'Competition'],
  [CLASS_TYPES.FITNESS]: ['Strength & Conditioning', 'HIIT', 'Cardio Kickboxing'],
  [CLASS_TYPES.KIDS]: ['Little Warriors (4-7)', 'Junior Grapplers (8-12)', 'Teen MMA (13-17)'],
};

const instructors = [
  'Coach Mike', 'Coach Sarah', 'Coach Tom', 'Coach Lisa', 'Coach Dan',
  'Coach Emma', 'Coach Jake', 'Coach Rachel', 'Coach Chris', 'Coach Amy',
];

// Generate single member
export function generateMember(id) {
  const firstName = randomItem(firstNames);
  const lastName = randomItem(lastNames);
  const joinDate = randomDate(new Date(2020, 0, 1), new Date());
  const dateOfBirth = randomDate(new Date(1970, 0, 1), new Date(2010, 0, 1));

  return {
    id: id || randomInt(1000, 9999),
    firstName,
    lastName,
    email: randomEmail(firstName, lastName),
    phone: randomPhone(),
    dateOfBirth: dateOfBirth.toISOString().split('T')[0],
    address: `${randomInt(1, 999)} ${randomItem(streets)}`,
    suburb: randomItem(suburbs),
    postcode: randomInt(4000, 4999).toString(),
    membershipType: randomItem(Object.values(MEMBERSHIP_TYPES)),
    membershipStatus: randomItem(Object.values(MEMBERSHIP_STATUS)),
    beltRank: randomItem(Object.values(BELT_RANKS)),
    joinDate: joinDate.toISOString().split('T')[0],
    emergencyContactName: `${randomItem(firstNames)} ${randomItem(lastNames)}`,
    emergencyContactPhone: randomPhone(),
    emergencyContactRelationship: randomItem(['Parent', 'Spouse', 'Sibling', 'Friend']),
    medicalConditions: randomBoolean(0.2) ? 'Asthma' : '',
    injuries: randomBoolean(0.1) ? 'Previous knee injury' : '',
    goals: randomItem([
      'Lose weight and get fit',
      'Learn self-defense',
      'Compete in tournaments',
      'Build confidence',
      'Stay active and healthy',
    ]),
    notes: randomBoolean(0.3) ? 'Prefers morning classes' : '',
    photoUrl: `https://i.pravatar.cc/150?img=${randomInt(1, 70)}`,
    createdAt: joinDate.toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Generate single lead
export function generateLead(id) {
  const firstName = randomItem(firstNames);
  const lastName = randomItem(lastNames);
  const createdDate = randomDate(new Date(2024, 0, 1), new Date());

  return {
    id: id || randomInt(1000, 9999),
    firstName,
    lastName,
    email: randomEmail(firstName, lastName),
    phone: randomPhone(),
    source: randomItem(Object.values(LEAD_SOURCES)),
    status: randomItem(Object.values(LEAD_STATUS)),
    interestedIn: randomItem(Object.values(CLASS_TYPES)),
    notes: randomBoolean(0.5) ? 'Interested in trial class' : '',
    followUpDate: randomBoolean(0.6) ? randomDate(new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0] : null,
    createdAt: createdDate.toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Generate single class
export function generateClass(id) {
  const classType = randomItem(Object.values(CLASS_TYPES));
  const name = randomItem(classNames[classType]);

  return {
    id: id || randomInt(1000, 9999),
    name: `${name}`,
    type: classType,
    instructor: randomItem(instructors),
    location: randomItem(Object.values(LOCATIONS)),
    dayOfWeek: randomInt(0, 6),
    startTime: `${randomInt(6, 20).toString().padStart(2, '0')}:${randomItem(['00', '30'])}`,
    endTime: `${randomInt(7, 21).toString().padStart(2, '0')}:${randomItem(['00', '30'])}`,
    capacity: randomInt(15, 30),
    description: `${name} class for ${classType}`,
    isActive: randomBoolean(0.9),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Generate single payment
export function generatePayment(id, memberId) {
  const date = randomDate(new Date(2024, 0, 1), new Date());
  const amount = randomItem([99, 149, 199, 249, 299]);

  return {
    id: id || randomInt(1000, 9999),
    memberId: memberId || randomInt(1000, 9999),
    amount,
    currency: 'AUD',
    status: randomItem(Object.values(PAYMENT_STATUS)),
    method: randomItem(Object.values(PAYMENT_METHODS)),
    description: 'Monthly membership fee',
    date: date.toISOString().split('T')[0],
    createdAt: date.toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Generate single attendance record
export function generateAttendance(id, memberId, classId) {
  const date = randomDate(new Date(2024, 0, 1), new Date());

  return {
    id: id || randomInt(1000, 9999),
    memberId: memberId || randomInt(1000, 9999),
    classId: classId || randomInt(1000, 9999),
    date: date.toISOString().split('T')[0],
    checkedInAt: date.toISOString(),
    createdAt: date.toISOString(),
  };
}

// Generate multiple members
export function generateMembers(count = 50) {
  return Array.from({ length: count }, (_, i) => generateMember(i + 1));
}

// Generate multiple leads
export function generateLeads(count = 30) {
  return Array.from({ length: count }, (_, i) => generateLead(i + 1));
}

// Generate multiple classes
export function generateClasses(count = 20) {
  return Array.from({ length: count }, (_, i) => generateClass(i + 1));
}

// Generate multiple payments
export function generatePayments(count = 100, memberIds = []) {
  return Array.from({ length: count }, (_, i) => {
    const memberId = memberIds.length > 0 ? randomItem(memberIds) : randomInt(1, 50);
    return generatePayment(i + 1, memberId);
  });
}

// Generate multiple attendance records
export function generateAttendanceRecords(count = 200, memberIds = [], classIds = []) {
  return Array.from({ length: count }, (_, i) => {
    const memberId = memberIds.length > 0 ? randomItem(memberIds) : randomInt(1, 50);
    const classId = classIds.length > 0 ? randomItem(classIds) : randomInt(1, 20);
    return generateAttendance(i + 1, memberId, classId);
  });
}

// Generate dashboard data
export function generateDashboardData() {
  const totalMembers = randomInt(80, 150);
  const activeMembers = Math.floor(totalMembers * 0.85);
  const trialMembers = Math.floor(totalMembers * 0.1);
  const totalRevenue = randomInt(15000, 35000);
  const monthlyGrowth = randomInt(-5, 15);

  return {
    stats: {
      totalMembers,
      activeMembers,
      trialMembers,
      totalRevenue,
      monthlyGrowth,
      averageAttendance: randomInt(60, 90),
      classesThisWeek: randomInt(25, 40),
    },
    recentMembers: generateMembers(5),
    recentPayments: generatePayments(5),
    upcomingClasses: generateClasses(5),
  };
}

// Generate chart data
export function generateChartData(type = 'line', points = 12) {
  const labels = [];
  const data = [];

  if (type === 'monthly') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < points; i++) {
      labels.push(months[i]);
      data.push(randomInt(50, 150));
    }
  } else if (type === 'weekly') {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
      labels.push(days[i]);
      data.push(randomInt(20, 80));
    }
  } else {
    for (let i = 0; i < points; i++) {
      labels.push(`Point ${i + 1}`);
      data.push(randomInt(10, 100));
    }
  }

  return { labels, data };
}

// Generate report data
export function generateReportData(reportType) {
  switch (reportType) {
    case 'members':
      return {
        summary: {
          total: randomInt(100, 200),
          active: randomInt(80, 150),
          trial: randomInt(10, 30),
          paused: randomInt(5, 15),
          cancelled: randomInt(5, 20),
        },
        byMembershipType: {
          unlimited: randomInt(40, 80),
          '2x_week': randomInt(20, 40),
          '3x_week': randomInt(15, 30),
          casual: randomInt(10, 25),
        },
        byBeltRank: {
          white: randomInt(50, 100),
          blue: randomInt(20, 40),
          purple: randomInt(10, 25),
          brown: randomInt(5, 15),
          black: randomInt(2, 8),
        },
        growth: generateChartData('monthly', 12),
      };

    case 'revenue':
      return {
        summary: {
          total: randomInt(20000, 50000),
          thisMonth: randomInt(15000, 35000),
          lastMonth: randomInt(15000, 35000),
          growth: randomInt(-10, 20),
        },
        byMonth: generateChartData('monthly', 12),
        byMembershipType: {
          unlimited: randomInt(10000, 25000),
          '2x_week': randomInt(5000, 15000),
          '3x_week': randomInt(3000, 10000),
          casual: randomInt(2000, 8000),
        },
        topPayingMembers: generateMembers(10),
      };

    case 'attendance':
      return {
        summary: {
          totalCheckIns: randomInt(500, 1500),
          averagePerDay: randomInt(20, 60),
          averagePerClass: randomInt(10, 25),
          peakDay: randomItem(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
        },
        byDay: generateChartData('weekly'),
        byClassType: {
          bjj: randomInt(200, 500),
          muay_thai: randomInt(150, 400),
          mma: randomInt(100, 300),
          boxing: randomInt(80, 250),
          wrestling: randomInt(50, 200),
          fitness: randomInt(100, 350),
          kids: randomInt(80, 250),
        },
        topAttendees: generateMembers(10),
      };

    case 'leads':
      return {
        summary: {
          total: randomInt(50, 150),
          new: randomInt(10, 30),
          contacted: randomInt(15, 40),
          converted: randomInt(5, 20),
          conversionRate: randomInt(10, 40),
        },
        bySource: {
          website: randomInt(20, 60),
          facebook: randomInt(15, 45),
          instagram: randomInt(10, 35),
          referral: randomInt(10, 30),
          'walk-in': randomInt(5, 20),
          other: randomInt(5, 15),
        },
        byStatus: {
          new: randomInt(10, 30),
          contacted: randomInt(15, 40),
          qualified: randomInt(10, 25),
          trial_booked: randomInt(8, 20),
          trial_completed: randomInt(5, 15),
          converted: randomInt(5, 20),
          lost: randomInt(10, 30),
        },
        conversionFunnel: generateChartData('line', 7),
      };

    default:
      return {};
  }
}

// Seed complete mock database
export function seedMockData() {
  const members = generateMembers(50);
  const memberIds = members.map(m => m.id);

  const leads = generateLeads(30);
  const classes = generateClasses(20);
  const classIds = classes.map(c => c.id);

  const payments = generatePayments(100, memberIds);
  const attendance = generateAttendanceRecords(200, memberIds, classIds);

  return {
    members,
    leads,
    classes,
    payments,
    attendance,
    dashboard: generateDashboardData(),
  };
}

// Export all generators
export default {
  generateMember,
  generateLead,
  generateClass,
  generatePayment,
  generateAttendance,
  generateMembers,
  generateLeads,
  generateClasses,
  generatePayments,
  generateAttendanceRecords,
  generateDashboardData,
  generateChartData,
  generateReportData,
  seedMockData,
};

// Usage examples:
/*
// Generate single items
import { generateMember, generateLead, generateClass } from './lib/mockData';

const member = generateMember();
const lead = generateLead();
const class = generateClass();

// Generate multiple items
import { generateMembers, generateLeads, generateClasses } from './lib/mockData';

const members = generateMembers(50);
const leads = generateLeads(30);
const classes = generateClasses(20);

// Generate related data
import { generatePayments, generateAttendanceRecords } from './lib/mockData';

const memberIds = members.map(m => m.id);
const classIds = classes.map(c => c.id);

const payments = generatePayments(100, memberIds);
const attendance = generateAttendanceRecords(200, memberIds, classIds);

// Generate dashboard data
import { generateDashboardData } from './lib/mockData';

const dashboardData = generateDashboardData();

// Generate chart data
import { generateChartData } from './lib/mockData';

const monthlyData = generateChartData('monthly', 12);
const weeklyData = generateChartData('weekly');

// Generate report data
import { generateReportData } from './lib/mockData';

const memberReport = generateReportData('members');
const revenueReport = generateReportData('revenue');
const attendanceReport = generateReportData('attendance');
const leadReport = generateReportData('leads');

// Seed entire database
import { seedMockData } from './lib/mockData';

const mockDatabase = seedMockData();
console.log(mockDatabase);

// Use in development API
// api.js
if (process.env.NODE_ENV === 'development') {
  const mockData = seedMockData();

  // Override API calls with mock data
  api.getMembers = () => Promise.resolve(mockData.members);
  api.getLeads = () => Promise.resolve(mockData.leads);
  api.getClasses = () => Promise.resolve(mockData.classes);
}
*/
