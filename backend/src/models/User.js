const mongoose = require('mongoose');

/**
 * User Schema: Mirrors Firebase Auth data with Role-Based Access Control (RBAC)
 * Roles: 'PUBLIC' (homeowners/citizens) | 'ADMIN' (state utility / Discom officials)
 */
const UserSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    name: {
      type: String,
      trim: true,
      default: ''
    },
    meterNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true,
      index: true
    },
    photoURL: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      enum: ['PUBLIC', 'ADMIN'],
      default: 'PUBLIC',
      index: true
    }
  },
  {
    timestamps: true
  }
);

const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = {
  UserModel,
  UserSchema
};
