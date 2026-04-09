const { google } = require('googleapis');

/**
 * Initialize Google Sheets API client using service account credentials.
 * Requires GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env
 */
const getGoogleSheetsClient = async () => {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );

    await auth.authorize();

    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
  } catch (error) {
    console.error('❌ Google Sheets Auth Error:', error.message);
    throw error;
  }
};

/**
 * Fetch all rows from the configured Google Sheet
 * @param {string} range - Sheet range (e.g., 'Sheet1!A:G')
 * @returns {Array} rows of data
 */
const fetchSheetData = async (range = "'Form Responses 1'!A:ZZ") => {
  const sheets = await getGoogleSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    console.log('No data found in Google Sheet.');
    return [];
  }

  // First row is headers, rest is data
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const data = rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ? row[i].trim() : '';
    });
    return obj;
  });

  return data;
};

module.exports = { getGoogleSheetsClient, fetchSheetData };
