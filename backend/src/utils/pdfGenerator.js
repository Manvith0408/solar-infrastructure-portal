const PDFDocument = require('pdfkit');

/**
 * Generates an official Government & Discom grade Detailed Project Report (DPR)
 * Returns a Promise that resolves to a Buffer containing the complete PDF binary.
 */
function generateOfficialDPRPdf(dprRecord) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
        info: {
          Title: `Detailed Project Report - ${dprRecord.areaName}`,
          Author: 'Discom & MNRE Renewable Cell',
          Subject: 'Solar Microgrid & Feeder Sizing DPR',
          Keywords: 'Solar, DPR, MNRE, Discom, Microgrid, Infrastructure'
        }
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', (err) => reject(err));

      const primaryColor = '#0f172a'; // Deep Navy / Slate
      const accentGreen = '#16a34a'; // Emerald
      const accentRed = '#dc2626'; // Red
      const accentGold = '#d97706'; // Amber
      const textMuted = '#475569';
      const borderLine = '#cbd5e1';

      // ==========================================
      // 1. TOP HEADER & OFFICIAL EMBLEM STRIP
      // ==========================================
      doc.rect(40, 40, 515, 6).fill('#0284c7'); // Top blue bar

      doc.fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('GOVERNMENT OF INDIA • MINISTRY OF NEW & RENEWABLE ENERGY (MNRE)', 40, 56, { align: 'center' });

      doc.fillColor(textMuted)
        .fontSize(8)
        .font('Helvetica')
        .text('STATE ELECTRICITY DISTRIBUTION UTILITY (DISCOM) — NODAL RENEWABLE CELL', 40, 70, { align: 'center' });

      doc.moveDown(0.5);

      // DPR Title Banner
      doc.rect(40, 88, 515, 38).fill('#f8fafc');
      doc.rect(40, 88, 515, 38).stroke(borderLine);

      doc.fillColor(primaryColor)
        .fontSize(15)
        .font('Helvetica-Bold')
        .text('DETAILED PROJECT REPORT (DPR): SOLAR FEEDER INFRASTRUCTURE', 40, 97, { align: 'center' });

      doc.fillColor(textMuted)
        .fontSize(8)
        .font('Helvetica')
        .text(`STATUTORY PLANNING DOCUMENT • REF: ${dprRecord.dprNumber || 'DPR-SOL-2026-X'}`, 40, 114, { align: 'center' });

      // ==========================================
      // 2. DOCUMENT METADATA BAR
      // ==========================================
      const metaY = 138;
      doc.rect(40, metaY, 515, 45).fill('#f1f5f9');
      doc.rect(40, metaY, 515, 45).stroke(borderLine);

      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text('PROJECT AREA / FEEDER:', 52, metaY + 8);
      doc.fillColor('#0284c7').fontSize(9).font('Helvetica-Bold').text(dprRecord.areaName, 52, metaY + 22);

      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text('SUBSTATION DISTANCE:', 210, metaY + 8);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text(`${dprRecord.distanceToSubstation || 0} km`, 210, metaY + 22);

      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text('DATE GENERATED:', 340, metaY + 8);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica').text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 340, metaY + 22);

      // Feasibility Stamp
      const isFeasible = dprRecord.landFeasible;
      const statusColor = isFeasible ? accentGreen : accentRed;
      const statusText = isFeasible ? 'LAND: FEASIBLE' : 'LAND: DEFICIT';

      doc.rect(430, metaY + 6, 115, 32).fill(isFeasible ? '#dcfce7' : '#fee2e2');
      doc.rect(430, metaY + 6, 115, 32).stroke(statusColor);
      doc.fillColor(statusColor).fontSize(9).font('Helvetica-Bold').text(statusText, 430, metaY + 14, { width: 115, align: 'center' });
      doc.fontSize(7).font('Helvetica').text(isFeasible ? 'Ready for Tender' : 'Reallocation Needed', 430, metaY + 26, { width: 115, align: 'center' });

      // ==========================================
      // 3. EXECUTIVE KPI CARDS (4 TILES)
      // ==========================================
      const kpiY = 196;
      const cardW = 120;
      const cardH = 54;
      const gap = 11.6;

      const kpiCards = [
        { label: 'TOTAL REQUIRED SOLAR', value: `${dprRecord.totalRequiredKw} kW`, sub: 'Incl. 10% grid loss', color: '#0369a1' },
        { label: 'TOTAL CONSUMERS', value: `${dprRecord.totalHouses || 0} Houses`, sub: 'Beneficiary Cohorts', color: '#0f766e' },
        { label: 'LAND REQUIRED / AVAIL', value: `${dprRecord.requiredLandAcres} / ${dprRecord.availableLandAcres} Ac`, sub: '4 Acres / 1000 kW', color: isFeasible ? '#15803d' : '#b91c1c' },
        { label: 'TOTAL CAPEX BUDGET', value: `₹${((dprRecord.totalEstimatedBudget || 0) / 100000).toFixed(2)} Lakhs`, sub: '₹60k/kW + Substation', color: '#7c3aed' }
      ];

      kpiCards.forEach((kpi, idx) => {
        const x = 40 + idx * (cardW + gap);
        doc.rect(x, kpiY, cardW, cardH).fill('#ffffff');
        doc.rect(x, kpiY, cardW, cardH).stroke(borderLine);
        doc.rect(x, kpiY, cardW, 3).fill(kpi.color);

        doc.fillColor(textMuted).fontSize(7).font('Helvetica-Bold').text(kpi.label, x + 6, kpiY + 8, { width: cardW - 12 });
        doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text(kpi.value, x + 6, kpiY + 22, { width: cardW - 12 });
        doc.fillColor(textMuted).fontSize(6.5).font('Helvetica').text(kpi.sub, x + 6, kpiY + 39, { width: cardW - 12 });
      });

      // ==========================================
      // 4. TECHNICAL SPECIFICATION & SIZING MATHEMATICS
      // ==========================================
      let curY = 265;
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('1. SIZING MATHEMATICS & REGULATORY BENCHMARKS', 40, curY);
      doc.rect(40, curY + 14, 515, 1).fill(borderLine);

      curY += 22;
      const techTable = [
        ['Solar Radiation / Yield Constant', '1 kW = 4.0 kWh (units) generation per day (MNRE Standard)'],
        ['Capital Expenditure Baseline', '₹60,000 per kW (Turnkey EPC, Module, Inverter, MMS, BOS)'],
        ['Land Density Benchmark', '4.0 Acres per 1000 kW (1 MW) (0.004 Acres / kW installed)'],
        ['Grid Transmission & Distribution Loss', '10.0% standard feeder loss markup applied to gross load'],
        ['Substation Evacuation Intertie', `₹1,50,000 / km for 11kV/33kV distribution line (${dprRecord.distanceToSubstation || 0} km)`]
      ];

      techTable.forEach((row, i) => {
        const rowY = curY + i * 16;
        if (i % 2 === 0) doc.rect(40, rowY - 2, 515, 16).fill('#f8fafc');
        doc.fillColor(textMuted).fontSize(8).font('Helvetica-Bold').text(row[0], 48, rowY + 2);
        doc.fillColor(primaryColor).fontSize(8).font('Helvetica').text(row[1], 230, rowY + 2);
      });

      // ==========================================
      // 5. COHORT LOAD BREAKDOWN TABLE
      // ==========================================
      curY += 92;
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('2. BENEFICIARY COHORT DISTRIBUTION & LOAD AUDIT', 40, curY);
      doc.rect(40, curY + 14, 515, 1).fill(borderLine);

      curY += 22;
      // Table Header
      doc.rect(40, curY, 515, 20).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
      doc.text('COHORT #', 48, curY + 6);
      doc.text('INPUT MODE', 105, curY + 6);
      doc.text('HOUSEHOLDS', 185, curY + 6);
      doc.text('LOAD SPECS / RATING', 260, curY + 6);
      doc.text('EST. DAILY KWH', 440, curY + 6);

      curY += 20;

      const cohorts = dprRecord.cohortData || [];
      if (cohorts.length === 0) {
        doc.rect(40, curY, 515, 20).fill('#f8fafc');
        doc.fillColor(textMuted).fontSize(8).font('Helvetica-Oblique').text('No cohort data submitted.', 48, curY + 6);
        curY += 20;
      } else {
        cohorts.forEach((c, index) => {
          const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(40, curY, 515, 20).fill(rowBg);
          doc.rect(40, curY, 515, 20).stroke('#e2e8f0');

          const cohortHouseCount = Number(c.houses ?? c.householdCount ?? 0);
          const cohortTitle = c.cohortName || c.name || `Cohort ${index + 1}`;
          const isKw = c.type === 'KW' || c.connectedKw !== undefined;
          const isMonthly = c.avgMonthlyKwh !== undefined || c.type === 'MONTHLY';

          let specText = '';
          if (isKw) {
            const kwVal = Number(c.loadDetails?.kw ?? c.loadDetails ?? c.connectedKw ?? 0);
            specText = `Direct Load: ${kwVal} kW / house`;
          } else if (isMonthly) {
            const mVal = Number(c.avgMonthlyKwh || c.loadDetails?.monthlyKwh || 0);
            specText = `Avg Monthly: ${mVal} kWh / house`;
          } else {
            const counts = c.loadDetails || {};
            specText = Object.entries(counts)
              .filter(([_, cnt]) => cnt > 0)
              .map(([app, cnt]) => `${cnt} ${app}`)
              .join(', ') || 'Standard appliances';
          }

          let estDailyKwh = c.cohortDailyKwh;
          if (estDailyKwh === undefined || estDailyKwh === null) {
            if (isKw) {
              const kwVal = Number(c.loadDetails?.kw ?? c.loadDetails ?? c.connectedKw ?? 0);
              estDailyKwh = Math.round(kwVal * 4 * cohortHouseCount);
            } else if (isMonthly) {
              const mVal = Number(c.avgMonthlyKwh || c.loadDetails?.monthlyKwh || 0);
              estDailyKwh = Math.round((mVal / 30) * cohortHouseCount * 10) / 10;
            } else {
              estDailyKwh = '-';
            }
          }

          const typeLabel = isKw ? 'Direct kW' : (isMonthly ? 'Monthly Bill' : 'Appliance');

          doc.fillColor(primaryColor).fontSize(7.5).font('Helvetica-Bold').text(cohortTitle.length > 14 ? cohortTitle.substring(0, 14) + '..' : cohortTitle, 48, curY + 6);
          doc.fillColor(textMuted).fontSize(7.5).font('Helvetica').text(typeLabel, 105, curY + 6);
          doc.fillColor(primaryColor).fontSize(7.5).font('Helvetica').text(`${cohortHouseCount} Houses`, 185, curY + 6);
          doc.fillColor(textMuted).fontSize(7).font('Helvetica').text(specText.length > 38 ? specText.substring(0, 38) + '...' : specText, 260, curY + 6);
          doc.fillColor('#0284c7').fontSize(7.5).font('Helvetica-Bold').text(`${estDailyKwh} kWh/day`, 440, curY + 6);

          curY += 20;
        });
      }

      // ==========================================
      // 6. LAND FEASIBILITY & GRID ASSESSMENT
      // ==========================================
      curY += 12;
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('3. LAND FEASIBILITY & SPATIAL VERIFICATION', 40, curY);
      doc.rect(40, curY + 14, 515, 1).fill(borderLine);

      curY += 22;
      const landStatusBg = isFeasible ? '#f0fdf4' : '#fef2f2';
      const landBorder = isFeasible ? '#86efac' : '#fca5a5';
      doc.rect(40, curY, 515, 48).fill(landStatusBg);
      doc.rect(40, curY, 515, 48).stroke(landBorder);

      if (isFeasible) {
        doc.fillColor(accentGreen).fontSize(9).font('Helvetica-Bold').text('✓ FEASIBILITY CONFIRMED: ADEQUATE PARCEL AVAILABLE', 52, curY + 8);
        doc.fillColor(textMuted).fontSize(8).font('Helvetica').text(
          `The earmarked land area of ${dprRecord.availableLandAcres} Acres exceeds the required ${dprRecord.requiredLandAcres} Acres for installing ${dprRecord.totalRequiredKw} kW generation capacity. Sufficient buffer is available for inverter sheds, switchgear, and safety clearances.`,
          52, curY + 22, { width: 490 }
        );
      } else {
        doc.fillColor(accentRed).fontSize(9).font('Helvetica-Bold').text('⚠ LAND DEFICIT DETECTED: ADDITIONAL PARCEL MANDATORY', 52, curY + 8);
        doc.fillColor(textMuted).fontSize(8).font('Helvetica').text(
          `The available land (${dprRecord.availableLandAcres} Acres) falls short of the statutory ${dprRecord.requiredLandAcres} Acres required for ${dprRecord.totalRequiredKw} kW capacity. The project requires acquiring ${(dprRecord.requiredLandAcres - dprRecord.availableLandAcres).toFixed(2)} Acres additional contiguous land or reducing feeder cohorts.`,
          52, curY + 22, { width: 490 }
        );
      }

      // ==========================================
      // 7. FINANCIAL BUDGET ESTIMATION
      // ==========================================
      curY += 60;
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('4. FINANCIAL BUDGET & CAPITAL OUTLAY (CAPEX)', 40, curY);
      doc.rect(40, curY + 14, 515, 1).fill(borderLine);

      curY += 22;
      const budgetItems = [
        ['1. Solar PV Plant (Panels, Inverters, MMS, BOS) @ ₹60k/kW', `₹${dprRecord.solarBudget?.toLocaleString('en-IN') || Math.round(dprRecord.totalRequiredKw * 60000).toLocaleString('en-IN')}`],
        [`2. Substation Intertie & Transmission Line (${dprRecord.distanceToSubstation || 0} km)`, `₹${(dprRecord.transmissionLineCost || Math.round((dprRecord.distanceToSubstation || 0) * 150000)).toLocaleString('en-IN')}`],
        ['TOTAL ESTIMATED PROJECT OUTLAY', `₹${(dprRecord.totalEstimatedBudget || 0).toLocaleString('en-IN')}`]
      ];

      budgetItems.forEach((b, i) => {
        const isTotal = i === budgetItems.length - 1;
        const bY = curY + i * 18;
        if (isTotal) {
          doc.rect(40, bY - 2, 515, 20).fill('#0f172a');
          doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text(b[0], 48, bY + 3);
          doc.fillColor('#38bdf8').fontSize(9).font('Helvetica-Bold').text(b[1], 440, bY + 3);
        } else {
          if (i % 2 === 0) doc.rect(40, bY - 2, 515, 18).fill('#f8fafc');
          doc.fillColor(primaryColor).fontSize(8).font('Helvetica').text(b[0], 48, bY + 3);
          doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text(b[1], 440, bY + 3);
        }
      });

      // ==========================================
      // 8. STATUTORY SIGN-OFF & CERTIFICATION
      // ==========================================
      curY += 76;
      doc.rect(40, curY, 515, 55).stroke(borderLine);

      doc.fillColor(textMuted).fontSize(7).font('Helvetica-Bold').text('PREPARED & VERIFIED BY:', 55, curY + 8);
      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text('Divisional Solar Planning Cell', 55, curY + 20);
      doc.fillColor(textMuted).fontSize(7).font('Helvetica').text('Nodal Discom Authority', 55, curY + 32);

      doc.fillColor(textMuted).fontSize(7).font('Helvetica-Bold').text('LAND AUDIT CLEARANCE:', 215, curY + 8);
      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text(isFeasible ? 'Clearance Issued' : 'Provisional Withhold', 215, curY + 20);
      doc.fillColor(textMuted).fontSize(7).font('Helvetica').text('Revenue & Gram Panchayat Cell', 215, curY + 32);

      doc.fillColor(textMuted).fontSize(7).font('Helvetica-Bold').text('EXECUTIVE SANCTION:', 385, curY + 8);
      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text('Superintending Engineer', 385, curY + 20);
      doc.fillColor(textMuted).fontSize(7).font('Helvetica').text('Ministry Nodal Coordinator', 385, curY + 32);

      // Footer
      doc.fillColor(textMuted).fontSize(7).font('Helvetica').text(
        'Generated via Dual-Sided Solar Infrastructure & DPR Planning Platform • Confidential Official Record',
        40, 780, { align: 'center', width: 515 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

/**
 * Generates Personal Solar Installation Report (PDF) for Public Users using EJS + Puppeteer
 */
async function generatePersonalDPRPdf(inquiry, user = {}) {
  const candidateTemplatePaths = [
    path.join(__dirname, '../templates/personal-dpr-template.ejs'),
    path.join(__dirname, '../../templates/personal-dpr-template.ejs'),
    path.resolve(process.cwd(), 'src/templates/personal-dpr-template.ejs'),
    path.resolve(process.cwd(), 'templates/personal-dpr-template.ejs')
  ];

  let templateContent = null;
  for (const p of candidateTemplatePaths) {
    if (fs.existsSync(p)) {
      templateContent = fs.readFileSync(p, 'utf8');
      break;
    }
  }

  if (!templateContent) {
    throw new Error('Template personal-dpr-template.ejs not found');
  }

  const consumptionType = inquiry.consumptionData?.type || 'BILL';
  const consumptionValue = inquiry.consumptionData?.value;
  const recommendedKw = Number(inquiry.calculatedKw) || 1;
  const estimatedDailyKwh = Math.round(recommendedKw * 4 * 10) / 10;
  const grossCost = Number(inquiry.calculatedCost) || Math.round(recommendedKw * 60000);
  const subsidyAmount = Number(inquiry.subsidyAmount) || 0;
  const netCost = Number(inquiry.netCost) || Math.max(0, grossCost - subsidyAmount);
  const monthlySavingsEst = Math.round(estimatedDailyKwh * 30 * 8.5);
  const paybackYears = monthlySavingsEst > 0 ? (netCost / (monthlySavingsEst * 12)).toFixed(1) : '3.2';

  const html = ejs.render(templateContent, {
    inquiryId: inquiry._id,
    userName: inquiry.consumerName || user?.name || user?.displayName || 'Citizen Applicant',
    meterNumber: inquiry.meterNumber || user?.meterNumber || 'DL-MTR-UNKNOWN',
    city: inquiry.city || 'National Capital Region',
    dateGenerated: new Date(inquiry.createdAt || Date.now()).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }),
    recommendedKw,
    estimatedDailyKwh,
    grossCost,
    subsidyAmount,
    netCost,
    monthlySavingsEst,
    paybackYears,
    consumptionType,
    monthlyBillUnits: consumptionType === 'BILL' ? (Number(consumptionValue) || Math.round(recommendedKw * 120)) : 0,
    applianceCounts: (consumptionType === 'APPLIANCES' && typeof consumptionValue === 'object' && consumptionValue !== null) ? consumptionValue : {}
  });

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }).catch(async () => {
      const candidatePaths = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
      ].filter(Boolean);
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          return puppeteer.launch({
            headless: 'new',
            executablePath: p,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });
        }
      }
      throw new Error('No browser executable found for PDF generation');
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm'
      }
    });

    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

module.exports = {
  generateOfficialDPRPdf,
  generatePersonalDPRPdf
};
