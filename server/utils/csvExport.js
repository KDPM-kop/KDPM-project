/**
 * CSV Export Utility
 * Converts member data array to CSV string
 */

const CSV_HEADERS = [
  'Full Name',
  'Email',
  'Phone',
  'Qualification',
  'Specialization',
  'Address',
  'Membership Start',
  'Membership End',
  'Status',
  'Source',
  'Created At',
];

const FIELD_MAP = [
  'fullName',
  'email',
  'phone',
  'qualification',
  'specialization',
  'address',
  'membershipStartDate',
  'membershipEndDate',
  'membershipStatus',
  'source',
  'createdAt',
];

/**
 * Escape a CSV field value
 */
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Format date for CSV
 */
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * Convert array of member objects to CSV string
 */
const exportToCSV = (members) => {
  const rows = [CSV_HEADERS.join(',')];

  for (const member of members) {
    const row = FIELD_MAP.map((field) => {
      const value = member[field];
      if (
        field === 'membershipStartDate' ||
        field === 'membershipEndDate' ||
        field === 'createdAt'
      ) {
        return escapeCSV(formatDate(value));
      }
      return escapeCSV(value);
    });
    rows.push(row.join(','));
  }

  return rows.join('\n');
};

module.exports = { exportToCSV };
