# CNA / CDP implementation guide

This document describes what was implemented to align the product with `updated-cna-cdp.md` (BIRE blueprint), and the operational steps to roll it out safely.

## 1. What shipped in code

### 1.1 Full CNA (A–L) instead of the quick four-dimension form

- **Database:** New table `cna_scores` (`diagnostic_id`, `focus_code`, `score0to10`, `gap_reason`, timestamps). One row per focus code per diagnostic, unique on `(diagnostic_id, focus_code)`.
- **Legacy columns:** `cna_diagnostics.financial_management_score` (and the other three legacy integers) are **nullable** so new full-survey rows do not populate them.
- **Admin UI:** `/admin/cna/[businessId]` uses a single form with all **A–L** areas, scores **0 / 5 / 10**, and a **reason / gap** field. Reasons are **required** when the score is **0** or **5** (enforced in Zod on the server).
- **Rollups:** `top_risk_area` and `resilience_index` on `cna_diagnostics` are derived from the twelve scores (lowest score wins with A→L tie-break; resilience ≈ average score × 10 on a 0–100 style scale).

### 1.2 CDP: key gaps for scores 0 or 5

- **`cdp_focus_summary`:** The same rule as CNA applies in CDP: for each focus row with `score0to10` **0** or **5**, **`key_gaps`** must be non-empty.
- **Enforcement:** Zod (`cdpFocusSummaryInputSchema`), **Mark active** gate (`assertCdpActivationReadiness`), and pipeline completeness (`diagnosticScoresValid` includes key-gap coverage).

### 1.3 OKR weights: per objective (not whole plan)

- **Activation:** Each objective that has at least one key result must have key result **weights summing to 100%** (same floating tolerance as before: `CDP_KR_WEIGHT_SUM_TOLERANCE`).
- **UI:** CDP OKR tab shows per-objective weight sum and validation colouring; enterprise read-only CDP page shows per-objective lines instead of a single global total.

### 1.4 Weighted OKR scores (computed display)

- **Formula (when values parse as numbers):**  
  `final_ratio = achieved / target` (target &gt; 0),  
  `weighted = final_ratio × (weight_percent / 100)`.
- **Parsing:** `target_outcome` and `achieved_outcome` are still **text** fields; numeric substrings are parsed (e.g. `100`, `75`, `15%`).
- **UI:** OKR table columns: **Final ratio**, **Weighted**, and **Σ weighted** per objective when all KRs in that objective have parseable numbers.

### 1.5 Import CNA → CDP

- **Latest diagnostic** is loaded with `cna_scores`.
- If **12 scores** exist → import maps them into `cdp_focus_summary` (scores + key gaps from `gap_reason`).
- Else if **legacy four columns** are all non-null → previous **legacy bridge** behaviour (suggested A–L with defaults) still applies.
- Else → clear error asking staff to complete a CNA.

---

## 2. Steps you must follow (operations)

1. **Apply the database migration**  
   Run your usual migration process against PostgreSQL so `0015_cna_scores_full_survey.sql` is applied (creates `cna_scores`, relaxes NOT NULL on the four legacy CNA columns). Until this runs, inserts that omit legacy scores will fail.

2. **Smoke-test CNA**  
   As admin: open **CNA** for a business, submit one full A–L diagnostic, confirm history shows **Full A–L** and scores look correct.

3. **Smoke-test CDP**  
   Open **CDP** for the same business: **Import scores from latest CNA**, confirm A–L rows and key gaps. Try **Mark active** with intentional mistakes (missing key gap on 0/5, wrong per-objective weights) and confirm error messages.

4. **Regression: legacy businesses**  
   If any row still has only the old four scores and no `cna_scores`, import should still work via the legacy path until staff re-run a full CNA.

5. **Optional backlog (not required for this slice)**  
   - Enterprise self-service CNA (today CNA is **admin-only**).  
   - Dedicated DB columns for numeric KR targets/achieved (instead of text parsing).  
   - Inline edit for key results (today: add/delete; achieved values can be added at create time).

---

## 3. Developer references

| Area | Primary files |
|------|----------------|
| Schema / migration | `db/schema.ts`, `drizzle/0015_cna_scores_full_survey.sql` |
| CNA actions + types | `src/lib/actions/cna.ts` |
| CNA outputs | `src/lib/cna/compute-cna-outputs.ts` |
| CNA form | `src/components/admin/cna/CnaDiagnosticForm.tsx` |
| CDP import | `src/lib/cdp/legacy-cna-bridge.ts`, `src/lib/actions/cdp.ts` (`importCdpSummariesFromLatestCna`) |
| Activation + pipeline | `src/lib/cdp/pipeline.ts` |
| OKR display math | `src/lib/cdp/okr-scoring.ts` |
| CDP workspace UI | `src/components/admin/cdp/CdpWorkspace.tsx` |
| Manual regression | `npx tsx src/lib/cdp/pipeline.manual.test.ts` |

---

## 4. Blueprint cross-check

| Blueprint item | Status |
|----------------|--------|
| CNA A–L, 0/5/10, mandatory reason for 0 & 5 | Implemented (CNA + mirrored rule on CDP summary) |
| `cna_scores` (or equivalent child rows) | Implemented as `cna_scores` |
| CDP belongs to / links CNA | Unchanged: `linked_cna_diagnostic_id` + import flow |
| KR weights = 1.0 per objective | Implemented as **100% per objective** |
| Weighted score from achieved/target | Implemented as **read-side display** + optional achieved on create |

If product owners want **strict** numeric-only targets (reject non-numeric text), add validation in `createCdpKeyResult` / `updateCdpKeyResult` and tighten `parseOutcomeMetric` rules in a follow-up.
