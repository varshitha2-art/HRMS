# VPHS SERVICES PVT. LTD. – FACILITY MANAGEMENT & HR ERP PORTAL

A complete, production-ready enterprise Facility Management & HR ERP System built for **VPHS Services Pvt. Ltd.**

---

## 🌟 Key Features

1. **Authentication & Role-Based Access Control (RBAC)**:
   - 6 Defined Roles: `SUPER_ADMIN`, `ADMIN`, `HR`, `SITE_MANAGER`, `SUPERVISOR`, `EMPLOYEE`.
   - JWT authentication, password hashing, protected routes, and session memory.
   - 1-Click Quick Demo Login Switcher on the login screen for testing all 6 roles instantly.

2. **Workforce & Employee Management**:
   - Complete CRUD (Create, Read, Update, Delete/Deactivate).
   - Employee ID, Photo, Contact, Identity References (Aadhaar, PAN), Bank Details (A/C, IFSC), Statutory compliance (PF, ESI, UAN).
   - Site allocation, Shift scheduling, and Reporting Manager hierarchy.
   - Tabbed Employee Profile modal (Overview, CTC Breakdown, Documents Vault, Digital ID Card).

3. **Multi-Site Facility Management**:
   - Client deployment management (e.g. Microsoft Campus - Building 3, Third Wave Coffee - Multi Outlets, Amazon Development Center, VPHS HQ).
   - Site Manager & Supervisor assignments, contract dates, billing rates, and staff rosters.
   - 1-Click staff deployment to client sites.

4. **Biometric Attendance Calculation Engine**:
   - Configurable shift start timings (09:30 AM), grace periods (15 mins), half-day / full-day thresholds.
   - **Automatic Status & Penalty Calculation**: Entry past the grace period is automatically flagged as `LATE`, and late minutes are computed.
   - **Overtime Calculation**: Overtime hours are automatically calculated when working hours exceed the shift threshold.
   - **Dual Views**: Daily Attendance Roster with quick punch actions & Monthly Attendance Matrix (31-day calendar grid).

5. **Leave Management Workflow**:
   - Leave Types: Casual Leave (CL), Sick Leave (SL), Earned Leave (EL), Emergency Leave (EML), Loss of Pay (LOP).
   - Annual quota balance tracking per employee.
   - Employee application submission and HR/Supervisor approval queue with remarks.
   - **Auto-Sync**: Approved leaves automatically update daily attendance records to `LEAVE` status.

6. **Automated Monthly Payroll & Payslips**:
   - Batch computation engine: CTC, Basic (50%), DA (10%), HRA (40%), Conveyance, Special Allowance.
   - Statutory Deductions: Employee PF (12% up to ₹15,000 cap), ESI (0.75%), Professional Tax (₹200), LOP days deduction.
   - Workflow: `DRAFT` ➔ `CALCULATED` ➔ `VERIFIED` ➔ `APPROVED` ➔ `PAID`.
   - **Printable & Downloadable PDF Payslip**: Official VPHS company letterhead, CIN, PAN, GST, bank details, earnings & deductions breakdown, and net salary in words & figures.

7. **Digital ID Card Generator**:
   - CR80 standard digital ID card with front and back flip.
   - Live dynamic QR code with tamper-evident credential payload.
   - Direct high-resolution PDF download and print functionality.

8. **Compliance Document Vault**:
   - Upload Aadhaar, PAN, Bank passbooks, appointment letters, and medical certificates.
   - Automated 30-day expiry warning indicators (`VALID`, `EXPIRING`, `EXPIRED`).

9. **12 Enterprise Reports & Exports**:
   - Employee Master, Attendance Summary, Late Violations, Overtime Logs, Leave Register, Salary Register, Document Expiry, New Joiners, Exit Employees.
   - Instant Export to **Excel (.xlsx)** and **CSV (.csv)** with multi-filters.

10. **Bulk Data Import (Excel / CSV)**:
    - Drag-and-drop spreadsheet import for onboarding multiple staff members at once.
    - Full row-by-row validation (duplicate ID check, mobile length verification, relation mapping).
    - Error feedback table reporting exact line numbers and failure reasons.

11. **100% Standalone & Offline**:
    - Zero mandatory third-party API keys required.
    - All external services (SMTP email, SMS, WhatsApp, Biometric hardware) are isolated behind optional configuration flags.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Database Setup

1. **Install all dependencies**:
   ```bash
   npm install
   ```

2. **Initialize Database & Seed Realistic Demo Data**:
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

3. **Start the Application (Backend + Frontend)**:
   ```bash
   npm run dev
   ```

   - **Frontend URL**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## 🔑 Demo Login Credentials

All demo accounts use the default password: `password123`

| Role | Username | Description |
| :--- | :--- | :--- |
| **Super Admin** | `admin` | Full system control, settings, audit logs & admin management |
| **HR Manager** | `hr_manager` | Employee onboarding, leave approvals, documents & payroll |
| **Operations Admin** | `finance_dakshinya` | Financial operations, payroll approval & salary register |
| **Site Manager** | `site_manager` | Microsoft Campus site supervisor, attendance & roster |
| **Supervisor** | `supervisor` | Shift team attendance, late check-in recording |
| **Employee** | `employee_dawood` | Self-service profile, attendance history & payslip download |

*(Tip: You can also use the 1-Click Quick Demo buttons directly on the login page)*

---

## 🏗️ Project Structure

```
vphs-project/
├── client/                     # React 18 + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/         # Modals, Tables, Forms, Badges, Digital ID Card, Payslip
│   │   ├── layouts/            # MainLayout (Dark navy sidebar, Header, Search, Notifications)
│   │   ├── pages/              # Dashboard, Employees, Sites, Attendance, Leaves, Payroll, etc.
│   │   ├── contexts/           # AuthContext, NotificationContext
│   │   ├── services/           # Axios API Client with interceptors
│   │   ├── utils/              # Excel/CSV exporters, Currency & Date formatters
│   │   └── types/              # TypeScript interface definitions
│   └── package.json
├── server/                     # Node.js + Express.js + TypeScript
│   ├── src/
│   │   ├── controllers/        # Express route handlers
│   │   ├── routes/             # REST API routes (/api/auth, /api/employees, etc.)
│   │   ├── services/           # Attendance calculations, Payroll engine, Reports
│   │   ├── middleware/         # JWT Auth, RBAC, Multer upload, Error handlers
│   │   ├── validators/         # Zod schemas for request validation
│   │   ├── config/             # Environment constants and Prisma singleton
│   │   └── server.ts           # Main Express application entrypoint
│   └── package.json
├── prisma/
│   ├── schema.prisma           # Prisma database schema (20+ models, relations & indexes)
│   ├── seed.ts                 # Database seed script with authentic VPHS data
│   └── dev.db                  # Local database
├── uploads/                    # Local storage for uploaded documents and photos
├── .env.example
├── .env
└── package.json                # Root workspaces runner
```

---

## 🔒 Security & Compliance

- **Password Hashing**: Cryptographic PBKDF2/SHA-512 salting and hashing.
- **JWT Protection**: Signed JSON Web Tokens with strict expiry and role verification.
- **CORS & Helmet**: Secure HTTP headers and restricted origins.
- **Validation**: Request-level Zod schemas preventing malformed or malicious payloads.
- **Audit Logging**: Automated audit trail tracking all create, update, delete, approve, and payroll operations.
