const mongoose = require('mongoose');
const { getIsInMemory } = require('../config/db');
const PublicInquiryModel = require('./PublicInquiry');
const OfficialAreaDPRModel = require('./OfficialAreaDPR');
const VendorModel = require('./Vendor');
const { UserModel } = require('./User');
const OtpVerificationModel = require('./OtpVerification');

// In-Memory store storage arrays
const memoryPublicInquiries = [];
const memoryOfficialDPRs = [];
const memoryVendors = [];
const memoryUsers = [];
const memoryOtpVerifications = [];

let idCounter = 1000;
function generateId() {
  idCounter += 1;
  return new mongoose.Types.ObjectId().toString();
}

/**
 * Repository for PublicInquiry (Schema A)
 * Uses native Mongoose if connected, or In-Memory repository if offline
 */
const PublicInquiryRepo = {
  async countDocuments(filter = {}) {
    if (!getIsInMemory()) {
      return PublicInquiryModel.countDocuments(filter);
    }
    return this.findInternal(filter).length;
  },

  enrichInternal(doc) {
    if (!doc) return null;
    const copy = { ...doc };
    if (doc.user) {
      const u = memoryUsers.find((user) => user._id.toString() === doc.user.toString());
      if (u) {
        copy.user = { _id: u._id, name: u.name, email: u.email, meterNumber: u.meterNumber };
      }
    }
    if (!copy.user) {
      const u = memoryUsers.find((user) =>
        (doc.meterNumber && user.meterNumber && user.meterNumber.toUpperCase() === doc.meterNumber.toUpperCase()) ||
        (doc.userId && user.firebaseUid === doc.userId)
      );
      if (u) {
        copy.user = { _id: u._id, name: u.name, email: u.email, meterNumber: u.meterNumber };
      } else {
        const fallbackEmail = doc.userEmail || doc.consumerEmail || (doc.consumerName ? `${doc.consumerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com` : 'citizen@example.com');
        copy.user = { name: doc.consumerName || 'Citizen User', email: fallbackEmail, meterNumber: doc.meterNumber };
      }
    }
    if (doc.selectedVendorId) {
      const v = memoryVendors.find((vend) => vend._id.toString() === doc.selectedVendorId.toString());
      if (v) {
        copy.selectedVendor = {
          _id: v._id,
          companyName: v.companyName,
          phone: v.phone,
          contactEmail: v.contactEmail,
          rating: v.rating
        };
        copy.selectedVendorId = copy.selectedVendor;
      }
    }
    return copy;
  },

  find(filter = {}) {
    if (!getIsInMemory()) {
      return PublicInquiryModel.find(filter)
        .populate('user', 'name email meterNumber')
        .populate('selectedVendorId', 'companyName phone contactEmail rating');
    }

    const matches = this.findInternal(filter);
    const enriched = matches.map((m) => this.enrichInternal(m));

    // Return a chainable query object mimicking Mongoose
    const queryObj = {
      _data: [...enriched],
      sort(sortOpt = { createdAt: -1 }) {
        const field = Object.keys(sortOpt)[0] || 'createdAt';
        const dir = sortOpt[field] || -1;
        this._data.sort((a, b) => {
          const valA = a[field] || 0;
          const valB = b[field] || 0;
          return dir === -1 ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
        });
        return this;
      },
      skip(n = 0) {
        this._data = this._data.slice(n);
        return this;
      },
      limit(n = 20) {
        this._data = this._data.slice(0, n);
        return this;
      },
      populate() {
        return this;
      },
      lean() {
        return Promise.resolve(JSON.parse(JSON.stringify(this._data)));
      },
      then(resolve, reject) {
        return Promise.resolve(JSON.parse(JSON.stringify(this._data))).then(resolve, reject);
      }
    };
    return queryObj;
  },

  findInternal(filter) {
    return memoryPublicInquiries.filter((doc) => {
      if (filter.userId && doc.userId !== filter.userId) return false;
      if (filter.status && doc.status !== filter.status) return false;
      if (filter.$or && Array.isArray(filter.$or)) {
        const matchesAny = filter.$or.some((clause) => {
          for (const key of Object.keys(clause)) {
            const regex = clause[key];
            if (regex instanceof RegExp) {
              if (regex.test(doc[key] || '')) return true;
            } else if (doc[key] === regex) {
              return true;
            }
          }
          return false;
        });
        if (!matchesAny) return false;
      }
      return true;
    });
  },

  async findOneAndUpdate(query, update, options = {}) {
    if (!getIsInMemory()) {
      return PublicInquiryModel.findOneAndUpdate(query, update, options);
    }

    let existing = null;
    if (query._id) {
      existing = memoryPublicInquiries.find((d) => d._id === query._id.toString());
    } else if (query.meterNumber) {
      existing = memoryPublicInquiries.find((d) => d.meterNumber === query.meterNumber);
    }

    const now = new Date();
    if (existing) {
      Object.assign(existing, update, { updatedAt: now });
      return JSON.parse(JSON.stringify(existing));
    }

    if (options.upsert) {
      const newDoc = {
        _id: generateId(),
        status: 'PENDING',
        feedbackRating: null,
        subsidyAmount: 0,
        netCost: 0,
        batteryBackupKwh: 0,
        consumerName: '',
        consumerPhone: '',
        city: 'Delhi NCR',
        createdAt: now,
        updatedAt: now,
        ...query,
        ...update
      };
      memoryPublicInquiries.unshift(newDoc);
      return JSON.parse(JSON.stringify(newDoc));
    }

    return null;
  },

  async findById(id) {
    if (!getIsInMemory()) {
      return PublicInquiryModel.findById(id)
        .populate('user', 'name meterNumber')
        .populate('selectedVendorId', 'companyName phone contactEmail rating');
    }
    const doc = memoryPublicInquiries.find((d) => d._id.toString() === id.toString());
    return doc ? this.enrichInternal(doc) : null;
  },

  async findOne(filter = {}) {
    if (!getIsInMemory()) {
      return PublicInquiryModel.findOne(filter)
        .populate('user', 'name meterNumber')
        .populate('selectedVendorId', 'companyName phone contactEmail rating');
    }
    const matches = this.findInternal(filter);
    return matches.length > 0 ? this.enrichInternal(matches[0]) : null;
  },

  async findByIdAndUpdate(id, update, options = {}) {
    return this.findOneAndUpdate({ _id: id }, update, options);
  },

  async create(doc) {
    if (!getIsInMemory()) {
      return PublicInquiryModel.create(doc);
    }

    const now = new Date();
    const newDoc = {
      _id: generateId(),
      status: doc.status || 'PENDING',
      feedbackRating: doc.feedbackRating !== undefined ? doc.feedbackRating : null,
      subsidyAmount: doc.subsidyAmount || 0,
      netCost: doc.netCost || 0,
      batteryBackupKwh: doc.batteryBackupKwh || 0,
      consumerName: doc.consumerName || '',
      consumerPhone: doc.consumerPhone || '',
      city: doc.city || 'Delhi NCR',
      createdAt: now,
      updatedAt: now,
      ...doc
    };
    memoryPublicInquiries.unshift(newDoc);
    return JSON.parse(JSON.stringify(newDoc));
  },

  async insertMany(docs) {
    if (!getIsInMemory()) {
      return PublicInquiryModel.insertMany(docs);
    }

    const now = new Date();
    const created = docs.map((d) => ({
      _id: generateId(),
      status: 'PENDING',
      feedbackRating: null,
      createdAt: now,
      updatedAt: now,
      ...d
    }));
    memoryPublicInquiries.push(...created);
    return created;
  },

  async aggregate(pipeline) {
    if (!getIsInMemory()) {
      return PublicInquiryModel.aggregate(pipeline);
    }

    // Compute basic aggregates for CRM header
    let totalDemandedKw = 0;
    let totalDemandedCost = 0;
    let ratingSum = 0;
    let ratingCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let commissionedCount = 0;

    memoryPublicInquiries.forEach((item) => {
      totalDemandedKw += item.calculatedKw || 0;
      totalDemandedCost += item.calculatedCost || 0;
      if (item.feedbackRating) {
        ratingSum += item.feedbackRating;
        ratingCount += 1;
      }
      if (item.status === 'PENDING') pendingCount++;
      if (item.status === 'APPROVED') approvedCount++;
      if (item.status === 'COMMISSIONED') commissionedCount++;
    });

    return [
      {
        totalDemandedKw,
        totalDemandedCost,
        avgRating: ratingCount > 0 ? ratingSum / ratingCount : 0,
        totalLeads: memoryPublicInquiries.length,
        pendingCount,
        approvedCount,
        commissionedCount
      }
    ];
  }
};

/**
 * Repository for OfficialAreaDPR (Schema B)
 * Uses native Mongoose if connected, or In-Memory repository if offline
 */
const OfficialAreaDPRRepo = {
  async countDocuments(filter = {}) {
    if (!getIsInMemory()) {
      return OfficialAreaDPRModel.countDocuments(filter);
    }
    return memoryOfficialDPRs.length;
  },

  find() {
    if (!getIsInMemory()) {
      return OfficialAreaDPRModel.find();
    }
    const data = [...memoryOfficialDPRs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return {
      sort() { return this; },
      limit(n = 30) {
        const sliced = data.slice(0, n);
        return {
          lean() { return Promise.resolve(JSON.parse(JSON.stringify(sliced))); },
          then(resolve, reject) { return Promise.resolve(JSON.parse(JSON.stringify(sliced))).then(resolve, reject); }
        };
      },
      lean() { return Promise.resolve(JSON.parse(JSON.stringify(data))); }
    };
  },

  async findById(id) {
    if (!getIsInMemory()) {
      return OfficialAreaDPRModel.findById(id);
    }
    return memoryOfficialDPRs.find((d) => d._id === id.toString()) || null;
  },

  async create(data) {
    if (!getIsInMemory()) {
      return OfficialAreaDPRModel.create(data);
    }

    const timestamp = Date.now().toString(36).toUpperCase();
    const randomHex = Math.floor(Math.random() * 0x1000).toString(16).toUpperCase().padStart(3, '0');
    const dprNumber = data.dprNumber || `DPR-SOL-${timestamp}-${randomHex}`;

    const newDoc = {
      _id: generateId(),
      dprNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    memoryOfficialDPRs.unshift(newDoc);
    return JSON.parse(JSON.stringify(newDoc));
  }
};

/**
 * Repository for Vendor
 * Uses native Mongoose if connected, or In-Memory repository if offline
 */
const VendorRepo = {
  async countDocuments(filter = {}) {
    if (!getIsInMemory()) {
      return VendorModel.countDocuments(filter);
    }
    return memoryVendors.length;
  },

  find(filter = {}) {
    if (!getIsInMemory()) {
      return VendorModel.find(filter);
    }

    let results = [...memoryVendors];
    if (filter.servicePincodes) {
      const pinTarget = typeof filter.servicePincodes === 'object' && filter.servicePincodes.$in
        ? filter.servicePincodes.$in
        : filter.servicePincodes;

      results = results.filter((v) => {
        if (Array.isArray(pinTarget)) {
          return pinTarget.some((p) => v.servicePincodes.includes(String(p).trim()));
        }
        return v.servicePincodes.includes(String(pinTarget).trim());
      });
    }

    return {
      _data: results,
      sort(sortOpt = { rating: -1 }) {
        this._data.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        return this;
      },
      limit(n = 20) {
        this._data = this._data.slice(0, n);
        return this;
      },
      lean() {
        return Promise.resolve(JSON.parse(JSON.stringify(this._data)));
      },
      then(resolve, reject) {
        return Promise.resolve(JSON.parse(JSON.stringify(this._data))).then(resolve, reject);
      }
    };
  },

  async findById(id) {
    if (!getIsInMemory()) {
      return VendorModel.findById(id);
    }
    return memoryVendors.find((v) => v._id.toString() === id.toString()) || null;
  },

  async insertMany(docs) {
    if (!getIsInMemory()) {
      return VendorModel.insertMany(docs);
    }
    const created = docs.map((d) => ({
      _id: d._id || generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      rating: 4.8,
      ...d
    }));
    memoryVendors.push(...created);
    return created;
  }
};

/**
 * Repository for User (Firebase Auth sync & RBAC)
 */
const UserRepo = {
  async findOne(query) {
    if (!getIsInMemory()) {
      return UserModel.findOne(query);
    }
    return memoryUsers.find((u) => {
      if (query.firebaseUid && u.firebaseUid === query.firebaseUid) return true;
      if (query.email && u.email && u.email.toLowerCase() === query.email.toLowerCase()) return true;
      if (query._id && u._id === query._id.toString()) return true;
      if (query.meterNumber && u.meterNumber && u.meterNumber.toUpperCase() === query.meterNumber.toUpperCase()) return true;
      return false;
    }) || null;
  },

  async findById(id) {
    if (!getIsInMemory()) {
      return UserModel.findById(id);
    }
    return memoryUsers.find((u) => u._id === id.toString()) || null;
  },

  async findOneAndUpdate(query, update, options = {}) {
    if (!getIsInMemory()) {
      return UserModel.findOneAndUpdate(query, update, { new: true, upsert: options.upsert || false, ...options });
    }

    let existing = await this.findOne(query);
    const now = new Date();
    if (existing) {
      Object.assign(existing, update, { updatedAt: now });
      return JSON.parse(JSON.stringify(existing));
    }

    if (options.upsert) {
      const newDoc = {
        _id: generateId(),
        role: 'PUBLIC',
        createdAt: now,
        updatedAt: now,
        ...query,
        ...update
      };
      memoryUsers.push(newDoc);
      return JSON.parse(JSON.stringify(newDoc));
    }

    return null;
  },

  async create(doc) {
    if (!getIsInMemory()) {
      return UserModel.create(doc);
    }
    const now = new Date();
    const newDoc = {
      _id: generateId(),
      role: doc.role || 'PUBLIC',
      createdAt: now,
      updatedAt: now,
      ...doc
    };
    memoryUsers.push(newDoc);
    return JSON.parse(JSON.stringify(newDoc));
  },

  async countDocuments(filter = {}) {
    if (!getIsInMemory()) {
      return UserModel.countDocuments(filter);
    }
    return memoryUsers.length;
  },

  async insertMany(docs) {
    if (!getIsInMemory()) {
      return UserModel.insertMany(docs);
    }
    const created = docs.map((d) => ({
      _id: d._id || generateId(),
      role: d.role || 'PUBLIC',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...d
    }));
    memoryUsers.push(...created);
    return created;
  }
};

/**
 * Repository for OtpVerification
 * Supports MongoDB with TTL and In-Memory fallback with auto-purge
 */
const OtpVerificationRepo = {
  async create(doc) {
    if (!getIsInMemory()) {
      return OtpVerificationModel.create(doc);
    }
    const newDoc = {
      _id: generateId(),
      email: doc.email.toLowerCase().trim(),
      otpHash: doc.otpHash,
      expiresAt: doc.expiresAt,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryOtpVerifications.push(newDoc);
    return newDoc;
  },

  async findOne(filter = {}) {
    if (!getIsInMemory()) {
      return OtpVerificationModel.findOne(filter).sort({ createdAt: -1 });
    }
    const now = new Date();
    // Clean expired items
    for (let i = memoryOtpVerifications.length - 1; i >= 0; i--) {
      if (new Date(memoryOtpVerifications[i].expiresAt) <= now) {
        memoryOtpVerifications.splice(i, 1);
      }
    }
    if (filter.email) {
      const email = filter.email.toLowerCase().trim();
      const match = memoryOtpVerifications.slice().reverse().find((d) => d.email === email);
      return match || null;
    }
    return memoryOtpVerifications[0] || null;
  },

  async deleteMany(filter = {}) {
    if (!getIsInMemory()) {
      return OtpVerificationModel.deleteMany(filter);
    }
    if (filter.email) {
      const email = filter.email.toLowerCase().trim();
      let count = 0;
      for (let i = memoryOtpVerifications.length - 1; i >= 0; i--) {
        if (memoryOtpVerifications[i].email === email) {
          memoryOtpVerifications.splice(i, 1);
          count++;
        }
      }
      return { deletedCount: count };
    }
    const count = memoryOtpVerifications.length;
    memoryOtpVerifications.length = 0;
    return { deletedCount: count };
  }
};

module.exports = {
  PublicInquiryRepo,
  OfficialAreaDPRRepo,
  VendorRepo,
  UserRepo,
  OtpVerificationRepo,
  PublicInquiryModel,
  OfficialAreaDPRModel,
  VendorModel,
  UserModel,
  OtpVerificationModel
};

