const express = require('express');
const Member = require('../models/Member');
const authMiddleware = require('../middleware/auth');
const {
  fetchSheetData,
  extractFileIdFromUrl,
  renameGoogleDriveFile,
} = require('../config/googleSheets');
const router = express.Router();

router.use(authMiddleware);

/**
 * Column mapping — maps Google Sheet headers to Member model fields
 * Uses exact match (after lowercasing + trimming)
 */
const COLUMN_MAP = {
  'full name': 'fullName',
  'name': 'fullName',
  'first name': '_firstName',
  'firstname': '_firstName',
  'last name': '_lastName',
  'lastname': '_lastName',
  'surname': '_lastName',
  'email': 'email',
  'email address': 'email',
  'phone': 'phone',
  'phone number': 'phone',
  'mobile': 'phone',
  'mobile number': 'phone',
  'qualification': 'qualification',
  'specialization': 'specialization',
  'specialty': 'specialization',
  'address': 'address',
  'membership': 'membershipType',
  'hobbies': 'hobbies',
  'profile pic': 'profilePicLink',
  'designation': 'designation',
  'designation at primary association': 'designation',
  'primary association': 'primaryAssociation',
  'primary association (gov/private, institution/lab)': 'primaryAssociation',
  'mmc no': 'mmcNumber',
  'laboratory attachments': 'labAttachments',
  'dob': 'dob',
  'sex': 'gender',
  'screenshot of payment': 'paymentScreenshot',
  'verified': '_verified',
};

/**
 * Check if a row is verified (the "Verified" column must contain "yes")
 */
function isRowVerified(row) {
  for (const key of Object.keys(row)) {
    if (key.toLowerCase().trim() === 'verified') {
      const val = (row[key] || '').toLowerCase().trim();
      return val === 'yes';
    }
  }
  return false;
}

/**
 * Format name as "Dr. Lastname Firstname"
 * Handles:
 *  - Separate first/last name fields
 *  - Full name crammed into the "First Name" field (common in the form)
 *  - Names that already start with "Dr." or "Dr"
 */
function formatDoctorName(memberData) {
  let firstName = (memberData._firstName || '').trim();
  let lastName = (memberData._lastName || '').trim();

  // If we have BOTH first and last name fields filled in
  if (firstName && lastName) {
    // Strip existing Dr. prefix from either
    firstName = firstName.replace(/^dr\.?\s*/i, '').trim();
    lastName = lastName.replace(/^dr\.?\s*/i, '').trim();
    return `Dr. ${lastName} ${firstName}`;
  }

  // Otherwise, treat whichever name field we have as a full name
  let nameToProcess = firstName || lastName || memberData.fullName || '';
  if (!nameToProcess) return '';

  // Strip any existing "Dr." / "Dr " prefix to avoid duplication
  nameToProcess = nameToProcess.replace(/^dr\.?\s*/i, '').trim();

  const parts = nameToProcess.split(/\s+/).filter(p => p.length > 0);

  if (parts.length === 0) return '';
  if (parts.length === 1) return `Dr. ${parts[0]}`;

  // Last word → surname, everything else → first/middle names
  const last = parts[parts.length - 1];
  const first = parts.slice(0, parts.length - 1).join(' ');
  return `Dr. ${last} ${first}`;
}

/**
 * Rename payment screenshot file to person's name
 * Extracts file ID from Google Drive link and renames the file
 * @param {string} paymentScreenshotUrl - Google Drive link to the screenshot
 * @param {string} personName - Name to rename the file to
 * @returns {Promise<boolean>} - True if successful or if no URL provided
 */
async function renamePaymentScreenshot(paymentScreenshotUrl, personName) {
  if (!paymentScreenshotUrl || !personName) {
    return true; // Skip silently if no URL or name
  }

  try {
    const fileId = extractFileIdFromUrl(paymentScreenshotUrl);
    if (!fileId) {
      console.warn(
        `⚠️ Could not extract file ID from URL: ${paymentScreenshotUrl}`
      );
      return false;
    }

    // Get file extension by checking the original file
    // Default to .jpg if we can't determine
    const newFileName = `${personName}.jpg`;

    const renamed = await renameGoogleDriveFile(fileId, newFileName);
    return renamed;
  } catch (error) {
    console.error(`❌ Error renaming payment screenshot for ${personName}:`, error.message);
    return false;
  }
}

/**
 * Map raw sheet row to member fields.
 * Handles exact COLUMN_MAP matches + partial-match patterns for columns
 * whose headers vary (e.g. "Designation (Gov/Pvt)", "Laboratory Attachment-1").
 */
function mapRowToMember(row) {
  const member = {};

  Object.keys(row).forEach((key) => {
    const normalizedKey = key.toLowerCase().trim();

    // 1) Try exact match from COLUMN_MAP
    let modelField = COLUMN_MAP[normalizedKey];

    // 2) Partial-match fallbacks for columns with variable suffixes
    if (!modelField) {
      if (normalizedKey.startsWith('primary association')) {
        modelField = 'primaryAssociation';
      } else if (normalizedKey.startsWith('designation')) {
        modelField = 'designation';
      } else if (normalizedKey.startsWith('special interest')) {
        modelField = 'specialInterests';
      } else if (normalizedKey.startsWith('laboratory attachment')) {
        // Combine all "Laboratory Attachment-N" columns into one field
        if (row[key] && row[key].trim()) {
          member.labAttachments = member.labAttachments
            ? member.labAttachments + ', ' + row[key].trim()
            : row[key].trim();
        }
        return; // handled — skip normal assignment
      }
    }

    if (modelField && row[key] && row[key].trim()) {
      member[modelField] = row[key].trim();
    }
  });

  // Build the formatted full name: "Dr. Lastname Firstname"
  member.fullName = formatDoctorName(member);

  // Clean up temporary fields that are not part of the Member model
  delete member._firstName;
  delete member._lastName;
  delete member._verified;

  return member;
}

/**
 * POST /api/sheets/sync
 * Fetch data from Google Sheet and import new members.
 * Only imports rows where the "Verified" column is "yes".
 */
router.post('/sync', async (req, res) => {
  try {
    // Check if Google Sheets is configured
    if (
      !process.env.GOOGLE_SHEET_ID ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Google Sheets is not configured. Please set GOOGLE_SHEET_ID and service account credentials in .env',
      });
    }

    const sheetData = await fetchSheetData();

    if (sheetData.length === 0) {
      return res.json({
        success: true,
        message: 'No data found in Google Sheet.',
        data: { imported: 0, skipped: 0, errors: 0, unverified: 0 },
      });
    }

    let imported = 0;
    let skipped = 0; // Means updated
    let errors = 0;
    let unverified = 0;
    const errorDetails = [];
    const processedMemberIds = []; // Track IDs of members present in the sheet

    for (const row of sheetData) {
      try {
        // --- VERIFIED CHECK ---
        if (!isRowVerified(row)) {
          unverified++;
          continue;
        }

        const memberData = mapRowToMember(row);

        // Validate required fields
        if (!memberData.fullName || !memberData.email || !memberData.phone) {
          errors++;
          errorDetails.push({
            row,
            reason: 'Missing required fields (name, email, or phone)',
          });
          continue;
        }

        // Check for duplicates by email or phone
        const existing = await Member.findOne({
          $or: [
            { email: memberData.email.toLowerCase() },
            { phone: memberData.phone },
          ],
        });

        if (existing) {
          // Parse membership type
          if (memberData.membershipType && memberData.membershipType.toLowerCase().includes('life')) {
             memberData.membershipType = 'Lifetime Membership';
          } else if (memberData.membershipType) {
             memberData.membershipType = 'Temporary Membership';
          }

          // Rename payment screenshot if present
          if (memberData.paymentScreenshot) {
            await renamePaymentScreenshot(memberData.paymentScreenshot, memberData.fullName);
          }

          // Update existing member with latest data and ensure source is google_sheet
          await Member.updateOne({ _id: existing._id }, { $set: { ...memberData, source: 'google_sheet' } });
          processedMemberIds.push(existing._id);
          skipped++;
          continue;
        }

        // Parse membership type
        if (memberData.membershipType && memberData.membershipType.toLowerCase().includes('life')) {
           memberData.membershipType = 'Lifetime Membership';
        } else {
           memberData.membershipType = 'Temporary Membership';
        }

        // Rename payment screenshot if present
        if (memberData.paymentScreenshot) {
          await renamePaymentScreenshot(memberData.paymentScreenshot, memberData.fullName);
        }

        // Create new member
        const member = new Member({
          ...memberData,
          membershipStartDate: new Date(),
          membershipEndDate: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1)
          ),
          source: 'google_sheet',
        });

        await member.save();
        processedMemberIds.push(member._id);
        imported++;
      } catch (rowError) {
        errors++;
        errorDetails.push({
          row,
          reason: rowError.message,
        });
      }
    }

    // --- DELETION LOGIC ---
    // Remove members who were originally from google_sheet but are no longer present
    const deleteResult = await Member.deleteMany({
      source: 'google_sheet',
      _id: { $nin: processedMemberIds },
    });
    const deletedCount = deleteResult.deletedCount;

    res.json({
      success: true,
      message: `Sync complete. Imported: ${imported}, Updated: ${skipped}, Deleted: ${deletedCount}, Unverified (skipped): ${unverified}, Errors: ${errors}`,
      data: {
        imported,
        updated: skipped, // Returning skipped as updated for clarity
        deleted: deletedCount,
        unverified,
        errors,
        totalInSheet: sheetData.length,
        errorDetails: errorDetails.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Sheet sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync Google Sheet: ' + error.message,
    });
  }
});

/**
 * GET /api/sheets/preview
 * Debug endpoint — returns raw column headers and first 3 rows from the sheet
 */
router.get('/preview', async (req, res) => {
  try {
    const sheetData = await fetchSheetData();
    const headers = sheetData.length > 0 ? Object.keys(sheetData[0]) : [];
    const sampleRows = sheetData.slice(0, 3);

    res.json({
      success: true,
      data: {
        totalRows: sheetData.length,
        headers,
        sampleRows,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to preview sheet: ' + error.message,
    });
  }
});

module.exports = router;
