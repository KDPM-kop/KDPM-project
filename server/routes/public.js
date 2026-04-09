const express = require('express');
const Member = require('../models/Member');
const router = express.Router();

/**
 * GET /api/public/members
 * Fetch all members for the public directory.
 * Excludes sensitive information like email and phone.
 */
router.get('/members', async (req, res) => {
  try {
    const members = await Member.find({ membershipStatus: 'active' })
      .select('fullName qualification specialization address membershipType notes profilePhoto profilePicLink designation mmcNumber labAttachments hobbies specialInterests gender')
      .sort({ fullName: 1 });

    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error('Error fetching public members:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching members',
    });
  }
});

module.exports = router;
