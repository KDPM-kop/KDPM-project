const express = require('express');
const Member = require('../models/Member');
const authMiddleware = require('../middleware/auth');
const { exportToCSV } = require('../utils/csvExport');
const { sendManualReminder } = require('../services/emailService');
const router = express.Router();

// All routes require auth
router.use(authMiddleware);

/**
 * GET /api/members/stats
 * Dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();

    const [total, active, expired, pendingRenewal, recentMembers] =
      await Promise.all([
        Member.countDocuments(),
        Member.countDocuments({ membershipStatus: 'active' }),
        Member.countDocuments({ membershipStatus: 'expired' }),
        Member.countDocuments({ membershipStatus: 'pending_renewal' }),
        Member.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('fullName email specialization membershipStatus createdAt'),
      ]);

    // Monthly registrations (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await Member.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        expired,
        pendingRenewal,
        recentMembers,
        monthlyData,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
});

/**
 * GET /api/members/export/csv
 * Export all members to CSV
 */
router.get('/export/csv', async (req, res) => {
  try {
    const members = await Member.find().lean();
    const csv = exportToCSV(members);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=members_${Date.now()}.csv`
    );
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to export CSV.' });
  }
});

/**
 * GET /api/members
 * List all members with search, filter, pagination
 * Query params: search, status, page, limit, sortBy, sortOrder
 */
router.get('/', async (req, res) => {
  try {
    const {
      search,
      status,
      specialization,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    // Search by name, email, or specialization
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by status
    if (status && status !== 'all') {
      query.membershipStatus = status;
    }

    // Filter by specialization
    if (specialization) {
      query.specialization = { $regex: specialization, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [members, total] = await Promise.all([
      Member.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Member.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        members,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('List members error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch members.' });
  }
});

/**
 * GET /api/members/:id
 * Get single member
 */
router.get('/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: 'Member not found.' });
    }
    res.json({ success: true, data: member });
  } catch (error) {
    console.error('Get member error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch member.' });
  }
});

/**
 * POST /api/members
 * Create new member
 */
router.post('/', async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      qualification,
      specialization,
      address,
      membershipStartDate,
      membershipEndDate,
      notes,
    } = req.body;

    // Check for duplicate email or phone
    const existing = await Member.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
    });

    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'email' : 'phone';
      return res.status(409).json({
        success: false,
        message: `A member with this ${field} already exists.`,
      });
    }

    const member = new Member({
      fullName,
      email,
      phone,
      qualification,
      specialization,
      address,
      membershipStartDate: membershipStartDate || new Date(),
      membershipEndDate,
      notes,
      source: 'manual',
    });

    await member.save();

    res.status(201).json({
      success: true,
      message: 'Member created successfully.',
      data: member,
    });
  } catch (error) {
    console.error('Create member error:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A member with this email or phone already exists.',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create member.',
    });
  }
});

/**
 * PUT /api/members/:id
 * Update member
 */
router.put('/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: 'Member not found.' });
    }

    const allowedFields = [
      'fullName',
      'email',
      'phone',
      'qualification',
      'specialization',
      'address',
      'membershipStartDate',
      'membershipEndDate',
      'membershipStatus',
      'notes',
      'profilePhoto',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        member[field] = req.body[field];
      }
    });

    await member.save();

    res.json({
      success: true,
      message: 'Member updated successfully.',
      data: member,
    });
  } catch (error) {
    console.error('Update member error:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A member with this email or phone already exists.',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update member.',
    });
  }
});

/**
 * DELETE /api/members/:id
 * Delete member
 */
router.delete('/:id', async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: 'Member not found.' });
    }
    res.json({ success: true, message: 'Member deleted successfully.' });
  } catch (error) {
    console.error('Delete member error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to delete member.' });
  }
});

/**
 * POST /api/members/:id/send-reminder
 * Manually send reminder email to a member
 */
router.post('/:id/send-reminder', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: 'Member not found.' });
    }

    await sendManualReminder(member);

    member.lastReminderSent = new Date();
    await member.save();

    res.json({
      success: true,
      message: `Reminder sent to ${member.email} successfully.`,
    });
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reminder. Check email configuration.',
    });
  }
});

module.exports = router;
