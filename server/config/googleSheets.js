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
 * Initialize Google Drive API client using service account credentials.
 * Requires GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env
 */
const getGoogleDriveClient = async () => {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/drive']
    );

    await auth.authorize();

    const drive = google.drive({ version: 'v3', auth });
    return drive;
  } catch (error) {
    console.error('❌ Google Drive Auth Error:', error.message);
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

/**
 * Extract file ID from Google Drive link
 * Supports formats:
 *  - https://drive.google.com/file/d/{FILE_ID}/view
 *  - https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
 *  - https://drive.google.com/open?id={FILE_ID}
 * @param {string} driveLink - Google Drive link
 * @returns {string|null} - File ID or null if not found
 */
const extractFileIdFromUrl = (driveLink) => {
  if (!driveLink || typeof driveLink !== 'string') return null;

  // Format 1: /file/d/{FILE_ID}/view
  const match1 = driveLink.match(/\/file\/d\/([a-zA-Z0-9-_]+)\//);
  if (match1) return match1[1];

  // Format 2: id={FILE_ID}
  const match2 = driveLink.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (match2) return match2[1];

  return null;
};

/**
 * Rename a file in Google Drive
 * @param {string} fileId - Google Drive file ID
 * @param {string} newName - New file name (with extension)
 * @returns {boolean} - True if successful, false otherwise
 */
const renameGoogleDriveFile = async (fileId, newName) => {
  try {
    if (!fileId || !newName) {
      console.warn('⚠️ Missing fileId or newName for rename');
      return false;
    }

    const drive = await getGoogleDriveClient();

    await drive.files.update({
      fileId: fileId,
      requestBody: {
        name: newName,
      },
    });

    console.log(`✅ Renamed file ${fileId} to "${newName}"`);
    return true;
  } catch (error) {
    console.error(
      `❌ Failed to rename file ${fileId}:`,
      error.message
    );
    return false;
  }
};

module.exports = {
  getGoogleSheetsClient,
  getGoogleDriveClient,
  fetchSheetData,
  extractFileIdFromUrl,
  renameGoogleDriveFile,
};
