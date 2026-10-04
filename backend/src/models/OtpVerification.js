const mongoose = require('mongoose');

/**
 * OtpVerification Schema
 * Stores bcrypt-hashed OTPs with a 5-minute Time-To-Live (TTL) index.
 */
const OtpVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    otpHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// MongoDB TTL Index: automatically deletes documents when current time >= expiresAt
OtpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpVerificationModel =
  mongoose.models.OtpVerification ||
  mongoose.model('OtpVerification', OtpVerificationSchema);

module.exports = OtpVerificationModel;
