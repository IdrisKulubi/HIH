## 1. Overview

The BIRE Portal is a full digital system designed to manage the entire lifecycle of enterprise applications across two tracks:

- **Foundation Phase**
- **Acceleration Phase**

This document defines all functional and technical requirements for the system, from applicant submission to final selection.

## 2. Goals of the System

- Enable a seamless, digital Call for Applications process.
- Automate eligibility checks and scoring based on provided criteria.
- Provide dashboards for admins, verifiers, and committee reviewers.
- Ensure secure management of documents and applicant data.
- Support future integration with an investment portal.

## 3. User Roles

### 1. Applicant
- Creates an account
- Completes eligibility screening
- Fills forms (multi-step)
- Uploads documents
- Tracks application status

### 2. Admin (Verification Team)
- Reviews submissions
- Verifies documents
- Approves / rejects / requests resubmission
- Views auto-scores

### 3. Committee Reviewer
- Reviews verified applications
- Adjusts scoring
- Adds comments
- Approves or rejects candidates

### 4. Super Admin
- Full system access
- User management
- Reporting
- Exporting data

## 4. High-Level System Flow

1. Applicant creates account
2. Applicant completes eligibility form
3. System routes to **Foundation** or **Accelerator**
4. Applicant fills detailed multi-step application form
5. Documents uploaded
6. System performs automatic scoring
7. Admin verifies submission
8. Committee performs final scoring & approval
9. Applicant receives outcome
10. Data available for reporting & export

## 5. Functional Requirements

### 5.1 Authentication
- Email or phone login
- OTP verification
- Password reset
- Secure session handling (BetterAuth / Supabase Auth)

### 5.2 Applicant Portal

#### 5.2.1 Profile Setup
- Personal details
- Business details
- Contact information

#### 5.2.2 Eligibility Screening
**Inputs:**
- Years in operation
- Revenue band
- Number of employees
- Registration status
- Compliance details

**Outputs:**
- Foundation Track
- Accelerator Track
- Auto-disqualified (if not eligible)

#### 5.2.3 Application Forms
Multi-step forms including:
- Business model
- Market potential
- Financial performance
- Social impact
- Future growth plans
- Supporting documents

#### 5.2.4 Document Uploads
Using **UploadThing**:
- Registration certificate
- Financial statements
- Mpesa/bank statements
- Photos
- Compliance documents

### 5.3 Automated Scoring Engine

#### Foundation Track Scoring (100 pts)
- Commercial Viability (20)
- Market Potential (30)
- Social Impact (40)
- Business Model (10)
- **Minimum required score: 70**

#### Accelerator Track Scoring (100 pts)
- Revenue & Growth (20)
- Impact Potential (20)
- Scalability (20)
- Social & Environmental Impact (20)
- Business Model (20)
- **Minimum required score: 70**

**The scoring engine must:**
- Calculate scores instantly upon submission
- Store scoring logs
- Allow admin/committee overrides

### 5.4 Admin Dashboard

#### Core Features
- View all applications
- Filter by: track, county, revenue band, gender, sector
- Verify documents
- Approve, reject, or request updates
- Review automatic scoring

#### Verification Tools
- Checklist
- File previewer
- Comments section

### 5.5 Committee Dashboard

#### Features
- View only verified applications
- Adjust scoring
- Add remarks
- Approve / reject final selection

### 5.6 Notifications (Resend)
System must send:
- Account verification
- Submission confirmation
- Status updates
- Request for missing documents
- Acceptance / rejection

### 5.7 Reporting & Export
- Export selected applicants to Excel
- Export all fields for monitoring
- **Summary dashboard:**
    - Applicants by county
    - Applicants by track
    - Gender/youth/PWD insights
    - Average scoring
    - Number verified, rejected, selected

## 6. Non-Functional Requirements

### Performance
- System must support high traffic during CfA rush
- Optimized queries
- CDN-backed hosting via Vercel

### Security
- Role-based access
- Secure file storage
- Encrypted user data
- Audit logs

### Reliability
- Vercel hosting
- Neon automatic backups
- Resilient API routes

### Scalability
- Stateless frontend
- Horizontal scaling via Vercel
- Neon scalable PostgreSQL

## 7. Technical Stack

- **Frontend:** Next.js
- **Backend:** Next.js Server Actions / API Routes
- **Database:** Neon (PostgreSQL)
- **ORM:** Drizzle
- **Storage:** UploadThing
- **Email:** Resend
- **Hosting:** Vercel

## 8. Project Milestones (Matching the Contract)

### Deliverable 1:
- Inception Report
- System Blueprint

### Deliverable 2:
- 50% portal modules
- CfA forms
- Dashboards v1
- Scoring workspace v1

### Deliverable 3:
- Complete system
- Training
- Full documentation
- Handover

## 9. Completion Criteria

The project is complete when:
- All modules are developed
- Full scoring engine operational
- Admin & committee dashboards functional
- System fully tested
- Users trained
- Documentation delivered
