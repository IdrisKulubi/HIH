# MEL Reporting Guide

## Trusted results

Official dashboards and exports include only monitoring submissions and programme-level entries with an `approved` status. Draft, returned, reopened, rejected, and voided records are excluded automatically. Reapprove a corrected record before expecting it to return to official actuals.

## Recalculate the ITT

1. Open **Management → MEL Reporting**.
2. Select a reporting period and any valid track, county, or sector filters.
3. Review the preview values and missing-data notes.
4. Select **Recalculate** to persist the deterministic results, calculation version, source identifiers, and timestamp.
5. Open the source-count link for any indicator to inspect its lineage.

Recalculation never changes source records. A stored result is current only when its calculation hash matches the active definition, filters, targets, and approved inputs.

## Programme-level results

Use **Programme Results** for indicators whose configured source is `programme_mel_entry`, including policy briefs, forums, partnerships, and policies. Save the entry as a draft, attach an evidence URL when required, then approve it. Reopened or voided entries leave official actuals immediately.

For percentage indicators enter both numerator and denominator. Do not enter a pre-calculated percentage unless the definition explicitly uses a direct numeric value.

## Traffic lights

- green: achievement is at or above the configured green threshold;
- amber: achievement is between the red and green thresholds;
- red: achievement is below the red threshold;
- not available: the actual or comparable target is missing, or the target is zero.

Indicators where lower values are better use the explicit `lower_is_better` definition flag. Overachievement may exceed 100 percent.

## GIS

The protected GIS uses verified KYC coordinates only. Displayed coordinates are rounded and clustered. Invalid or out-of-bound coordinates appear in the validation queue. Geographic exports are restricted to authorized MEL users and create an audit event.

## Exports

CSV and Excel exports use the same filtered reporting dataset as the dashboard. Each export includes the source period, timestamp, filter summary, stable column names, and trusted-data rule. Excel workbooks include a separate metadata sheet.

## Reconciliation pack

Before accepting Phase 4, MEL should reconcile representative indicators from Impact, LT1–LT4, and Outputs 1–4. For each selected indicator record the target, source rows, exclusions, manually calculated actual, system actual, difference, reviewer, and approval date. Dashboard and export totals must agree under identical filters.
