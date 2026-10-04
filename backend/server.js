const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./src/config/db');
const publicRoutes = require('./src/routes/publicRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const authRoutes = require('./src/routes/authRoutes');
const { PublicInquiryRepo, OfficialAreaDPRRepo, VendorRepo, UserRepo } = require('./src/models/store');

const app = express();
const PORT = process.env.PORT || 5000;

// Dynamic CORS configuration reading from process.env.CLIENT_URL for Render deployment
const clientUrl = process.env.CLIENT_URL;

app.use(
  cors({
    origin: clientUrl || ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Disposition', 'X-DPR-Number', 'X-DPR-Feasible']
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health & Diagnostic Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Solar Infrastructure & DPR Engine Backend',
    database: require('mongoose').connection.readyState === 1 ? 'connected' : 'connecting'
  });
});

// Mount isolated route domains
app.use('/api/auth', authRoutes);
app.use('/api/users', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred.',
    message: err.message
  });
});

// Seed Initial CRM Inquiries and Users if collection is empty
async function seedInitialData() {
  try {
    const userCount = await UserRepo.countDocuments();
    if (userCount === 0) {
      console.log('[Seed] Populating initial system users...');
      await UserRepo.insertMany([
        {
          firebaseUid: 'admin-discom-uid',
          email: 'admin@discom.gov.in',
          name: 'State Nodal Administrator',
          role: 'ADMIN'
        },
        {
          firebaseUid: 'citizen-demo-uid',
          email: 'citizen@example.com',
          name: 'Suresh Kumar',
          role: 'PUBLIC'
        }
      ]);
      console.log('[Seed] Initial Admin & Public users seeded.');
    }

    const count = await PublicInquiryRepo.countDocuments();
    if (count === 0) {
      console.log('[Seed] Populating initial PublicInquiry records for Lead CRM...');
      const sampleLeads = [
        {
          meterNumber: 'NDMC-849201',
          consumerName: 'Rajesh Sharma',
          consumerPhone: '+91 98112 43210',
          city: 'South Delhi',
          consumptionData: { type: 'BILL', value: 480 },
          calculatedKw: 4.0,
          calculatedCost: 240000,
          subsidyAmount: 78000,
          netCost: 162000,
          batteryBackupKwh: 8.0,
          status: 'PENDING',
          feedbackRating: 5
        },
        {
          meterNumber: 'DHBVN-739102',
          consumerName: 'Sunita Mehra',
          consumerPhone: '+91 97188 54321',
          city: 'Gurugram',
          consumptionData: {
            type: 'APPLIANCES',
            value: { fan: 4, bulb: 8, tv: 1, fridge: 1, ac: 2 }
          },
          calculatedKw: 6.2,
          calculatedCost: 372000,
          subsidyAmount: 78000,
          netCost: 294000,
          batteryBackupKwh: 12.4,
          status: 'APPROVED',
          feedbackRating: 4
        },
        {
          meterNumber: 'BSES-552918',
          consumerName: 'Vikramaditya Roy',
          consumerPhone: '+91 98234 11223',
          city: 'Noida Sector 62',
          consumptionData: { type: 'BILL', value: 240 },
          calculatedKw: 2.0,
          calculatedCost: 120000,
          subsidyAmount: 60000,
          netCost: 60000,
          batteryBackupKwh: 4.0,
          status: 'APPROVED',
          vendorContacted: true,
          feedbackRating: 5
        },
        {
          meterNumber: 'PVVNL-441209',
          consumerName: 'Ananya Deshmukh',
          consumerPhone: '+91 99100 88776',
          city: 'Greater Noida',
          consumptionData: {
            type: 'APPLIANCES',
            value: { fan: 3, bulb: 6, tv: 1, fridge: 1, ac: 1 }
          },
          calculatedKw: 3.5,
          calculatedCost: 210000,
          subsidyAmount: 78000,
          netCost: 132000,
          batteryBackupKwh: 7.0,
          status: 'COMMISSIONED',
          feedbackRating: 5
        },
        {
          meterNumber: 'UPPCL-392184',
          consumerName: 'Harish Chandra Verma',
          consumerPhone: '+91 94150 99881',
          city: 'Ghaziabad',
          consumptionData: { type: 'BILL', value: 120 },
          calculatedKw: 1.0,
          calculatedCost: 60000,
          subsidyAmount: 30000,
          netCost: 30000,
          batteryBackupKwh: 2.0,
          status: 'PENDING',
          feedbackRating: 4
        }
      ];

      await PublicInquiryRepo.insertMany(sampleLeads);
      console.log(`[Seed] Inserted ${sampleLeads.length} sample inquiries.`);
    }

    const dprCount = await OfficialAreaDPRRepo.countDocuments();
    if (dprCount === 0) {
      console.log('[Seed] Populating initial OfficialAreaDPR record...');
      await OfficialAreaDPRRepo.create({
        areaName: 'Rampur Agro Feeder-02',
        availableLandAcres: 5.5,
        distanceToSubstation: 3.2,
        cohortData: [
          { type: 'KW', houses: 40, loadDetails: { kw: 2.5 } },
          { type: 'APPLIANCE', houses: 60, loadDetails: { fan: 3, bulb: 6, tv: 1, fridge: 1, ac: 1 } }
        ],
        totalRequiredKw: 671.0,
        totalEstimatedBudget: 40740000,
        landFeasible: true,
        totalHouses: 100,
        totalDailyKwh: 2440,
        requiredLandAcres: 2.68,
        solarBudget: 40260000,
        transmissionLineCost: 480000
      });
      console.log('[Seed] Sample DPR created.');
    }

    const vendorCount = await VendorRepo.countDocuments();
    if (vendorCount === 0) {
      console.log('[Seed] Populating initial empanelled Vendor network...');
      const sampleVendors = [
        {
          companyName: 'Tata Power Solar Systems Ltd.',
          contactEmail: 'solar.delhi@tatapower.com',
          phone: '+91 98100 12345',
          servicePincodes: ['110001', '110002', '110020', '110025', '110048', '110091', '122001', '122002', '201301', '201303'],
          rating: 4.9,
          accreditation: 'MNRE Tier-1 Empanelled Lead EPC',
          completedProjects: 420
        },
        {
          companyName: 'Adani Solar EPC Services',
          contactEmail: 'cs@adani.com',
          phone: '+91 98200 67890',
          servicePincodes: ['110001', '110020', '110025', '122001', '122002', '201301', '201001'],
          rating: 4.8,
          accreditation: 'National Solar Mission Partner',
          completedProjects: 310
        },
        {
          companyName: 'Loom Solar Private Limited',
          contactEmail: 'support@loomsolar.com',
          phone: '+91 87507 78800',
          servicePincodes: ['110001', '110020', '110048', '122001', '201301', '201001', '201002'],
          rating: 4.8,
          accreditation: 'Shark Tank Featured • ISO 9001',
          completedProjects: 250
        },
        {
          companyName: 'Waaree Renewable Technologies',
          contactEmail: 'rooftop@waaree.com',
          phone: '+91 97111 22334',
          servicePincodes: ['110001', '110025', '110091', '122002', '201301', '201001'],
          rating: 4.7,
          accreditation: 'Discom Empanelled Turnkey Partner',
          completedProjects: 190
        },
        {
          companyName: 'Havells Solar Rooftop Division',
          contactEmail: 'solarcare@havells.com',
          phone: '+91 99100 55443',
          servicePincodes: ['110001', '110002', '110020', '122001', '201301', '201002'],
          rating: 4.8,
          accreditation: 'MNRE Certified Tier-1 Brand',
          completedProjects: 175
        }
      ];

      await VendorRepo.insertMany(sampleVendors);
      console.log(`[Seed] Inserted ${sampleVendors.length} empanelled solar vendors.`);
    }
  } catch (seedErr) {
    console.warn('[Seed Error]:', seedErr.message);
  }
}

// Start Server after connecting to Database
async function bootstrap() {
  try {
    await connectDB();
    await seedInitialData();

    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` Backend running on port: ${PORT}`);
      console.log(` Health check: /api/health`);
      console.log(` CORS allowed origin: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
      console.log(`====================================================`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n[CRITICAL ERROR] Port ${PORT} is already in use (EADDRINUSE).`);
        console.error(`Please kill the existing process using port ${PORT} and restart.\n`);
        console.error(`On Windows:`);
        console.error(`  1. Run: netstat -ano | findstr :${PORT}`);
        console.error(`  2. Run: taskkill /PID <PID> /F\n`);
        process.exit(1);
      } else {
        console.error('[Server Listening Error]:', err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Fatal initialization error:', error);
    process.exit(1);
  }
}

bootstrap();
