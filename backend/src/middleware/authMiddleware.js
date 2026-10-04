const { verifyFirebaseIdToken } = require('../config/firebaseAdmin');
const { UserRepo } = require('../models/store');

const ADMIN_EMAILS = [
  'admin@discom.gov.in',
  'admin@solarpulse.gov.in',
  'nodal.officer@delhi.gov.in'
];

/**
 * Express Middleware: Verifies Firebase ID Token
 * Extracts Bearer token from Authorization header and attaches decoded token to req.user.
 * Also synchronizes and attaches req.mongoUser.
 */
async function verifyFirebaseToken(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1].trim();
    } else if (req.query && req.query.token) {
      token = req.query.token.trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or invalid Authorization header. Expected Bearer token.'
      });
    }

    // Verify token using Firebase Admin
    const decodedToken = await verifyFirebaseIdToken(token);
    req.user = decodedToken;

    const firebaseUid = decodedToken.uid || decodedToken.user_id || decodedToken.sub;
    const email = decodedToken.email || '';
    const name = decodedToken.name || '';
    const photoURL = decodedToken.picture || '';

    // Determine default role based on admin emails or token claims
    const isAdminEmail = ADMIN_EMAILS.some((adm) => adm.toLowerCase() === email.toLowerCase());
    const assignedRole = decodedToken.role === 'ADMIN' || isAdminEmail ? 'ADMIN' : 'PUBLIC';

    // Synchronize user document with MongoDB
    let mongoUser = await UserRepo.findOne({ firebaseUid });

    if (!mongoUser && email) {
      // Check if user was previously seeded by email
      mongoUser = await UserRepo.findOne({ email });
    }

    if (!mongoUser) {
      // Create user record in MongoDB
      mongoUser = await UserRepo.create({
        firebaseUid,
        email,
        name,
        photoURL,
        role: assignedRole
      });
    } else {
      // Update any changes (e.g. photo or name)
      const updates = {};
      if (name && mongoUser.name !== name) updates.name = name;
      if (photoURL && mongoUser.photoURL !== photoURL) updates.photoURL = photoURL;
      if (isAdminEmail && mongoUser.role !== 'ADMIN') updates.role = 'ADMIN';

      if (Object.keys(updates).length > 0) {
        mongoUser = await UserRepo.findOneAndUpdate({ _id: mongoUser._id }, updates, { new: true });
      }
    }

    req.mongoUser = mongoUser;
    return next();
  } catch (error) {
    console.error('[Auth Middleware] Verification error:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Failed to authenticate Firebase ID token.',
      details: error.message
    });
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces specific role (e.g., 'ADMIN')
 */
function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.mongoUser) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required before role verification.'
      });
    }

    if (req.mongoUser.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Access requires '${requiredRole}' role permissions.`
      });
    }

    return next();
  };
}

/**
 * Optional Firebase Token Middleware
 * Allows public requests while attaching user if authenticated
 */
async function optionalFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    req.mongoUser = null;
    return next();
  }

  try {
    return await verifyFirebaseToken(req, res, next);
  } catch {
    req.user = null;
    req.mongoUser = null;
    return next();
  }
}

module.exports = {
  verifyFirebaseToken,
  requireRole,
  optionalFirebaseToken
};
