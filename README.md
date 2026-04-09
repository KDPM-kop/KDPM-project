# KDPM Medical Association — Member Management System

A full-stack web application for managing medical association members with admin dashboard, Google Sheets integration, automated email notifications, and CSV export.

## 🏥 Features

- **Admin-Only Access** — Single admin login with JWT authentication
- **Member Management** — Full CRUD operations for member records
- **Dashboard** — Statistics overview with animated counters
- **Search & Filter** — Search by name, email, phone; filter by membership status
- **Google Sheets Sync** — Import member data from Google Forms responses
- **Email Notifications** — Automated emails via Brevo (Sendinblue) SMTP
  - 7-day expiry reminder
  - Membership expired notification
  - Renewal confirmation
- **Daily Cron Job** — Automated membership status checks at midnight
- **CSV Export** — Download all member data as CSV
- **Manual Reminder** — Send reminder emails to individual members
- **Responsive UI** — Works on desktop and mobile devices

## 📋 Prerequisites

- **Node.js** v18+ and npm
- **MongoDB Atlas** account (connection string provided)
- **Brevo (Sendinblue)** account for email (optional, can be configured later)
- **Google Cloud** service account with Sheets API enabled (optional)

## 🚀 Quick Start

### 1. Clone / Navigate to project
```bash
cd "e:\KDPM project"
```

### 2. Configure environment
```bash
# Copy the example env file
copy .env.example server\.env

# Edit server\.env with your actual values:
# - Replace <db_password> in MONGODB_URI
# - Set ADMIN_EMAIL and ADMIN_PASSWORD
# - Add Brevo SMTP credentials (optional)
# - Add Google Sheets credentials (optional)
```

### 3. Install dependencies
```bash
cd server
npm install
```

### 4. Start the server
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

### 5. Open in browser
```
http://localhost:5000
```

### 6. Login with admin credentials
- **Email**: `admin@kdpm.org` (or whatever you set in .env)
- **Password**: `admin123` (or whatever you set in .env)

## 📁 Project Structure

```
KDPM project/
├── server/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── googleSheets.js    # Google Sheets API config
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── models/
│   │   └── Member.js          # Mongoose member schema
│   ├── routes/
│   │   ├── auth.js            # Admin login endpoint
│   │   ├── members.js         # Member CRUD + stats + CSV
│   │   └── sheets.js          # Google Sheets sync
│   ├── services/
│   │   ├── emailService.js    # Brevo SMTP email module
│   │   └── cronService.js     # Daily membership checker
│   ├── utils/
│   │   └── csvExport.js       # CSV generation utility
│   ├── server.js              # Express entry point
│   ├── package.json
│   └── .env                   # Environment variables
├── client/
│   ├── index.html             # Login page
│   ├── dashboard.html         # Admin dashboard
│   ├── members.html           # Members list (table view)
│   ├── member-detail.html     # Single member view/edit
│   ├── css/
│   │   └── styles.css         # Complete design system
│   └── js/
│       ├── auth.js            # Auth service & utilities
│       ├── dashboard.js       # Dashboard logic
│       ├── members.js         # Members list logic
│       └── member-detail.js   # Member detail/edit logic
├── .env.example               # Environment template
└── README.md                  # This file
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/auth/verify` | Verify JWT token |

### Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/members` | List members (search, filter, paginate) |
| GET | `/api/members/stats` | Dashboard statistics |
| GET | `/api/members/export/csv` | Export all members to CSV |
| GET | `/api/members/:id` | Get single member |
| POST | `/api/members` | Create new member |
| PUT | `/api/members/:id` | Update member |
| DELETE | `/api/members/:id` | Delete member |
| POST | `/api/members/:id/send-reminder` | Send manual reminder email |

### Google Sheets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sheets/sync` | Sync data from Google Sheet |

## 📧 Email Configuration (Brevo)

1. Sign up at [brevo.com](https://www.brevo.com)
2. Go to **SMTP & API** settings
3. Copy your SMTP credentials
4. Update `.env`:
   ```
   BREVO_SMTP_USER=your_login_email
   BREVO_SMTP_PASS=your_smtp_key
   EMAIL_FROM=your_verified_sender@domain.com
   ```

## 📊 Google Sheets Integration

1. Create a Google Cloud project
2. Enable **Google Sheets API**
3. Create a **Service Account** and download the JSON key
4. Share your Google Sheet with the service account email
5. Update `.env`:
   ```
   GOOGLE_SHEET_ID=your_sheet_id
   GOOGLE_SERVICE_ACCOUNT_EMAIL=sa@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   ```

### Expected Google Sheet Columns
| Column Header | Maps To |
|--------------|---------|
| Full Name / Name | fullName |
| Email / Email Address | email |
| Phone / Phone Number / Mobile | phone |
| Qualification | qualification |
| Specialization / Specialty | specialization |
| Address | address |

## 🔐 Security

- JWT-based authentication for all API routes
- Password hashing with bcrypt (12 rounds)
- CORS enabled
- Admin credentials stored in environment variables
- Unique email/phone constraint prevents duplicate entries

## ⏰ Cron Jobs

The system runs a daily cron job at midnight that:
1. Finds members expiring within 7 days → sends reminder + sets status to `pending_renewal`
2. Finds members past expiry → sends expired notification + sets status to `expired`
3. Avoids re-sending emails within 24 hours

## 📝 License

Private — KDPM Medical Association
