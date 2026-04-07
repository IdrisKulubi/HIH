# KYC Profile Module

## 1. Module Objective

The KYC (Know Your Customer) Profile module acts as the formal transition gateway for enterprises that have passed the initial application and selection phases. Rather than requiring enterprises to re-enter their information from scratch, the module:

- Pre-populates known data for review and updating.
- Captures missing legal compliance documents.
- Locks the enterprise profile for downstream modules (A2F, Mentorship, M&E) upon completion.

---

## 2. User Roles & Permissions

- **Selected Enterprise Owner:**  
  Existing user flagged as "Approved/Selected" in the application module.

- **Regional/Enterprise Development Officer (R/EDO):**  
  Staff who assist enterprises in meeting KYC requirements.

- **Verification Admin:**  
  Senior staff responsible for the final legal and compliance check before unlocking the system for the enterprise.

---

## 3. Feature Breakdown & Workflows

### Feature 1: Post-Selection Access & State Routing

- **No New Registration Required:**  
  Users log in with their existing application credentials.

- **Smart Routing:**  
  On login, if a user’s `application_status` is "Selected" and `verification_status` is "Pending KYC", they are automatically directed to the KYC Onboarding Dashboard and cannot access Mentorship or A2F modules yet.

- **Welcome Context:**  
  A clear welcome screen explains that, as selected candidates, they must now provide formal compliance documentation to unlock their benefits.

---

### Feature 2: Data Verification & Enrichment Pipeline (Pre-Filled Wizard)

A multi-step wizard guides the enterprise through review and completion.

- **Step 1: Founder Demographics (Review & Append)**
  - *Pre-filled*: Name, Email, Phone, Gender.
  - *Action Required*: Review for accuracy, correct typos, and input any missing legal data (e.g., ID/Passport numbers for all directors, secondary contacts).

- **Step 2: Business Fundamentals (Review & Lock)**
  - *Pre-filled*: Business Name, Sector, County.
  - *Action Required*: Provide exact GPS coordinates for the main operational site and confirm formal Registration Type.

- **Step 3: Baseline Financials & Impact (Update for Baseline)**
  - *Pre-filled*: Revenue and employee numbers from the original application.
  - *Action Required*: Update these numbers to the current month ("Month 0 Baseline") for the M&E module.

---

### Feature 3: Delta Document Management

- **Pre-existing Documents:**  
  Show a read-only view of documents already uploaded during the application—no need to re-upload.

- **New Mandatory Uploads:**  
  Request and upload the following compliance documents:
  - Up-to-date KRA PIN / Tax Compliance Certificate.
  - CR12 (for Limited Companies) to verify directors.
  - Proof of Formal Bank Account (required for A2F disbursements).
  - Signed BIRE Programme Code of Conduct / Consent form.

---

### Feature 4: Admin KYC "Upgrade" Workspace

- **Verification Queue:**  
  Dashboard displaying all "Selected" enterprises with submitted KYC updates.

- **Delta Highlighting:**  
  Changes made from the original application (e.g., updated revenue or business name) are visually flagged for easy admin review.

- **Document Cross-Check:**  
  Admins can compare side-by-side new legal documents with pre-filled data (ex: verify CR12 names match the platform records).

- **"Lock & Activate" Button:**  
  On approval, the enterprise’s `verification_status` is set to "Verified".

---

### Feature 5: The "Verified Profile" (Single Source of Truth)

- **System Unlock:**  
  Verifying the profile unlocks modules such as Mentorship, M&E, and Capacity Needs Assessment for the enterprise.

- **Immutable Core Data:**  
  Once verified, core profile data (e.g., Business Name, KRA PIN, Baseline Revenue) is locked. Any future changes require a formal "Request Change" that needs admin approval.

---

## 4. Definition of Done (Completion Criteria)

- Existing applicants can log in and see their old data pre-populated in the new KYC wizard.
- Applicants can update baseline numbers and upload required compliance documents.
- Admins can clearly see updated fields, review new documents, and verify the enterprise.
- Once verified, the enterprise dashboard unlocks relevant Phase 2 modules, and core data becomes locked from casual editing.