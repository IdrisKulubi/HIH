# MEL Enterprise Financial Baselines

## Manager workflow

1. Apply migration `0040_mel_enterprise_financial_baselines.sql` and deploy the application.
2. Open **MEL → Operations → Imports → Enterprise financial baselines**.
3. Upload `BIRE baseline-Income data.xlsx` with effective date **31 May 2026**.
4. Confirm the batch reports **239 valid records** and no quarantined rows.
5. Review warnings, especially the verified mappings for Petnam (826), Digital Legion (1087), Agriflora (585), and Horizon (827).
6. Select **Activate baselines**. Activation is audited and supersedes only existing active baselines for enterprises in the batch.

## Quarterly monitoring test

- Open an enterprise from the Monitoring workspace; the enterprise name also links to its progressive dashboard.
- Enter three-month revenue and costs in Section C.
- Confirm the form converts the values to monthly equivalents and shows the opening baseline.
- Confirm an explanation becomes required for a loss, profit sign reversal, or revenue/cost change of at least 100% against the baseline or previous approved quarter.
- Submit and confirm REDO/MEL review shows the stored comparison and collector explanation.
- Approve a report, then open the enterprise dashboard to reconcile baseline, monthly-equivalent quarter values, profit variance, and explanation.
- Export monitoring data and confirm the baseline, alert flags, and explanation columns are present.

## Controls

- Only MEL managers and administrators can upload, resolve, or activate baseline batches.
- Exact repeat uploads are blocked by checksum.
- Invalid or duplicated rows stay quarantined and prevent activation.
- Activated values are immutable; corrections are made by a new batch that supersedes prior active rows.
- Historical submissions retain their baseline and comparison snapshots even if a later baseline correction is activated.
