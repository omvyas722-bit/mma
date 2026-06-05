// Export Utilities - CSV and Excel Generation
export function exportToCSV(data, filename = 'export.csv', columns = null) {
  if (!data || data.length === 0) {
    if (import.meta.env.DEV) console.warn('No data to export');
    return;
  }

  // Determine columns
  const headers = columns || Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    // Header row
    headers.map(escapeCSVValue).join(','),
    // Data rows
    ...data.map(row =>
      headers.map(header => escapeCSVValue(row[header])).join(',')
    )
  ].join('\n');

  // Create and download file
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportToJSON(data, filename = 'export.json') {
  if (!data) {
    if (import.meta.env.DEV) console.warn('No data to export');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
}

export function exportMembersToCSV(members) {
  const data = members.map(member => ({
    'First Name': member.first_name,
    'Last Name': member.last_name,
    'Email': member.email,
    'Phone': member.phone,
    'Status': member.membership_status,
    'Type': member.membership_type,
    'Location': member.location,
    'Joined Date': member.joined_date,
    'Belt Rank': member.belt_rank || 'N/A',
  }));

  exportToCSV(data, `members-${getDateString()}.csv`);
}

export function exportAttendanceToCSV(attendance) {
  const data = attendance.map(record => ({
    'Date': record.date,
    'Member': record.member_name,
    'Class': record.class_name,
    'Time': record.start_time,
    'Checked In': new Date(record.checked_in_at).toLocaleString(),
  }));

  exportToCSV(data, `attendance-${getDateString()}.csv`);
}

export function exportPaymentsToCSV(payments) {
  const data = payments.map(payment => ({
    'Date': payment.created_at,
    'Member': payment.member_name,
    'Description': payment.description,
    'Amount': payment.amount,
    'Status': payment.status,
    'Transaction ID': payment.transaction_id || 'N/A',
  }));

  exportToCSV(data, `payments-${getDateString()}.csv`);
}

export function exportLeadsToCSV(leads) {
  const data = leads.map(lead => ({
    'First Name': lead.first_name,
    'Last Name': lead.last_name,
    'Email': lead.email || 'N/A',
    'Phone': lead.phone,
    'Source': lead.source,
    'Status': lead.status,
    'Location Preference': lead.location_preference || 'N/A',
    'Interests': lead.interests || 'N/A',
    'Created': lead.created_at,
  }));

  exportToCSV(data, `leads-${getDateString()}.csv`);
}

export function exportClassScheduleToCSV(classes) {
  const data = classes.map(classItem => ({
    'Class Name': classItem.name,
    'Type': classItem.class_type,
    'Instructor': classItem.instructor,
    'Day': getDayName(classItem.day_of_week),
    'Start Time': classItem.start_time,
    'End Time': classItem.end_time,
    'Location': classItem.location,
    'Capacity': classItem.max_capacity || 'Unlimited',
  }));

  exportToCSV(data, `class-schedule-${getDateString()}.csv`);
}

// Helper functions
function escapeCSVValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayName(dayNumber) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || 'Unknown';
}

// Advanced export with custom formatting
export function exportWithTemplate(data, template, filename) {
  const formattedData = data.map(row => {
    const formattedRow = {};
    for (const [key, formatter] of Object.entries(template)) {
      formattedRow[key] = typeof formatter === 'function' ? formatter(row) : row[formatter];
    }
    return formattedRow;
  });

  exportToCSV(formattedData, filename);
}

// Batch export - export multiple datasets to separate files
export function batchExport(exports) {
  exports.forEach(({ data, filename, type = 'csv' }) => {
    if (type === 'csv') {
      exportToCSV(data, filename);
    } else if (type === 'json') {
      exportToJSON(data, filename);
    }
  });
}

