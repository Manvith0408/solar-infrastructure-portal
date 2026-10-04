const mongoose = require('mongoose');

// Schema A: PublicInquiry (The Demand Radar)
// Strictly isolated from OfficialAreaDPR
const PublicInquirySchema = new mongoose.Schema(
  {
    meterNumber: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    consumptionData: {
      type: {
        type: String,
        enum: ['BILL', 'APPLIANCES'],
        required: true
      },
      value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      }
    },
    calculatedKw: {
      type: Number,
      required: true,
      min: 0
    },
    calculatedCost: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'COMMISSIONED', 'Pending', 'Approved', 'Commissioned'],
      default: 'Pending',
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    feedbackRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    // Useful supplemental metadata for B2C consumer receipts & CRM display
    subsidyAmount: {
      type: Number,
      default: 0
    },
    netCost: {
      type: Number,
      default: 0
    },
    batteryBackupKwh: {
      type: Number,
      default: 0
    },
    consumerName: {
      type: String,
      default: ''
    },
    consumerPhone: {
      type: String,
      default: ''
    },
    userPhone: {
      type: String,
      default: ''
    },
    selectedVendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null
    },
    vendorContacted: {
      type: Boolean,
      default: false,
      index: true
    },
    city: {
      type: String,
      default: 'Delhi NCR'
    },
    userId: {
      type: String,
      default: null,
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('PublicInquiry', PublicInquirySchema);
