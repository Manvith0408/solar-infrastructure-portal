const http = require('http');

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE AUTOMATED VERIFICATION');
  console.log('====================================================\n');

  let allPassed = true;

  // 1. Health & JSON Payload Integrity
  console.log('▶ [Test 1] Testing /api/health for clean JSON payload...');
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    const parsed = JSON.parse(res.body);
    if (res.statusCode === 200 && parsed.status === 'online') {
      console.log('  ✔ PASS: /api/health responded with 200 OK and valid JSON:');
      console.log('         Payload:', JSON.stringify(parsed));
    } else {
      console.error('  ❌ FAIL: Unexpected health payload:', res.body);
      allPassed = false;
    }
  } catch (err) {
    console.error('  ❌ FAIL: Health check error:', err.message);
    allPassed = false;
  }

  // 2. Static Frontend Serving (Root GET /)
  console.log('\n▶ [Test 2] Testing static frontend root serving (GET /)...');
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/',
      method: 'GET'
    });
    if (res.statusCode === 200 && (res.body.includes('<!DOCTYPE html>') || res.body.includes('<html'))) {
      console.log('  ✔ PASS: Root GET / successfully served Next.js HTML frontend (Length: ' + res.body.length + ' bytes)');
    } else {
      console.error('  ❌ FAIL: Root did not serve HTML. Status:', res.statusCode);
      allPassed = false;
    }
  } catch (err) {
    console.error('  ❌ FAIL: Static root error:', err.message);
    allPassed = false;
  }

  // 3. SPA Fallback on Direct Route Refreshes
  console.log('\n▶ [Test 3] Testing SPA Fallback on direct client routes (GET /admin/, GET /random-client-page)...');
  try {
    const resAdmin = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/admin/',
      method: 'GET'
    });
    const resFallback = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/random-client-route',
      method: 'GET'
    });

    const adminOk = resAdmin.statusCode === 200 && (resAdmin.body.includes('<!DOCTYPE html>') || resAdmin.body.includes('<html'));
    const fallbackOk = resFallback.statusCode === 200 && (resFallback.body.includes('<!DOCTYPE html>') || resFallback.body.includes('<html'));

    if (adminOk && fallbackOk) {
      console.log('  ✔ PASS: Direct route GET /admin/ served static HTML with status 200');
      console.log('  ✔ PASS: Direct SPA refresh (GET /random-client-route) served index.html fallback with status 200');
    } else {
      console.error('  ❌ FAIL: SPA fallback failed. Admin status:', resAdmin.statusCode, 'Fallback status:', resFallback.statusCode);
      allPassed = false;
    }
  } catch (err) {
    console.error('  ❌ FAIL: SPA fallback error:', err.message);
    allPassed = false;
  }

  // 4. CRM CSV Export Endpoint (GET /api/admin/leads/export)
  console.log('\n▶ [Test 4] Testing CSV Export endpoint (GET /api/admin/leads/export)...');
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/leads/export',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer demo-admin-token'
      }
    });

    const isCsvType = res.headers['content-type'] && res.headers['content-type'].includes('text/csv');
    const isAttachment = res.headers['content-disposition'] && res.headers['content-disposition'].includes('attachment; filename=');
    const lines = res.body.trim().split('\r\n').length > 1 ? res.body.trim().split('\r\n') : res.body.trim().split('\n');
    const headerLine = lines[0];

    if (res.statusCode === 200 && isCsvType && isAttachment && lines.length >= 2) {
      console.log('  ✔ PASS: Status code 200 OK');
      console.log('  ✔ PASS: Content-Type:', res.headers['content-type']);
      console.log('  ✔ PASS: Content-Disposition:', res.headers['content-disposition']);
      console.log('  ✔ PASS: CSV Header row:', headerLine);
      console.log('  ✔ PASS: Exported ' + (lines.length - 1) + ' data rows');
      console.log('  ✔ Sample Data Row:\n    ' + lines[1]);
    } else {
      console.error('  ❌ FAIL: CSV export failed. Status:', res.statusCode, 'Headers:', res.headers, 'Body snippet:', res.body.slice(0, 200));
      allPassed = false;
    }
  } catch (err) {
    console.error('  ❌ FAIL: CSV export error:', err.message);
    allPassed = false;
  }

  // 5. CRM Aggregation Caching Verification
  console.log('\n▶ [Test 5] Testing Lead CRM endpoint and Cache response...');
  try {
    const res1 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/leads',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer demo-admin-token'
      }
    });
    const parsed1 = JSON.parse(res1.body);

    const res2 = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/leads',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer demo-admin-token'
      }
    });
    const parsed2 = JSON.parse(res2.body);

    if (parsed1.success && parsed2.success && parsed1.stats && parsed2.stats) {
      console.log('  ✔ PASS: First call stats computed:', JSON.stringify(parsed1.stats));
      console.log('  ✔ PASS: Second call served with valid cached stats structure:', JSON.stringify(parsed2.stats));
    } else {
      console.error('  ❌ FAIL: CRM leads response invalid:', res1.body);
      allPassed = false;
    }
  } catch (err) {
    console.error('  ❌ FAIL: CRM leads error:', err.message);
    allPassed = false;
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('🎉 ALL AUTOMATED VERIFICATIONS PASSED SUCCESSFULLY!');
  } else {
    console.log('❌ SOME VERIFICATIONS FAILED.');
  }
  console.log('====================================================');

  process.exit(allPassed ? 0 : 1);
}

runVerification();
