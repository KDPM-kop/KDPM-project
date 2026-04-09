const cron = require('node-cron');
const Member = require('../models/Member');
const {
  sendExpiryReminder,
  sendExpiredNotification,
} = require('./emailService');

/**
 * Daily Cron Job — runs at midnight every day
 * Checks membership end dates and triggers emails:
 * - 7 days before expiry: send reminder, set status to pending_renewal
 * - Past expiry: send expired notification, set status to expired
 */
const initCronJobs = () => {
  // Run daily at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Running daily membership check cron job...');

    try {
      const now = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // 1. Find members expiring in the next 7 days (not already notified recently)
      const expiringMembers = await Member.find({
        membershipStatus: { $in: ['active', 'pending_renewal'] },
        membershipEndDate: {
          $gte: now,
          $lte: sevenDaysFromNow,
        },
        $or: [
          { lastReminderSent: null },
          {
            lastReminderSent: {
              $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Not sent in last 24h
            },
          },
        ],
      });

      console.log(
        `📋 Found ${expiringMembers.length} members expiring within 7 days.`
      );

      for (const member of expiringMembers) {
        try {
          await sendExpiryReminder(member);
          member.membershipStatus = 'pending_renewal';
          member.lastReminderSent = new Date();
          await member.save();
          console.log(`  ✅ Reminder sent to ${member.email}`);
        } catch (emailErr) {
          console.error(
            `  ❌ Failed to send reminder to ${member.email}:`,
            emailErr.message
          );
        }
      }

      // 2. Find members whose membership has expired
      const expiredMembers = await Member.find({
        membershipStatus: { $in: ['active', 'pending_renewal'] },
        membershipEndDate: { $lt: now },
      });

      console.log(
        `📋 Found ${expiredMembers.length} members with expired memberships.`
      );

      for (const member of expiredMembers) {
        try {
          await sendExpiredNotification(member);
          member.membershipStatus = 'expired';
          member.lastReminderSent = new Date();
          await member.save();
          console.log(`  ✅ Expiry notification sent to ${member.email}`);
        } catch (emailErr) {
          console.error(
            `  ❌ Failed to send expiry notification to ${member.email}:`,
            emailErr.message
          );
        }
      }

      console.log('✅ Daily membership check complete.');
    } catch (error) {
      console.error('❌ Cron job error:', error);
    }
  });

  console.log('🕐 Daily membership check cron job scheduled (midnight).');
};

module.exports = { initCronJobs };
