const http = require('http');

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: buffer.toString('utf8'),
          buffer: buffer
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      if (typeof postData === 'object' && !Buffer.isBuffer(postData)) {
        req.write(JSON.stringify(postData));
      } else {
        req.write(postData);
      }
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE BACKEND API TEST SUITE ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${testName}: ${details}`);
      failCount++;
    }
  }

  try {
    // 1. /api/health
    const health = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    const healthJson = JSON.parse(health.body);
    assert(health.statusCode === 200 && healthJson.status === 'online', '1. /api/health returns 200 online');

    // 2. /api/public/vendors
    const vendors = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/public/vendors?pincode=110001',
      method: 'GET'
    });
    const vendorsJson = JSON.parse(vendors.body);
    assert(vendors.statusCode === 200 && Array.isArray(vendorsJson.data) && vendorsJson.data.length > 0, '2. /api/public/vendors returns matching vendors');

    // 3. /api/public/calculate
    const calc = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/public/calculate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-citizen-token'
      }
    }, {
      meterNumber: 'TEST-MTR-001',
      consumerName: 'Suresh Kumar',
      city: 'Delhi',
      consumptionData: { type: 'BILL', value: 360 }
    });
    const calcJson = JSON.parse(calc.body);
    assert(calc.statusCode === 200 && calcJson.success && calcJson.data.calculatedKw > 0, '3. /api/public/calculate calculates system size and saves inquiry');
    const createdInquiryId = calcJson.data.inquiryId;

    // 4. /api/public/inquiry (POST)
    const inquiryPost = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/public/inquiry',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      meterNumber: 'TEST-MTR-002',
      consumerName: 'Anita Roy',
      city: 'Noida',
      calculatedKw: 3.0,
      grossCost: 180000,
      subsidyAmount: 78000,
      netCost: 102000,
      batteryBackupKwh: 6.0
    });
    const inqPostJson = JSON.parse(inquiryPost.body);
    assert(inquiryPost.statusCode === 201 && inqPostJson.success, '4. /api/public/inquiry creates inquiry document with 201 status');

    // 5. /api/public/feedback (PATCH)
    const feedback = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/public/feedback',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    }, {
      inquiryId: createdInquiryId,
      rating: 5
    });
    const fbJson = JSON.parse(feedback.body);
    assert(feedback.statusCode === 200 && fbJson.success, '5. /api/public/feedback updates feedback rating');

    // 6. /api/public/inquiry/:id/contact
    const contact = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/public/inquiry/${createdInquiryId}/contact`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      userPhone: '+91 9876543210',
      vendorId: vendorsJson.data[0]._id
    });
    const contactJson = JSON.parse(contact.body);
    assert(contact.statusCode === 200 && contactJson.success, '6. /api/public/inquiry/:id/contact routes inquiry to vendor');

    // 7. /api/auth/me (with demo-admin-token)
    const adminMe = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': 'Bearer demo-admin-token' }
    });
    const adminMeJson = JSON.parse(adminMe.body);
    assert(adminMe.statusCode === 200 && adminMeJson.role === 'ADMIN', '7. /api/auth/me with demo-admin-token returns ADMIN role');

    // 8. /api/admin/leads
    const adminLeads = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/leads',
      method: 'GET',
      headers: { 'Authorization': 'Bearer demo-admin-token' }
    });
    const adminLeadsJson = JSON.parse(adminLeads.body);
    assert(adminLeads.statusCode === 200 && adminLeadsJson.success && Array.isArray(adminLeadsJson.data), '8. /api/admin/leads returns lead listing');

    // 9. /api/admin/leads/:id/status
    const updateStatus = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/leads/${createdInquiryId}/status`,
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer demo-admin-token',
        'Content-Type': 'application/json'
      }
    }, {
      status: 'APPROVED'
    });
    const statusJson = JSON.parse(updateStatus.body);
    assert(updateStatus.statusCode === 200 && statusJson.success && statusJson.data.status === 'APPROVED', '9. /api/admin/leads/:id/status transitions status to APPROVED');

    // 10. /api/admin/dpr/generate (with format=json)
    const dprGen = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/dpr/generate?format=json',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer demo-admin-token',
        'Content-Type': 'application/json'
      }
    }, {
      areaName: 'Automated Test Feeder',
      availableLandAcres: 4.0,
      distanceToSubstation: 2.0,
      cohortData: [
        { type: 'KW', houses: 25, loadDetails: { kw: 3.0 } }
      ]
    });
    const dprGenJson = JSON.parse(dprGen.body);
    assert(dprGen.statusCode === 201 && dprGenJson.success && dprGenJson.data.totalRequiredKw > 0, '10. /api/admin/dpr/generate produces valid DPR math');
    const createdDprId = dprGenJson.data._id;

    // 11. /api/admin/dpr (list)
    const dprList = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/dpr',
      method: 'GET',
      headers: { 'Authorization': 'Bearer demo-admin-token' }
    });
    const dprListJson = JSON.parse(dprList.body);
    assert(dprList.statusCode === 200 && dprListJson.success && Array.isArray(dprListJson.data), '11. /api/admin/dpr lists generated DPR records');

    // 12. /api/admin/dpr/:id/download (PDF download via PDFKit)
    const dprPdf = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/dpr/${createdDprId}/download`,
      method: 'GET',
      headers: { 'Authorization': 'Bearer demo-admin-token' }
    });
    const isPdf = dprPdf.statusCode === 200 && dprPdf.headers['content-type'] === 'application/pdf' && dprPdf.buffer.slice(0, 4).toString() === '%PDF';
    assert(isPdf, '12. /api/admin/dpr/:id/download generates valid PDF binary via PDFKit');

    // 13. /api/public/my-inquiries (with demo-citizen-token)
    const myInquiries = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/public/my-inquiries',
      method: 'GET',
      headers: { 'Authorization': 'Bearer demo-citizen-token' }
    });
    const myInqJson = JSON.parse(myInquiries.body);
    assert(myInquiries.statusCode === 200 && myInqJson.success, '13. /api/public/my-inquiries returns citizen inquiries');

    // 14. RBAC: /api/admin/leads should return 403 or 401 when accessed with citizen token
    const rbacTest = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/leads',
      method: 'GET',
      headers: { 'Authorization': 'Bearer demo-citizen-token' }
    });
    assert(rbacTest.statusCode === 403, '14. RBAC properly rejects non-admin users with 403 Forbidden on admin routes');

    // 15. /api/public/inquiry/:id/download-pdf (Puppeteer PDF generation)
    console.log('Testing Puppeteer PDF generation (may take 2-4 seconds)...');
    const citizenPdf = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/public/inquiry/${createdInquiryId}/download-pdf`,
      method: 'GET',
      headers: { 'Authorization': 'Bearer demo-citizen-token' }
    });
    const isCitizenPdf = citizenPdf.statusCode === 200 && citizenPdf.headers['content-type'] === 'application/pdf' && citizenPdf.buffer.slice(0, 4).toString() === '%PDF';
    assert(isCitizenPdf, '15. /api/public/inquiry/:id/download-pdf generates valid personal report PDF via Puppeteer', citizenPdf.body);

    // 16. /api/auth/send-otp
    const sendOtp = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/send-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'citizen.test@example.com'
    });
    const sendOtpJson = JSON.parse(sendOtp.body);
    assert(sendOtp.statusCode === 200 && sendOtpJson.success, '16. /api/auth/send-otp generates and dispatches verification OTP');

    // Extract OTP if in dev mode message, or retrieve from memory for verification
    let extractedOtp = null;
    if (sendOtpJson.message && sendOtpJson.message.includes('Code: ')) {
      extractedOtp = sendOtpJson.message.split('Code: ')[1].trim();
    } else {
      // In-memory inspection for automated test
      const { OtpVerificationRepo } = require('./src/models/store');
      const rec = await OtpVerificationRepo.findOne({ email: 'citizen.test@example.com' });
      // We also test negative verification first
    }

    // 17. /api/auth/verify-otp (Negative test: wrong code)
    const badVerify = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/verify-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'citizen.test@example.com',
      otp: '000000'
    });
    assert(badVerify.statusCode === 400, '17. /api/auth/verify-otp rejects invalid OTP with 400 Bad Request');

    if (extractedOtp) {
      // 18. /api/auth/verify-otp (Positive test: exact code)
      const goodVerify = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/verify-otp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        email: 'citizen.test@example.com',
        otp: extractedOtp
      });
      const goodVerifyJson = JSON.parse(goodVerify.body);
      assert(goodVerify.statusCode === 200 && goodVerifyJson.verified === true, '18. /api/auth/verify-otp verifies valid OTP successfully');
    }

  } catch (err) {
    console.error('Fatal test execution error:', err);
    failCount++;
  }

  console.log(`\n--- SUMMARY: ${passCount} PASSED, ${failCount} FAILED ---`);
  process.exit(failCount === 0 ? 0 : 1);
}

runTests();
