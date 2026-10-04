const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/authMiddleware');
const { UserRepo } = require('../models/store');
const { createFirebaseAuthUser } = require('../config/firebaseAdmin');


/**
 * POST /api/auth/register-public
 * Pre-flight validation, Meter Number deduplication, Firebase Auth creation, and MongoDB registration
 */
router.post('/register-public', async (req, res) => {
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
});

/**
 * POST /api/auth/register-admin
 * Protected Admin Registration with Department Authorization Code
 */
router.post('/register-admin', async (req, res) => {
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
});

/**
 * POST /api/auth/sync
 * Synchronizes Firebase User session with MongoDB User document
 */
router.post('/sync', verifyFirebaseToken, async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'User synced with database.',
    user: req.mongoUser,
    role: req.mongoUser.role,
    meterNumber: req.mongoUser.meterNumber
  });
});

/**
 * GET /api/auth/me or GET /api/users/me
 * Retrieves current authenticated user profile and role
 */
router.get('/me', verifyFirebaseToken, async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.mongoUser,
    role: req.mongoUser ? req.mongoUser.role : (req.user?.role || 'PUBLIC'),
    uid: req.user?.uid,
    email: req.mongoUser?.email || req.user?.email,
    meterNumber: req.mongoUser?.meterNumber
  });
});

module.exports = router;
