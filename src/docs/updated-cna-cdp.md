# Technical Master Blueprint: BIRE Integrated Support Platform

## 1. System Logic Overview

- **Transition:** Move from a _Passive Spreadsheet_ to an **Active State Machine**.
- **Golden Rule:** Every data point must have:
  - **Source**: Where it comes from.
  - **Target**: What it triggers next.
- **Sequential Logic:**

  1. **Onboarding** (Sets Baseline) &rarr;
  2. **CNA Diagnostic** (Calculates Gaps) &rarr;
  3. **CDP Planning** (Maps Interventions) &rarr;
  4. **Implementation** (Logs Progress) &rarr;
  5. **M&E** (Measures Impact)

---

## 2. Module: The CNA Diagnostic (_The Evaluation Engine_)

- **Purpose:** Replaces the "Needs Assessment Diagnostic" tab. 
- **Action:** Build as a structured survey.

### 2.1 Scoring Logic & UI Behavior

- **Scale:** 3-point Likert (0, 5, 10)
- **Enforcement:**
  - **Score 0 (POOR):**
    - Triggers **High Priority** (_Red_)
    - Mandatory **Reason** field.
    - Automatically added to _Unaddressed Gaps_ list.
  - **Score 5 (FAIR):**
    - Triggers **Medium Priority** (_Yellow_)
    - Mandatory **Reason** field.
    - Automatically added to _Unaddressed Gaps_ list.
  - **Score 10 (GREAT):**
    - Triggers **Low Priority** (_Green_)
    - **Reason** field is optional.

### 2.2 Focus Area Breakdown (Sections A–L)

| Code | Focus Area             | Example Criteria from Excel                                                                                 |
|------|-----------------------|------------------------------------------------------------------------------------------------------------|
| A    | Product Assessment    | Differentiation from competitors, quality measures, pricing strategy                                       |
| B    | Business Model        | Clarity of revenue streams, value proposition, cost structure                                              |
| C    | Market & Customer     | Customer retention, market research depth, competitor awareness                                            |
| D    | Finance Management    | Record keeping, budgeting, separation of personal/business funds                                           |
| E    | Technical Capacity    | Specialised equipment, technical skills of the team, IP protection                                        |
| F    | Systems & Digital     | Use of digital tools (POS, CRM), automated processes, data security                                       |
| G    | Distribution          | Logistics efficiency, supply chain stability, channel partnerships                                        |
| H    | Scalability           | Standard Operating Procedures (SOPs), ability to replicate model                                          |
| I    | Access to Finance     | Investment readiness, formal financial statements, debt capacity                                          |
| J    | Risk Assessment       | Operational, climate, and financial risk mitigation plans                                                 |
| K    | Climate & ESG         | Environmental sustainability, waste management, inclusion policies                                        |
| L    | Impact                | Job creation (Youth/Women), local economic development metrics                                            |

---

## 3. Module: The CDP & OKR Planner

**Goal:** Convert "Red" and "Yellow" scores into a formal Capacity Development Plan (CDP).

### 3.1 The Intervention Mapping

- **Gap Board:** Software displays all questions that scored 0 or 5.
- **Intervention Selection:** For each gap, R/EDO selects an intervention from the Bootcamp Curriculum.

  - **Example:**  
    - If _Area B (Business Model)_ is a gap &rarr; Select "_Week 2: Business Modelling_"
    - If _Area D (Finance)_ is a gap &rarr; Select "_Week 4: Business Planning & Financials_"

### 3.2 The OKR Math (Hard-Coded Calculations)

- **Business Support OKRs Logic:**
  - **Weights:** Total weight of Key Results (KRs) for one Objective must equal 1.0.
  - **Weighted Score Calculation:**

    $$
    \text{Final Score} = \left( \frac{\text{Achieved Outcome}}{\text{Target Outcome}} \right)
    $$

    $$
    \text{Weighted Score} = \text{Final Score} \times \text{Weight of KR}
    $$

- **UI Warning:** If weights &ne; 1.0, show a "Validation Error" and prevent saving.

---

## 4. Module: Support Session Log (_The Activity Tracker_)

- **Purpose:** Replaces Support Session Log & Weekly Milestone Tracker.

### 4.1 Strict Session Rules

Per 60-day agreement, the software enforces a **Mentorship State Machine**:

- **Session 1 & 6 (Physical):** UI **requires file upload** (photo of session) before "Complete" button is clickable.
- **Session 2-5 (Virtual):** UI accepts meeting links (Zoom/Google Meet) as evidence.
- **Session Sequencing:** Cannot log Session 3 until Session 2 is marked "Approved" by Admin.

### 4.2 Logging Data Points

- **Focus Area Code (A-L):** Multi-select dropdown links session to diagnostic gaps.
- **Key Actions Agreed:** Persist between sessions. On next session log, show "Previous Actions" for status verification.

---

## 5. Agent Coding Instructions (_Directives_)

### 5.1 Database Schema (_Drizzle ORM_)

- **Relationships:**
  - `cna_diagnostics` &rarr; hasMany &rarr; `cna_scores` (store 0, 5, 10 + "Reason" text)
  - `cdp_plans` &rarr; belongsTo &rarr; `cna_diagnostics`
  - `okr_results` &rarr; hasMany &rarr; `milestones`

### 5.2 UI/UX Requirements

- **"Dashboard" View:** Show progress bar titled **"Total Milestone Completion"**
- **Color Coding:** Use hex codes:
  - `#FF0000` (Red)
  - `#FFFF00` (Yellow)
  - `#00FF00` (Green)
- **Auto-Save:** Each CNA score saved to DB via `onBlur` or "Save Draft" to prevent data loss.

---

## 6. Definition of Done

Project complete when all below are true:

- R/EDO can fill CNA, and system automatically detects which areas need a CDP.
- CDP generates **Weighted OKR scores** _without manual calculation_
- Mentor can upload a photo for Session 1, unlocking the ability to log Session 2.
- A final **Impact Report** can be exported as a PDF showing _Baseline vs. Endline job and revenue growth_.