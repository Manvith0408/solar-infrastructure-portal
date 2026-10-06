# SolarPulse • Dual-Sided Solar Infrastructure & DPR Planning Platform

A complete, production-ready full-stack web application designed for both residential consumers (**Public B2C Portal**) and state electricity utility planners (**Admin B2G Dashboard**). Built strictly according to Ministry of New and Renewable Energy (MNRE) guidelines and PM Surya Ghar: Muft Bijli Yojana subsidy architecture.

---

## 1. System Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │               UNIFIED FULL-STACK HOSTING               │
                    │               Express.js 4.x (Port 5000)               │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                      ┌─────────────────────────┴─────────────────────────┐
                      ▼                                                   ▼
         ┌─────────────────────────┐                         ┌─────────────────────────┐
         │   Static Frontend SPA   │                         │    Express REST APIs    │
         │  (Next.js 16 + Tailwind)│                         │     (/api/* Endpoints)  │
         │  Served from out/       │                         │                         │
         │  - Public B2C Portal    │                         │  - Auth & RBAC (Admin)  │
         │  - Admin B2G Dashboard  │                         │  - DPR PDF Generator    │
         │  - SPA Routing Fallback │                         │  - CRM Leads & CSV Exp  │
         └────────────┬────────────┘                         └────────────┬────────────┘
                      │                                                   │
                      └─────────────────────────┬─────────────────────────┘
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
                    │  * In-Memory Stats Caching via node-cache (60s TTL)   │
                    └────────────────────────────────────────────────────────┘
```

### Unified Single-Port Architecture (Port 5000)
In production and unified deployment mode, the application runs as a **single consolidated Node.js service on port 5000** (or cloud `PORT`):
- **API Routing**: Express manages all API routes under `/api/*` (`/api/auth`, `/api/users`, `/api/public`, `/api/admin`).
- **Static Asset Serving**: Express detects and serves pre-built static files from `frontend/out` via `express.static`.
- **SPA Client-Side Routing Fallback**: Any non-API route refresh (e.g., `/admin`, `/login`, `/dashboard`) gracefully resolves to `index.html`, eliminating 404 errors on direct browser navigation.
- **Protocol-Safe API Calls**: Client-side requests automatically patch protocol headers (`normalizeApiUrl`) to guarantee seamless connectivity whether deployed as unified service or separate microservices on cloud hosts like Render.

---

## 2. Environment & Runtime Requirements

- **Node.js**: **v20.x LTS or higher** (`node >= 20.0.0` pinned across all `package.json` configurations).
- **npm**: v10.x or higher.
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or automated in-memory document store fallback.
- **Firebase Project**: Firebase Auth & Admin SDK configured (supports explicit environment variables `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` for cloud deployments).
- **Python (Optional Tooling)**: Python 3.10+ with virtual environment (`.venv`) for DPR data science utilities (dependencies listed in `requirements.txt`).

---

## 3. Core Mathematical Benchmarks & Constants

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

## 4. Database Schema & Caching Specification

### Schema A: `PublicInquiry` (`backend/src/models/PublicInquiry.js`)
- `meterNumber`: String (Unique, Indexed)
- `consumptionData`: Object `{ type: 'BILL' | 'APPLIANCES', value: Number | JSON }`
- `calculatedKw`: Number
- `calculatedCost`: Number
- `status`: Enum (`'PENDING'`, `'APPROVED'`, `'COMMISSIONED'`) — Default: `'PENDING'`
- `vendorContacted`: Boolean (Default: `false`)
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

### In-Memory Caching (`node-cache`)
- **Key**: `lead_stats_agg` (TTL: 60s)
- **Function**: Caches heavy MongoDB `$group` aggregation pipeline calculations on `GET /api/admin/leads`.
- **Invalidation Triggers**: Auto-purged whenever lead statuses transition or new citizen inquiries/ratings are recorded (`calculateAndSaveInquiry`, `createInquiry`, `submitFeedback`, `updateLeadStatus`).

---

## 5. REST API Endpoints

### Public Domain
- `POST /api/public/calculate`
  - Body: `{ meterNumber, consumptionData: { type, value }, consumerName, city }`
  - Returns: `{ calculatedKw, grossCost, subsidyAmount, netCost, batteryBackupKwh, meterNumber, sizingDetails }`
- `POST /api/public/inquiry`
  - Body: `{ calculatedKw, grossCost, subsidyAmount, netCost, meterNumber, consumerName, city }`
  - Returns: Saved `PublicInquiry` document (201 Created).
- `GET /api/public/my-inquiries`
  - Headers: `Authorization: Bearer <Firebase_ID_Token>`
  - Returns: Array of citizen inquiries submitted by the authenticated user.
- `GET /api/public/inquiry/:id/download-pdf`
  - Headers: `Authorization: Bearer <Firebase_ID_Token>`
  - Returns: Personal Solar DPR PDF download buffer (`application/pdf`).
- `PATCH /api/public/feedback`
  - Body: `{ inquiryId, meterNumber, rating }` (1–5)
  - Returns: `{ success: true, feedbackRating }`
- `GET /api/public/vendors`
  - Query params: `pincode` (optional)
  - Returns: Array of empanelled turnkey solar vendors.

### Admin Domain (RBAC Protected: `ADMIN` Role Required)
- `GET /api/admin/leads`
  - Query params: `page`, `limit`, `status`, `search`
  - Returns: Paginated `PublicInquiry` records with cached pipeline metrics (`totalDemandedKw`, `pendingCount`, `avgRating`).
- `PATCH /api/admin/leads/:id/status`
  - Body: `{ status: 'PENDING' | 'APPROVED' | 'COMMISSIONED' }`
  - Returns: Updated lead document; invalidates `lead_stats_agg` cache.
- `GET /api/admin/leads/export` *(New Endpoint)*
  - Query params: `status` (optional filter), `search` (optional filter)
  - Headers: `Authorization: Bearer <Firebase_Admin_Token>`
  - Description: Streams an RFC-4180 compliant CSV export file of filtered or total CRM leads.
  - Response Headers:
    - `Content-Type: text/csv; charset=utf-8`
    - `Content-Disposition: attachment; filename="crm-leads-export-YYYY-MM-DD.csv"`
  - Export Columns:
    ```csv
    Inquiry ID,Date,Meter Number,Consumer Name,Phone,City,Calculated kW,Gross Cost (INR),Subsidy Amount (INR),Net Cost (INR),Status,Feedback Rating
    ```
- `POST /api/admin/dpr/generate`
  - Body: `{ areaName, availableLandAcres, distanceToSubstation, cohortData, returnJson? }`
  - Returns: Certified Government DPR PDF (`application/pdf`) with `X-DPR-Number` and `X-DPR-Feasible` headers.
- `GET /api/admin/dpr`
  - Returns: List of historically generated area DPR records.
- `GET /api/admin/dpr/:id/download`
  - Returns: Downloads saved official DPR PDF.

---

## 6. How to Run Locally

### Production Unified Mode (Single Command on Port 5000):
Builds the Next.js frontend export and boots the Express full-stack engine serving both static UI and APIs:
```bash
npm start
```
- **Unified Application**: `http://localhost:5000`
- **Admin Dashboard**: `http://localhost:5000/admin`
- **API Health Check**: `http://localhost:5000/api/health`

### Development Mode (Concurrent Multi-Port):
Runs Next.js Turbopack development server on port 3000 and Express backend on port 5000 with hot reloading:
```bash
npm run dev
```
- **Frontend Dev Server**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`

### Automated Verification Suite:
Run the comprehensive test suite verifying unified hosting, SPA fallback, CSV export, and logger integrity:
```bash
npm run test:verify
```

---

## 7. Logging & Diagnostics

The backend includes a zero-overhead colored terminal logging middleware ([`backend/src/middleware/requestLogger.js`](file:///c:/Users/manvi/Desktop/sdpr/backend/src/middleware/requestLogger.js)):
- **Color-Coded HTTP Methods**: GET (Green), POST (Blue), PUT (Yellow), PATCH (Magenta), DELETE (Red).
- **Status Highlighting**: 2xx (Green), 3xx (Cyan), 4xx (Yellow), 5xx (Red).
- **Format**: `[YYYY-MM-DD HH:mm:ss] METHOD  /path STATUS LATENCYms`
- **Payload Safety**: Operates strictly on response finish events without altering JSON payloads or streaming binaries.
