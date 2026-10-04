const mongoose = require('mongoose');

// Vendor Schema: Empanelled Solar EPC Installers
const VendorSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    servicePincodes: {
      type: [String],
      required: true,
      index: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 4.8
    },
    accreditation: {
      type: String,
      default: 'MNRE Tier-1 Empanelled'
    },
    completedProjects: {
      type: Number,
      default: 150
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Vendor', VendorSchema);
