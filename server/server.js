require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { initCronJobs } = require('./services/cronService');

// Import routes
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const sheetsRoutes = require('./routes/sheets');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'client')));

// API Routes
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/sheets', sheetsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'KDPM Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend for all non-API routes (SPA-style)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize cron jobs
    initCronJobs();

    app.listen(PORT, () => {
      console.log(`\n🏥 KDPM Medical Association Server`);
      console.log(`   ➜ Local:   http://localhost:${PORT}`);
      console.log(`   ➜ API:     http://localhost:${PORT}/api`);
      console.log(`   ➜ Health:  http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
