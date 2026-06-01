// Business Logic Utilities - Gym Management Operations

import {
  MEMBERSHIP_TYPES,
  MEMBERSHIP_STATUS,
  CLASS_TYPES,
  LEAD_STATUS,
  PAYMENT_STATUS,
} from './constants';
import { formatDate, formatCurrency, calculateAge, getDateRange } from './dateUtils';

// Membership pricing
const MEMBERSHIP_PRICES = {
  [MEMBERSHIP_TYPES.UNLIMITED]: 199,
  [MEMBERSHIP_TYPES.THREE_PER_WEEK]: 149,
  [MEMBERSHIP_TYPES.TWO_PER_WEEK]: 99,
  [MEMBERSHIP_TYPES.CASUAL]: 25, // per class
};

// Get membership price
export function getMembershipPrice(membershipType) {
  return MEMBERSHIP_PRICES[membershipType] || 0;
}

// Calculate prorated membership fee
export function calculateProratedFee(membershipType, startDate, billingDate) {
  const basePrice = getMembershipPrice(membershipType);
  const start = new Date(startDate);
  const billing = new Date(billingDate);

  // Calculate days remaining in billing period
  const daysInMonth = new Date(billing.getFullYear(), billing.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.ceil((billing - start) / (1000 * 60 * 60 * 24));

  // Prorate the fee
  const proratedFee = (basePrice / daysInMonth) * daysRemaining;

  return Math.round(proratedFee * 100) / 100;
}

// Calculate membership duration
export function calculateMembershipDuration(joinDate, endDate = new Date()) {
  const start = new Date(joinDate);
  const end = new Date(endDate);

  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  const days = end.getDate() - start.getDate();

  let totalMonths = years * 12 + months;
  if (days < 0) {
    totalMonths--;
  }

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    totalMonths,
    totalDays: Math.ceil((end - start) / (1000 * 60 * 60 * 24)),
  };
}

// Check if membership is active
export function isMembershipActive(member) {
  if (!member) return false;

  const status = member.membershipStatus;
  const endDate = member.membershipEndDate ? new Date(member.membershipEndDate) : null;

  // Check status
  if (status === MEMBERSHIP_STATUS.CANCELLED) return false;
  if (status === MEMBERSHIP_STATUS.PAUSED) return false;

  // Check end date if exists
  if (endDate && endDate < new Date()) return false;

  return status === MEMBERSHIP_STATUS.ACTIVE || status === MEMBERSHIP_STATUS.TRIAL;
}

// Check if member can attend class
export function canAttendClass(member, classType, attendanceThisWeek = 0) {
  if (!isMembershipActive(member)) {
    return {
      canAttend: false,
      reason: 'Membership is not active',
    };
  }

  const membershipType = member.membershipType;

  // Unlimited members can always attend
  if (membershipType === MEMBERSHIP_TYPES.UNLIMITED) {
    return { canAttend: true };
  }

  // Check weekly limits
  if (membershipType === MEMBERSHIP_TYPES.TWO_PER_WEEK && attendanceThisWeek >= 2) {
    return {
      canAttend: false,
      reason: 'Weekly attendance limit reached (2 classes)',
    };
  }

  if (membershipType === MEMBERSHIP_TYPES.THREE_PER_WEEK && attendanceThisWeek >= 3) {
    return {
      canAttend: false,
      reason: 'Weekly attendance limit reached (3 classes)',
    };
  }

  // Casual members need to pay per class
  if (membershipType === MEMBERSHIP_TYPES.CASUAL) {
    return {
      canAttend: true,
      requiresPayment: true,
      amount: MEMBERSHIP_PRICES[MEMBERSHIP_TYPES.CASUAL],
    };
  }

  return { canAttend: true };
}

// Calculate attendance rate
export function calculateAttendanceRate(attendanceRecords, membershipType, dateRange = 'month') {
  if (!attendanceRecords || attendanceRecords.length === 0) {
    return {
      rate: 0,
      attended: 0,
      expected: 0,
    };
  }

  const { startDate, endDate } = getDateRange(dateRange);
  const recordsInRange = attendanceRecords.filter((record) => {
    const date = new Date(record.date);
    return date >= startDate && date <= endDate;
  });

  const attended = recordsInRange.length;

  // Calculate expected attendance based on membership type
  let expected = 0;
  const weeks = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 7));

  switch (membershipType) {
    case MEMBERSHIP_TYPES.UNLIMITED:
      expected = weeks * 5; // Assume 5 classes per week for unlimited
      break;
    case MEMBERSHIP_TYPES.THREE_PER_WEEK:
      expected = weeks * 3;
      break;
    case MEMBERSHIP_TYPES.TWO_PER_WEEK:
      expected = weeks * 2;
      break;
    case MEMBERSHIP_TYPES.CASUAL:
      expected = attended; // No expectation for casual
      break;
    default:
      expected = attended;
  }

  const rate = expected > 0 ? Math.round((attended / expected) * 100) : 0;

  return {
    rate,
    attended,
    expected,
  };
}

// Calculate member lifetime value
export function calculateLifetimeValue(member, payments = []) {
  const totalPaid = payments
    .filter((p) => p.status === PAYMENT_STATUS.SUCCEEDED)
    .reduce((sum, p) => sum + p.amount, 0);

  const duration = calculateMembershipDuration(member.joinDate);
  const monthlyAverage = duration.totalMonths > 0 ? totalPaid / duration.totalMonths : 0;

  return {
    totalPaid,
    monthlyAverage: Math.round(monthlyAverage * 100) / 100,
    duration,
  };
}

// Calculate churn risk score
export function calculateChurnRisk(member, attendanceRecords = [], payments = []) {
  let riskScore = 0;
  const factors = [];

  // Factor 1: Recent attendance (40% weight)
  const recentAttendance = calculateAttendanceRate(attendanceRecords, member.membershipType, 'last_30_days');
  if (recentAttendance.rate < 30) {
    riskScore += 40;
    factors.push('Low attendance rate');
  } else if (recentAttendance.rate < 50) {
    riskScore += 20;
    factors.push('Below average attendance');
  }

  // Factor 2: Payment issues (30% weight)
  const recentPayments = payments.filter((p) => {
    const date = new Date(p.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date >= thirtyDaysAgo;
  });

  const failedPayments = recentPayments.filter((p) => p.status === PAYMENT_STATUS.FAILED);
  if (failedPayments.length > 0) {
    riskScore += 30;
    factors.push('Recent payment failures');
  }

  // Factor 3: Membership duration (15% weight)
  const duration = calculateMembershipDuration(member.joinDate);
  if (duration.totalMonths < 3) {
    riskScore += 15;
    factors.push('New member (< 3 months)');
  }

  // Factor 4: Membership status (15% weight)
  if (member.membershipStatus === MEMBERSHIP_STATUS.PAUSED) {
    riskScore += 15;
    factors.push('Membership paused');
  }

  return {
    score: Math.min(riskScore, 100),
    level: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
    factors,
  };
}

// Calculate lead conversion probability
export function calculateLeadScore(lead, interactions = []) {
  let score = 0;

  // Factor 1: Lead source quality
  const sourceScores = {
    referral: 30,
    website: 20,
    'walk-in': 25,
    facebook: 15,
    instagram: 15,
    other: 10,
  };
  score += sourceScores[lead.source] || 10;

  // Factor 2: Response time
  const createdDate = new Date(lead.createdAt);
  const now = new Date();
  const hoursSinceCreated = (now - createdDate) / (1000 * 60 * 60);

  if (hoursSinceCreated < 24) {
    score += 20;
  } else if (hoursSinceCreated < 48) {
    score += 10;
  }

  // Factor 3: Engagement level
  if (interactions.length >= 3) {
    score += 20;
  } else if (interactions.length >= 1) {
    score += 10;
  }

  // Factor 4: Lead status progression
  const statusScores = {
    [LEAD_STATUS.NEW]: 0,
    [LEAD_STATUS.CONTACTED]: 10,
    [LEAD_STATUS.QUALIFIED]: 20,
    [LEAD_STATUS.TRIAL_BOOKED]: 30,
    [LEAD_STATUS.TRIAL_COMPLETED]: 40,
  };
  score += statusScores[lead.status] || 0;

  // Factor 5: Follow-up scheduled
  if (lead.followUpDate) {
    const followUpDate = new Date(lead.followUpDate);
    if (followUpDate >= now) {
      score += 10;
    }
  }

  return {
    score: Math.min(score, 100),
    probability: Math.min(score, 100) + '%',
    level: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
  };
}

// Calculate class capacity utilization
export function calculateClassUtilization(classInstance, attendees = []) {
  const capacity = classInstance.capacity || 0;
  const attendance = attendees.length;

  const utilizationRate = capacity > 0 ? Math.round((attendance / capacity) * 100) : 0;

  return {
    capacity,
    attendance,
    available: Math.max(0, capacity - attendance),
    utilizationRate,
    isFull: attendance >= capacity,
    status: utilizationRate >= 100 ? 'full' : utilizationRate >= 80 ? 'nearly-full' : 'available',
  };
}

// Calculate instructor workload
export function calculateInstructorWorkload(instructor, classes = []) {
  const instructorClasses = classes.filter((c) => c.instructor === instructor);

  const classesPerWeek = instructorClasses.length;
  const hoursPerWeek = instructorClasses.reduce((total, c) => {
    const start = new Date(`2000-01-01 ${c.startTime}`);
    const end = new Date(`2000-01-01 ${c.endTime}`);
    const hours = (end - start) / (1000 * 60 * 60);
    return total + hours;
  }, 0);

  return {
    classesPerWeek,
    hoursPerWeek: Math.round(hoursPerWeek * 10) / 10,
    workload: hoursPerWeek >= 20 ? 'high' : hoursPerWeek >= 10 ? 'medium' : 'low',
  };
}

// Calculate revenue metrics
export function calculateRevenueMetrics(payments = [], dateRange = 'month') {
  const { startDate, endDate } = getDateRange(dateRange);

  const paymentsInRange = payments.filter((p) => {
    const date = new Date(p.date);
    return date >= startDate && date <= endDate && p.status === PAYMENT_STATUS.SUCCEEDED;
  });

  const totalRevenue = paymentsInRange.reduce((sum, p) => sum + p.amount, 0);
  const averageTransaction = paymentsInRange.length > 0 ? totalRevenue / paymentsInRange.length : 0;

  // Calculate by membership type
  const revenueByType = paymentsInRange.reduce((acc, p) => {
    const type = p.membershipType || 'other';
    acc[type] = (acc[type] || 0) + p.amount;
    return acc;
  }, {});

  // Calculate growth
  const previousRange = getDateRange(dateRange, -1);
  const previousPayments = payments.filter((p) => {
    const date = new Date(p.date);
    return date >= previousRange.startDate && date <= previousRange.endDate && p.status === PAYMENT_STATUS.SUCCEEDED;
  });

  const previousRevenue = previousPayments.reduce((sum, p) => sum + p.amount, 0);
  const growth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    transactionCount: paymentsInRange.length,
    averageTransaction: Math.round(averageTransaction * 100) / 100,
    revenueByType,
    growth: Math.round(growth * 10) / 10,
    previousRevenue: Math.round(previousRevenue * 100) / 100,
  };
}

// Calculate retention rate
export function calculateRetentionRate(members = [], dateRange = 'month') {
  const { startDate, endDate } = getDateRange(dateRange);

  const membersAtStart = members.filter((m) => {
    const joinDate = new Date(m.joinDate);
    return joinDate <= startDate;
  });

  const membersAtEnd = membersAtStart.filter((m) => {
    if (m.membershipStatus === MEMBERSHIP_STATUS.CANCELLED) {
      const cancelDate = m.cancelledAt ? new Date(m.cancelledAt) : null;
      return !cancelDate || cancelDate > endDate;
    }
    return true;
  });

  const retentionRate = membersAtStart.length > 0
    ? Math.round((membersAtEnd.length / membersAtStart.length) * 100)
    : 0;

  const churnRate = 100 - retentionRate;

  return {
    retentionRate,
    churnRate,
    membersAtStart: membersAtStart.length,
    membersAtEnd: membersAtEnd.length,
    membersLost: membersAtStart.length - membersAtEnd.length,
  };
}

// Generate member recommendations
export function generateMemberRecommendations(member, attendanceRecords = [], payments = []) {
  const recommendations = [];

  // Check attendance
  const attendance = calculateAttendanceRate(attendanceRecords, member.membershipType, 'last_30_days');
  if (attendance.rate < 30) {
    recommendations.push({
      type: 'engagement',
      priority: 'high',
      message: 'Low attendance - consider reaching out to re-engage',
      action: 'Send motivational message',
    });
  }

  // Check payment issues
  const recentPayments = payments.slice(-3);
  const hasFailedPayments = recentPayments.some((p) => p.status === PAYMENT_STATUS.FAILED);
  if (hasFailedPayments) {
    recommendations.push({
      type: 'billing',
      priority: 'high',
      message: 'Recent payment failures detected',
      action: 'Update payment method',
    });
  }

  // Check membership upgrade opportunity
  if (member.membershipType !== MEMBERSHIP_TYPES.UNLIMITED && attendance.rate > 80) {
    recommendations.push({
      type: 'upsell',
      priority: 'medium',
      message: 'High attendance - consider upgrading to unlimited',
      action: 'Offer membership upgrade',
    });
  }

  // Check trial conversion
  if (member.membershipStatus === MEMBERSHIP_STATUS.TRIAL) {
    const duration = calculateMembershipDuration(member.joinDate);
    if (duration.totalDays >= 7) {
      recommendations.push({
        type: 'conversion',
        priority: 'high',
        message: 'Trial period ending soon',
        action: 'Follow up for membership conversion',
      });
    }
  }

  // Check churn risk
  const churnRisk = calculateChurnRisk(member, attendanceRecords, payments);
  if (churnRisk.level === 'high') {
    recommendations.push({
      type: 'retention',
      priority: 'high',
      message: `High churn risk: ${churnRisk.factors.join(', ')}`,
      action: 'Schedule retention call',
    });
  }

  return recommendations;
}

// Export all business logic functions
export default {
  getMembershipPrice,
  calculateProratedFee,
  calculateMembershipDuration,
  isMembershipActive,
  canAttendClass,
  calculateAttendanceRate,
  calculateLifetimeValue,
  calculateChurnRisk,
  calculateLeadScore,
  calculateClassUtilization,
  calculateInstructorWorkload,
  calculateRevenueMetrics,
  calculateRetentionRate,
  generateMemberRecommendations,
};
