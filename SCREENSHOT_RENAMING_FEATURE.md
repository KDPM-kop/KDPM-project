# Payment Screenshot Auto-Renaming Feature

## Overview
When Google Form submissions are synced to the system, payment screenshot files uploaded by members are now automatically renamed to the member's name (extracted from the form).

**Example:**
- Original file name: `1234.jpg`
- Person's name from form: `John`
- Renamed to: `John.jpg`

## How It Works

### 1. **File ID Extraction**
When a Google Form file is submitted, it's automatically uploaded to Google Drive and a shareable link is provided in the form response. The system extracts the file ID from this link.

Supported link formats:
- `https://drive.google.com/file/d/{FILE_ID}/view`
- `https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing`
- `https://drive.google.com/open?id={FILE_ID}`

### 2. **Automatic Renaming**
During the Google Sheet sync process (`/api/sheets/sync`), for each member:
1. The full name is extracted from the form data
2. The payment screenshot URL is processed
3. The file ID is extracted from the URL
4. The Google Drive file is renamed to: `{PersonName}.jpg`
5. The system logs the renaming operation

### 3. **When It Happens**
The renaming occurs in two scenarios:
- **New Members**: When a new verified member is imported from the Google Sheet
- **Updated Members**: When an existing member's data is updated with a new screenshot

## Technical Implementation

### Modified Files

#### `server/config/googleSheets.js`
Added three new functions:
- `getGoogleDriveClient()` - Initializes the Google Drive API client
- `extractFileIdFromUrl(driveLink)` - Extracts file ID from Google Drive links
- `renameGoogleDriveFile(fileId, newName)` - Renames files in Google Drive

#### `server/routes/sheets.js`
- Added imports for the new functions
- Added `renamePaymentScreenshot(url, personName)` helper function
- Updated the sync endpoint to call the renaming function for:
  - Existing members (when updated)
  - New members (when created)

## Requirements

The following environment variables must be properly configured:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Service account email
- `GOOGLE_PRIVATE_KEY` - Service account private key
- `GOOGLE_SHEET_ID` - Google Sheet ID

The service account must have permissions to:
- Read Google Sheets (`spreadsheets.readonly`)
- Modify Google Drive files (`drive`)

## Error Handling

If renaming fails, the system will:
1. Log a warning/error message in the console
2. Continue processing other members
3. Not block the sync process

Common reasons for failure:
- Invalid file ID or URL format
- Service account doesn't have permission to access the file
- File has been deleted or moved

## File Naming Convention

All payment screenshots are renamed with the format: `{personName}.jpg`

Examples:
- `Dr. Smith John.jpg` (if formatted as "Dr. Lastname Firstname")
- `John Smith.jpg` (if full name is provided)
- `John.jpg` (if only first name is provided)

The filename uses exactly the name as extracted and formatted from the Google Form, preserving spaces and special characters.

## Testing

To test this feature:
1. Ensure your Google Form has a "Screenshot of Payment" file upload field
2. Ensure your Google Sheet has a "Verified" column set to "yes" for test entries
3. Submit a test form response
4. Call `/api/sheets/sync` endpoint
5. Check the Google Drive folder - the file should now be renamed to the person's name
6. Check the server logs for confirmation messages like: `✅ Renamed file {FILE_ID} to "John.jpg"`
