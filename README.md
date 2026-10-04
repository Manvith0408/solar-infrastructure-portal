# SolarPulse • Dual-Sided Solar Infrastructure & DPR Planning Platform

A complete, production-ready full-stack web application designed for both residential consumers (**Public B2C Portal**) and state electricity utility planners (**Admin B2G Dashboard**). Built strictly according to Ministry of New and Renewable Energy (MNRE) guidelines and PM Surya Ghar: Muft Bijli Yojana subsidy architecture.

---

## 1. System Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │                    CLIENT APPLICATION                  │
                    │               Next.js 16 + Tailwind CSS v4             │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
        ┌─────────────────────────┐                           ┌─────────────────────────┐
        │   Public B2C Portal     │                           │   Admin B2G Dashboard   │
        │   (Dark "Eco-Modern")   │                           │   (Desktop SaaS Light)  │
        │   - Bill / Appliance UI │                           │   - Lead CRM & Kanban   │
        │   - Framer Motion Cards │                           │   - Split-Pane DPR Tool │
        │   - 5-Star Feedback     │                           │   - Land Deficit Alert  │
        └────────────┬────────────┘                           └────────────┬────────────┘
                     │                                                     │
                     └──────────────────────────┬──────────────────────────┘
                                                │ REST API (JSON & PDF Stream)
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               EXPRESS.JS BACKEND ENGINE                │
                    │                    Node.js 24 + REST                   │
                    │  - Strict Math Models   - PDFKit Vector Generator      │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │             STRICT SCHEMA ISOLATION (MONGODB)          │
                    │                                                        │
                    │  ┌───────────────────────┐  ┌───────────────────────┐  │
                    │  │ Schema A:             │  │ Schema B:             │  │
                    │  │ PublicInquiry         │  │ OfficialAreaDPR       │  │
                    │  │ (The Demand Radar)    │  │ (The Ground Truth)    │  │
                    │  └───────────────────────┘  └───────────────────────┘  │
                    │  * Dual-mode: Native MongoDB or Zero-Config In-Memory  │
                    └────────────────────────────────────────────────────────┘
```

---

## 2. Core Mathematical Benchmarks & Constants

All formulas are standardized in `backend/src/utils/solarConstants.js` and `frontend/src/lib/constants.ts`:

| Parameter | Regulatory Standard / Formula | Notes |
|---|---|---|
| **Solar Yield** | **1 kW = 4 kWh (units) / day** | 120 kWh per 30-day month |
| **Capital Outlay (CapEx)** | **₹60,000 per kW** | Turnkey installation (Panels, Inverter, MMS, BOS) |
| **Land Density Ratio** | **4 Acres per 1000 kW (1 MW)** | `0.004 Acres / kW` (250 kW / Acre) |
| **Feeder Transmission Loss** | **+10.0% loss multiplier** | Applied to Gross Cohort Generation in DPR sizing |
| **PM Surya Ghar Subsidy: 1 kW** | **₹30,000 flat** | Direct DBT to consumer |
| **PM Surya Ghar Subsidy: 2 kW** | **₹60,000 flat** | Direct DBT to consumer |
| **PM Surya Ghar Subsidy: ≥ 3 kW** | **₹78,000 max cap** | Capped at ₹78,000 maximum central assistance |
| **Battery Storage Sizing** | **2.0 kWh per installed kW** | ~8 hours residential night-load autonomy |

### Appliance Wattage Constants:
- **Ceiling Fan**: 75W (10 hrs/day)
- **LED Bulb**: 10W (6 hrs/day)
- **Smart TV**: 100W (5 hrs/day)
- **Refrigerator**: 200W (12 hrs compressor cycle)
- **Inverter AC**: 1500W (6 hrs/day)

---

## 3. Database Schema Specification

### Schema A: `PublicInquiry` (`backend/src/models/PublicInquiry.js`)
- `meterNumber`: String (Unique, Indexed)
- `consumptionData`: Object `{ type: 'BILL' | 'APPLIANCES', value: Number | JSON }`
- `calculatedKw`: Number
- `calculatedCost`: Number
- `status`: Enum (`'PENDING'`, `'APPROVED'`, `'COMMISSIONED'`) — Default: `'PENDING'`
- `vendorContacted`: Boolean (Default: `false`) — Flags inquiries where homeowner initiated installer outreach.
- Additional metadata: `userPhone`, `selectedVendorId`, `subsidyAmount`, `netCost`, `batteryBackupKwh`, `consumerName`, `city`.

### Schema B: `OfficialAreaDPR` (`backend/src/models/OfficialAreaDPR.js`)
- `areaName`: String
- `availableLandAcres`: Number
- `distanceToSubstation`: Number
- `cohortData`: Array of Objects `[{ type: 'APPLIANCE' | 'KW', houses: Number, loadDetails: JSON }]`
- `totalRequiredKw`: Number
- `totalEstimatedBudget`: Number
- `landFeasible`: Boolean
- Additional metadata: `dprNumber`, `totalHouses`, `totalDailyKwh`, `requiredLandAcres`, `solarBudget`, `transmissionLineCost`.

---

## 4. REST API Endpoints

### Public Domain
- `POST /api/public/calculate`
  - Body: `{ meterNumber, consumptionData: { type, value }, consumerName, city }`
  - Returns: `{ calculatedKw, grossCost, subsidyAmount, netCost, batteryBackupKwh, meterNumber, sizingDetails }`
- `PATCH /api/public/feedback`
  - Body: `{ inquiryId, meterNumber, rating }` (1–5)
  - Returns: `{ success: true, feedbackRating }`

### Admin Domain
- `GET /api/admin/leads`
  - Query params: `page`, `limit`, `status`, `search`
  - Returns: Paginated `PublicInquiry` records with pipeline aggregates (`totalDemandedKw`, `pendingCount`, `avgRating`).
- `PATCH /api/admin/leads/:id/status`
  - Body: `{ status: 'PENDING' | 'APPROVED' | 'COMMISSIONED' }`
  - Returns: Updated lead document.
- `POST /api/admin/dpr/generate`
  - Body: `{ areaName, availableLandAcres, distanceToSubstation, cohortData, returnJson? }`
  - Returns: **Official Government DPR PDF buffer** (`application/pdf`) with headers `Content-Disposition`, `X-DPR-Number`, and `X-DPR-Feasible`.
  - (Add `?format=json` for JSON payload preview).

---

## 5. Frontend Experiences

### 1. Public B2C Portal (`http://localhost:3000`)
- **Theme**: Mobile-first, Dark Mode ("Eco-Modern"), deep slate backgrounds (`#090d16`), electric yellow & neon green accents.
- **Component 1 (Input Selector)**: Toggle between "Monthly Bill (kWh)" and "Appliance Counter" with animated spring pills.
- **Component 2 (Appliance Wizard)**: Visual grid for Fans, Bulbs, TVs, Refrigerators, and ACs with [+] and [-] stepper buttons and real-time watt counters.
- **Component 3 (Live Output UI)**: Framer Motion staggered entrance cards:
  1. *Recommended System Size (kW)*
  2. *Battery Storage Backup (kWh)*
  3. *Gross Project Cost (₹)*
  4. *Net Cost after PM Surya Ghar Subsidy (₹)*
- **Component 4 (Citizen Feedback)**: 5-star interactive rating with haptic hover states and confetti burst on submission.

### 2. Admin B2G Dashboard (`http://localhost:3000/admin`)
- **Theme**: Desktop-first SaaS, light mode, high information density, clean slate styling.
- **Navigation Sidebar**: Switch between "Lead CRM & Radar" and "Area DPR Generator" with live pending inquiry badges.
- **View A (Lead CRM)**:
  - KPI summary tiles: Total Demand kW, Pipeline CapEx, Pending Audits, Citizen Rating.
  - View switcher: Toggle between **Styled Data Table** and **Interactive Kanban Board**.
  - Interactive status badges (Yellow=Pending, Purple=Approved, Blue=Assigned, Green=Commissioned) that immediately trigger PATCH API updates.
- **View B (Area DPR Generator - Split-Pane)**:
  - **Left Pane (Input Workspace)**: Feeder Area Name, Available Land (Acres), Substation Distance (km), Dynamic "Add Cohort" manager toggling between [Appliance Mode] and [Direct kW Mode].
  - **Right Pane (Live Sticky Summary)**:
    - Real-time sum of households and daily kWh demand.
    - Base Solar Capacity + 10% Feeder Loss = Total Installed Solar Plant.
    - **Land Check**: 1000 kW requires 4 Acres.
      - **Red Alert Badge**: Rendered with pulse animation if `Required Land > Available Land` with exact deficit acreage.
      - **Green Feasible Badge**: Rendered if adequate parcel is earmarked.
    - Statutory CapEx Budget estimate (Solar PV Plant + Substation Grid Intertie Line).
    - **Generate Official PDF DPR Button**: Emits certified multi-page PDF buffer directly downloaded to the user's computer.

---

## 6. How to Run Locally

### Start Both Backend & Frontend with One Command:
```bash
npm run dev
```

- **Frontend Application**: `http://localhost:3000`
- **Admin B2G Dashboard**: `http://localhost:3000/admin`
- **Express Backend API**: `http://localhost:5000`
- **Backend Health Check**: `http://localhost:5000/api/health`

### Run Services Individually (Optional):
```bash
# In backend/
cd backend
npm run dev

# In frontend/
cd frontend
npm run dev
```
