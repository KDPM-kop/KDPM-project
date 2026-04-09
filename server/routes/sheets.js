const express = require('express');
const Member = require('../models/Member');
const authMiddleware = require('../middleware/auth');
const { fetchSheetData } = require('../config/googleSheets');
const router = express.Router();

router.use(authMiddleware);

/**
 * Column mapping — maps Google Sheet headers to Member model fields
 * Adjust these to match your actual Google Form/Sheet column headers
 */
const COLUMN_MAP = {
  'full name': 'fullName',
  'name': 'fullName',
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
  'special interests in which b (patho/micro/biochem/immunohematology / any other)': 'specialInterests',
  'hobbies': 'hobbies',
  'profile pic': 'profilePicLink',
  'designation': 'designation',
  'mmc no': 'mmcNumber',
  'laboratory attachments': 'labAttachments',
  'dob': 'dob',
  'sex': 'gender',
  'screenshot of payment': 'paymentScreenshot'
};

/**
 * Map raw sheet row to member fields
 */
function mapRowToMember(row) {
  const member = {};

  Object.keys(row).forEach((key) => {
    const normalizedKey = key.toLowerCase().trim();
    const modelField = COLUMN_MAP[normalizedKey];
    if (modelField && row[key]) {
      member[modelField] = row[key].trim();
    }
  });

  return member;
}

/**
 * POST /api/sheets/sync
 * Fetch data from Google Sheet and import new members
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
        data: { imported: 0, skipped: 0, errors: 0 },
      });
    }

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails = [];

    for (const row of sheetData) {
      try {
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
          // Parse membership type text from sheet (e.g., handles "Life Membership (₹3000)")
          if (memberData.membershipType && memberData.membershipType.toLowerCase().includes('life')) {
             memberData.membershipType = 'Lifetime Membership';
          } else if (memberData.membershipType) {
             memberData.membershipType = 'Temporary Membership';
          }

          // Update existing member
          await Member.updateOne({ _id: existing._id }, { $set: memberData });
          skipped++; // Increment skipped or imported? Let's just track it as skipped (from creating duplicate), but it's really an update.
          continue;
        }

        // Parse membership type text from sheet (e.g., handles "Life Membership (₹3000)")
        if (memberData.membershipType && memberData.membershipType.toLowerCase().includes('life')) {
           memberData.membershipType = 'Lifetime Membership';
        } else {
           memberData.membershipType = 'Temporary Membership';
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
        imported++;
      } catch (rowError) {
        errors++;
        errorDetails.push({
          row,
          reason: rowError.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Sync complete. Imported: ${imported}, Skipped (duplicates): ${skipped}, Errors: ${errors}`,
      data: {
        imported,
        skipped,
        errors,
        total: sheetData.length,
        errorDetails: errorDetails.slice(0, 10), // Limit error details
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

module.exports = router;
