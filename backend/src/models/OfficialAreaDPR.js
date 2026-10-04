const mongoose = require('mongoose');

// Schema B: OfficialAreaDPR (The Ground Truth)
// Strictly isolated from PublicInquiry
const CohortItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['APPLIANCE', 'KW'],
      required: true
    },
    houses: {
      type: Number,
      required: true,
      min: 1
    },
    loadDetails: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  { _id: false }
);

const OfficialAreaDPRSchema = new mongoose.Schema(
  {
    dprNumber: {
      type: String,
      unique: true,
      index: true
    },
    areaName: {
      type: String,
      required: true,
      trim: true
    },
    availableLandAcres: {
      type: Number,
      required: true,
      min: 0
    },
    distanceToSubstation: {
      type: Number,
      required: true,
      min: 0
    },
    cohortData: {
      type: [CohortItemSchema],
      required: true,
      default: []
    },
    totalRequiredKw: {
      type: Number,
      required: true,
      min: 0
    },
    totalEstimatedBudget: {
      type: Number,
      required: true,
      min: 0
    },
    landFeasible: {
      type: Boolean,
      required: true
    },
    // Supporting calculation breakdown fields
    totalHouses: {
      type: Number,
      default: 0
    },
    totalDailyKwh: {
      type: Number,
      default: 0
    },
    requiredLandAcres: {
      type: Number,
      default: 0
    },
    solarBudget: {
      type: Number,
      default: 0
    },
    transmissionLineCost: {
      type: Number,
      default: 0
    },
    preparedBy: {
      type: String,
      default: 'State Discom & MNRE Nodal Planning Cell'
    }
  },
  {
    timestamps: true
  }
);

// Auto-assign DPR Reference Number before save if not present
OfficialAreaDPRSchema.pre('save', function (next) {
  if (!this.dprNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomHex = Math.floor(Math.random() * 0x1000).toString(16).toUpperCase().padStart(3, '0');
    this.dprNumber = `DPR-SOL-${timestamp}-${randomHex}`;
  }
  next();
});

module.exports = mongoose.model('OfficialAreaDPR', OfficialAreaDPRSchema);
