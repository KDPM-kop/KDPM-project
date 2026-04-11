const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    qualification: {
      type: String,
      trim: true,
      default: '',
    },
    specialization: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    membershipStartDate: {
      type: Date,
      default: Date.now,
    },
    membershipEndDate: {
      type: Date,
      default: function () {
        // Default: 1 year from start
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        return d;
      },
    },
    membershipStatus: {
      type: String,
      enum: ['active', 'expired', 'pending_renewal'],
      default: 'active',
    },
    membershipType: {
      type: String,
      enum: ['Lifetime Membership', 'Temporary Membership'],
      default: 'Temporary Membership',
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    profilePicLink: {
      type: String,
      default: '',
    },
    designation: {
      type: String,
      default: '',
      trim: true,
    },
    primaryAssociation: {
      type: String,
      default: '',
      trim: true,
    },
    mmcNumber: {
      type: String,
      default: '',
      trim: true,
    },
    labAttachments: {
      type: String,
      default: '',
      trim: true,
    },
    hobbies: {
      type: String,
      default: '',
    },
    specialInterests: {
      type: String,
      default: '',
    },
    dob: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      default: '',
    },
    paymentScreenshot: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    lastReminderSent: {
      type: Date,
      default: null,
    },
    source: {
      type: String,
      enum: ['manual', 'google_sheet'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to auto-update membership status
memberSchema.pre('save', function (next) {
  const now = new Date();
  if (this.membershipEndDate) {
    const endDate = new Date(this.membershipEndDate);
    const daysUntilExpiry = Math.ceil(
      (endDate - now) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      this.membershipStatus = 'expired';
    } else if (daysUntilExpiry <= 30) {
      this.membershipStatus = 'pending_renewal';
    } else {
      this.membershipStatus = 'active';
    }
  }
  next();
});

// Index for search
memberSchema.index({ fullName: 'text', email: 'text', specialization: 'text' });

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;
