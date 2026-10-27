const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const otpGenerator = require('otp-generator');
const { verifyFirebaseToken } = require('../middleware/authMiddleware');
const { UserRepo, OtpVerificationRepo } = require('../models/store');
const { createFirebaseAuthUser } = require('../config/firebaseAdmin');
const { sendOtpEmail } = require('../utils/mailer');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * POST /api/auth/send-otp
 * Generates and sends a 6-digit email OTP for registration or verification
 */
router.post('/send-otp', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      error: "A valid email address is required."
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Generate 6-digit numeric OTP
  const otp = otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false
  });

  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Clear prior OTPs and save new
  await OtpVerificationRepo.deleteMany({ email: cleanEmail });
  await OtpVerificationRepo.create({
    email: cleanEmail,
    otpHash,
    expiresAt
  });

  const result = await sendOtpEmail(cleanEmail, otp);

  return res.status(200).json({
    success: true,
    message: result.devMode
      ? `Verification OTP generated. Code: ${otp}`
      : `Verification code sent to ${cleanEmail}. Valid for 5 minutes.`,
    devMode: result.devMode
  });
}));

/**
 * POST /api/auth/verify-otp
 * Verifies email OTP code against stored bcrypt hash
 */
router.post('/verify-otp', asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      error: "Both 'email' and 6-digit 'otp' are required."
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = String(otp).trim();

  const record = await OtpVerificationRepo.findOne({ email: cleanEmail });
  if (!record) {
    return res.status(400).json({
      success: false,
      error: "Verification code has expired or was not requested. Please request a new code."
    });
  }

  if (new Date(record.expiresAt) <= new Date()) {
    await OtpVerificationRepo.deleteMany({ email: cleanEmail });
    return res.status(400).json({
      success: false,
      error: "Verification code has expired. Please request a new code."
    });
  }

  const isMatch = await bcrypt.compare(cleanOtp, record.otpHash);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      error: "Invalid verification code."
    });
  }

  // Code verified: delete to prevent replay
  await OtpVerificationRepo.deleteMany({ email: cleanEmail });

  return res.status(200).json({
    success: true,
    message: "Email verified successfully.",
    verified: true
  });
}));

/**
 * POST /api/auth/register-public
 * Pre-flight validation, Meter Number deduplication, Firebase Auth creation, and MongoDB registration
 */
router.post('/register-public', asyncHandler(async (req, res) => {
  try {
    const { email, password, name, meterNumber } = req.body;

    // Required fields validation
    if (!email || !password || !name || !meterNumber) {
      return res.status(400).json({
        success: false,
        error: "All fields are required: 'email', 'password', 'name', and 'meterNumber'."
      });
    }

    const cleanMeter = meterNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long."
      });
    }

    // Step 1: Query the User collection for the meterNumber
    const existingMeterUser = await UserRepo.findOne({ meterNumber: cleanMeter });
    if (existingMeterUser) {
      return res.status(409).json({
        success: false,
        error: "This Meter Number is already registered."
      });
    }

    // Step 2: Query for the email to ensure no duplicates
    const existingEmailUser = await UserRepo.findOne({ email: cleanEmail });
    if (existingEmailUser) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists."
      });
    }

    // Step 3: Use the Firebase Admin SDK (admin.auth().createUser()) to create the auth account
    const firebaseUser = await createFirebaseAuthUser({
      email: cleanEmail,
      password: password,
      name: cleanName
    });

    // Step 4: Save the new user document to MongoDB with role: 'PUBLIC', firebaseUid, name, and meterNumber
    const newUser = await UserRepo.create({
      firebaseUid: firebaseUser.uid,
      email: cleanEmail,
      name: cleanName,
      meterNumber: cleanMeter,
      role: 'PUBLIC'
    });

    return res.status(200).json({
      success: true,
      message: "Public user registered successfully.",
      user: newUser,
      role: 'PUBLIC'
    });
  } catch (error) {
    console.error('Error in /register-public:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to register user."
    });
  }
}));

/**
 * POST /api/auth/register-admin
 * Protected Admin Registration with Department Authorization Code
 */
router.post('/register-admin', asyncHandler(async (req, res) => {
  try {
    const { email, password, name, authCode } = req.body;

    // Required fields validation
    if (!email || !password || !name || !authCode) {
      return res.status(400).json({
        success: false,
        error: "All fields are required: 'email', 'password', 'name', and 'authCode'."
      });
    }

    // Step 1: Security Check. Verify if authCode matches server-side secret
    const adminSecret = process.env.ADMIN_REGISTRATION_SECRET || 'DISCOM_ADMIN_2026';
    if (authCode.trim() !== adminSecret) {
      return res.status(403).json({
        success: false,
        error: "Invalid Department Authorization Code."
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long."
      });
    }

    // Step 2: Query for the email in the User collection to ensure no duplicates
    const existingEmailUser = await UserRepo.findOne({ email: cleanEmail });
    if (existingEmailUser) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists."
      });
    }

    // Step 3: Use the Firebase Admin SDK to create the auth account
    const firebaseUser = await createFirebaseAuthUser({
      email: cleanEmail,
      password: password,
      name: cleanName,
      role: 'ADMIN'
    });

    // Step 4: Save the new user document to MongoDB with role: 'ADMIN', firebaseUid, and name
    const newUser = await UserRepo.create({
      firebaseUid: firebaseUser.uid,
      email: cleanEmail,
      name: cleanName,
      role: 'ADMIN'
    });

    return res.status(200).json({
      success: true,
      message: "Admin user registered successfully.",
      user: newUser,
      role: 'ADMIN'
    });
  } catch (error) {
    console.error('Error in /register-admin:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to register admin user."
    });
  }
}));

/**
 * POST /api/auth/sync
 * Synchronizes Firebase User session with MongoDB User document
 */
router.post('/sync', verifyFirebaseToken, asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'User synced with database.',
    user: req.mongoUser,
    role: req.mongoUser.role,
    meterNumber: req.mongoUser.meterNumber
  });
}));

/**
 * GET /api/auth/me or GET /api/users/me
 * Retrieves current authenticated user profile and role
 */
router.get('/me', verifyFirebaseToken, asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.mongoUser,
    role: req.mongoUser ? req.mongoUser.role : (req.user?.role || 'PUBLIC'),
    uid: req.user?.uid,
    email: req.mongoUser?.email || req.user?.email,
    meterNumber: req.mongoUser?.meterNumber
  });
}));

module.exports = router;
