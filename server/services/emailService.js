const nodemailer = require('nodemailer');

/**
 * Reusable Email Service using Brevo SMTP
 */

// Create transporter (reusable)
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.BREVO_SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });
  }
  return transporter;
};

/**
 * Send a generic email
 */
const sendEmail = async ({ to, subject, html }) => {
  const transport = getTransporter();

  const mailOptions = {
    from: `"KDPM Medical Association" <${process.env.EMAIL_FROM || 'noreply@kdpm.org'}>`,
    to,
    subject,
    html,
  };

  const info = await transport.sendMail(mailOptions);
  console.log(`📧 Email sent to ${to}: ${info.messageId}`);
  return info;
};

/**
 * Send membership expiry reminder (7 days before)
 */
const sendExpiryReminder = async (member) => {
  const endDate = new Date(member.membershipEndDate).toLocaleDateString(
    'en-IN',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0d7377, #14919b); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚕️ KDPM Medical Association</h1>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #0d7377; margin-top: 0;">Membership Expiry Reminder</h2>
        <p style="color: #333; font-size: 16px;">Dear <strong>Dr. ${member.fullName}</strong>,</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          This is a friendly reminder that your membership with KDPM Medical Association
          will expire on <strong style="color: #e74c3c;">${endDate}</strong>.
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          Please renew your membership to continue enjoying the benefits and services.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="background: linear-gradient(135deg, #0d7377, #14919b); color: white; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
            Renew Your Membership
          </span>
        </div>
        <p style="color: #888; font-size: 13px;">If you have any questions, please contact us at the association office.</p>
      </div>
      <div style="background: #0d7377; padding: 20px; text-align: center;">
        <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 13px;">KDPM Medical Association • All Rights Reserved</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: member.email,
    subject: '⏳ Membership Expiry Reminder - KDPM Medical Association',
    html,
  });
};

/**
 * Send membership expired notification
 */
const sendExpiredNotification = async (member) => {
  const endDate = new Date(member.membershipEndDate).toLocaleDateString(
    'en-IN',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #c0392b, #e74c3c); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚕️ KDPM Medical Association</h1>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #c0392b; margin-top: 0;">Membership Expired</h2>
        <p style="color: #333; font-size: 16px;">Dear <strong>Dr. ${member.fullName}</strong>,</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          We regret to inform you that your membership with KDPM Medical Association
          expired on <strong style="color: #e74c3c;">${endDate}</strong>.
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          Please renew your membership at the earliest to restore your member benefits and access.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="background: linear-gradient(135deg, #c0392b, #e74c3c); color: white; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
            Renew Now
          </span>
        </div>
      </div>
      <div style="background: #c0392b; padding: 20px; text-align: center;">
        <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 13px;">KDPM Medical Association • All Rights Reserved</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: member.email,
    subject: '❌ Membership Expired - KDPM Medical Association',
    html,
  });
};

/**
 * Send membership renewal confirmation
 */
const sendRenewalConfirmation = async (member) => {
  const startDate = new Date(member.membershipStartDate).toLocaleDateString(
    'en-IN',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );
  const endDate = new Date(member.membershipEndDate).toLocaleDateString(
    'en-IN',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #27ae60, #2ecc71); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚕️ KDPM Medical Association</h1>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #27ae60; margin-top: 0;">🎉 Membership Renewed!</h2>
        <p style="color: #333; font-size: 16px;">Dear <strong>Dr. ${member.fullName}</strong>,</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          Your membership with KDPM Medical Association has been successfully renewed.
        </p>
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #eee;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #888;">Start Date</td>
              <td style="padding: 8px 0; color: #333; font-weight: 600; text-align: right;">${startDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888;">End Date</td>
              <td style="padding: 8px 0; color: #333; font-weight: 600; text-align: right;">${endDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888;">Status</td>
              <td style="padding: 8px 0; text-align: right;">
                <span style="background: #27ae60; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px;">Active</span>
              </td>
            </tr>
          </table>
        </div>
        <p style="color: #555; font-size: 15px;">Thank you for continuing to be a valued member of our association!</p>
      </div>
      <div style="background: #27ae60; padding: 20px; text-align: center;">
        <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 13px;">KDPM Medical Association • All Rights Reserved</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: member.email,
    subject: '✅ Membership Renewed - KDPM Medical Association',
    html,
  });
};

/**
 * Send manual reminder
 */
const sendManualReminder = async (member) => {
  const status = member.membershipStatus;
  if (status === 'expired') {
    return sendExpiredNotification(member);
  } else if (status === 'pending_renewal') {
    return sendExpiryReminder(member);
  } else {
    // Active member — send a general status email
    const endDate = new Date(member.membershipEndDate).toLocaleDateString(
      'en-IN',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0d7377, #14919b); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⚕️ KDPM Medical Association</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #0d7377; margin-top: 0;">Membership Status Update</h2>
          <p style="color: #333; font-size: 16px;">Dear <strong>Dr. ${member.fullName}</strong>,</p>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your membership is currently <strong style="color: #27ae60;">active</strong>
            and valid until <strong>${endDate}</strong>.
          </p>
          <p style="color: #555; font-size: 15px;">Thank you for being a valued member!</p>
        </div>
        <div style="background: #0d7377; padding: 20px; text-align: center;">
          <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 13px;">KDPM Medical Association • All Rights Reserved</p>
        </div>
      </div>
    `;

    return sendEmail({
      to: member.email,
      subject: 'ℹ️ Membership Status - KDPM Medical Association',
      html,
    });
  }
};

module.exports = {
  sendEmail,
  sendExpiryReminder,
  sendExpiredNotification,
  sendRenewalConfirmation,
  sendManualReminder,
};
